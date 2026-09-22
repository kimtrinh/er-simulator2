import Anthropic from "@anthropic-ai/sdk";
import { AsyncLocalStorage } from "node:async_hooks";
import { timingSafeEqual } from "node:crypto";

/**
 * One entry point for every model call the simulator makes, so the rest of the
 * server doesn't care which provider is behind it.
 *
 * WHOSE KEY: bring-your-own-key. Every request must carry either
 *   - the player's own key (headers x-user-provider + x-user-api-key), used for
 *     that request only and never stored or logged; or
 *   - the site owner's access code (header x-access-code) matching OWNER_ACCESS_CODE,
 *     which unlocks the keys in the server environment.
 * With neither, the request is refused — visitors can never spend the owner's keys.
 *
 * Server-key provider selection (owner only):
 *   AI_PROVIDER=gemini | claude   — explicit choice
 *   otherwise: Claude if ANTHROPIC_API_KEY is set, else Gemini if GEMINI_API_KEY is set.
 *
 * Gemini's free tier (a key from https://aistudio.google.com/apikey with no
 * billing attached) runs the whole simulator at no cost, within Google's rate limits.
 */

export type Provider = "claude" | "gemini";

export interface Creds {
  provider: Provider;
  apiKey: string;
  /** "player" = the visitor's own key; "owner" = the server's key via access code. */
  source: "player" | "owner";
}

/** Thrown when a request has no usable key; the route answers 401 so the client opens Settings. */
export class NeedKeyError extends Error {
  code = "NEED_KEY";
}

const credStore = new AsyncLocalStorage<Creds>();

/** Run fn with these credentials in scope for every generateJSON call it makes. */
export const runWithCreds = <T>(creds: Creds, fn: () => Promise<T>): Promise<T> =>
  credStore.run(creds, fn);

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Work out whose key a request may use, from its headers. */
export const credsFromHeaders = (h: Record<string, string | string[] | undefined>): Creds => {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v || "").trim();
  const userKey = one(h["x-user-api-key"]);
  if (userKey) {
    const p = one(h["x-user-provider"]).toLowerCase();
    return { provider: p === "claude" ? "claude" : "gemini", apiKey: userKey, source: "player" };
  }
  const code = one(h["x-access-code"]);
  const ownerCode = process.env.OWNER_ACCESS_CODE || "";
  if (code && ownerCode && sameSecret(code, ownerCode)) {
    const provider = activeProvider();
    const apiKey = provider === "gemini" ? geminiKey() : claudeKey();
    if (!apiKey) throw new NeedKeyError(`Access code accepted, but the server has no ${provider} key set.`);
    return { provider, apiKey, source: "owner" };
  }
  if (code) throw new NeedKeyError("That access code isn't right. Add your own API key in Settings instead.");
  throw new NeedKeyError("Add your own API key in Settings (a free Gemini key works).");
};

const currentCreds = (): Creds => {
  const c = credStore.getStore();
  if (!c) throw new NeedKeyError("Add your own API key in Settings (a free Gemini key works).");
  return c;
};

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const GEMINI_API = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta";

const claudeKey = () => process.env.ANTHROPIC_API_KEY || process.env.API_KEY || "";
const geminiKey = () => process.env.GEMINI_API_KEY || "";

export const activeProvider = (): Provider => {
  const pref = (process.env.AI_PROVIDER || "").toLowerCase();
  if (pref === "gemini" || pref === "claude") return pref;
  if (claudeKey()) return "claude";
  if (geminiKey()) return "gemini";
  return "claude";
};

/** Public info only — never reveals whether the owner has keys set, just that an access code exists. */
export const engineInfo = () => ({
  mode: "bring-your-own-key",
  ownerAccess: !!process.env.OWNER_ACCESS_CODE,
  models: { gemini: GEMINI_MODEL, claude: CLAUDE_MODEL },
});

export const modelFor = (p: Provider) => (p === "gemini" ? GEMINI_MODEL : CLAUDE_MODEL);

/** Check a key works by listing models — cheap, and doesn't spend generation quota. */
export const testCreds = async (c: Creds): Promise<{ provider: Provider; model: string }> => {
  let res: Response;
  if (c.provider === "gemini") {
    res = await fetch(`${GEMINI_API}/models?pageSize=1000`, { headers: { "x-goog-api-key": c.apiKey } });
    if (res.status === 400 || res.status === 401) throw new NeedKeyError("Google rejected that Gemini key. Check it was copied in full.");
    if (res.status === 403) throw new NeedKeyError("That Gemini key doesn't have access to the Gemini API (403).");
  } else {
    res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": c.apiKey, "anthropic-version": "2023-06-01" },
    });
    if (res.status === 401) throw new NeedKeyError("Anthropic rejected that API key. Check it was copied in full.");
    if (res.status === 403) throw new NeedKeyError("That Anthropic key doesn't have permission (403).");
  }
  if (!res.ok) throw new Error(`${c.provider === "gemini" ? "Gemini" : "Claude"} API returned HTTP ${res.status}.`);
  return { provider: c.provider, model: modelFor(c.provider) };
};

export type Part =
  | { type: "text"; text: string }
  | { type: "file"; mimeType: string; data: string };

export interface JSONRequest {
  system: string;
  parts: Part[];
  /** JSON Schema the response must follow. */
  schema: Record<string, unknown>;
  /** Claude effort level; ignored by Gemini. */
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}

/** Tolerant JSON extraction — strips code fences and surrounding prose. */
function extractJSON(text: string): any {
  if (!text || !text.trim()) throw new Error("The clinical engine returned an empty response.");
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a === -1 || b === -1) throw new Error("The clinical engine did not return JSON.");
    return JSON.parse(t.slice(a, b + 1));
  }
}

async function claudeJSON(req: JSONRequest, apiKey: string): Promise<any> {
  const client = new Anthropic({ apiKey });

  const content: any[] = req.parts.map((p) => {
    if (p.type === "text") return { type: "text", text: p.text };
    if (p.mimeType === "application/pdf") {
      return { type: "document", source: { type: "base64", media_type: "application/pdf", data: p.data } };
    }
    return { type: "image", source: { type: "base64", media_type: p.mimeType, data: p.data } };
  });

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: req.maxTokens || 4000,
    system: req.system,
    messages: [{ role: "user", content }],
    output_config: {
      effort: req.effort || "medium",
      format: { type: "json_schema", schema: req.schema },
    },
  } as any).catch((e: unknown) => {
    if (e instanceof Anthropic.AuthenticationError) {
      throw new NeedKeyError("Anthropic rejected that API key. Check it in Settings.");
    }
    throw e;
  });

  if ((message as any).stop_reason === "refusal") {
    throw new Error("The clinical engine declined this request. Try rephrasing.");
  }
  const textBlock = message.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined;
  return extractJSON(textBlock?.text || "");
}

async function geminiJSON(req: JSONRequest, apiKey: string): Promise<any> {
  const parts = req.parts.map((p) =>
    p.type === "text" ? { text: p.text } : { inline_data: { mime_type: p.mimeType, data: p.data } }
  );

  // JSON mode plus the schema spelled out in the instructions — works on every
  // Gemini model, including ones that reject strict response schemas.
  const system = `${req.system}

Your entire response must be a single JSON object that conforms to this JSON Schema:
${JSON.stringify(req.schema)}`;

  const res = await fetch(`${GEMINI_API}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: Math.max(req.maxTokens || 4000, 8000),
      },
    }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let msg = raw.slice(0, 200);
    try {
      msg = JSON.parse(raw).error?.message || msg;
    } catch {}
    if (res.status === 429) {
      throw new Error("Gemini free-tier limit reached — wait a minute and try again.");
    }
    if (res.status === 400 && /API key not valid/i.test(msg)) {
      throw new NeedKeyError("Google rejected that Gemini key. Check it in Settings.");
    }
    throw new Error(`Gemini API returned ${res.status}. ${msg}`);
  }

  const data: any = await res.json();
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked this request (${data.promptFeedback.blockReason}). Try rephrasing.`);
  }
  const cand = data.candidates?.[0];
  if (cand?.finishReason === "SAFETY") {
    throw new Error("Gemini declined this request for safety reasons. Try rephrasing.");
  }
  const text = (cand?.content?.parts || [])
    .filter((p: any) => !p.thought && p.text)
    .map((p: any) => p.text)
    .join("");
  return extractJSON(text);
}

export const generateJSON = (req: JSONRequest): Promise<any> => {
  const c = currentCreds();
  return c.provider === "gemini" ? geminiJSON(req, c.apiKey) : claudeJSON(req, c.apiKey);
};

import Anthropic from "@anthropic-ai/sdk";

/**
 * One entry point for every model call the simulator makes, so the rest of the
 * server doesn't care which provider is behind it.
 *
 * Provider selection (server environment):
 *   AI_PROVIDER=gemini | claude   — explicit choice
 *   otherwise: Claude if ANTHROPIC_API_KEY is set, else Gemini if GEMINI_API_KEY is set.
 *
 * Gemini's free tier (a key from https://aistudio.google.com/apikey with no
 * billing attached) runs the whole simulator at no cost, within Google's rate limits.
 */

export type Provider = "claude" | "gemini";

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

export const engineInfo = () => {
  const provider = activeProvider();
  return {
    provider,
    model: provider === "gemini" ? GEMINI_MODEL : CLAUDE_MODEL,
    configured: provider === "gemini" ? !!geminiKey() : !!claudeKey(),
  };
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

async function claudeJSON(req: JSONRequest): Promise<any> {
  const apiKey = claudeKey();
  if (!apiKey) throw new Error("No Anthropic API key configured. Set ANTHROPIC_API_KEY (or GEMINI_API_KEY to use Gemini).");
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
  } as any);

  if ((message as any).stop_reason === "refusal") {
    throw new Error("The clinical engine declined this request. Try rephrasing.");
  }
  const textBlock = message.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined;
  return extractJSON(textBlock?.text || "");
}

async function geminiJSON(req: JSONRequest): Promise<any> {
  const apiKey = geminiKey();
  if (!apiKey) throw new Error("No Gemini API key configured. Set GEMINI_API_KEY (free at aistudio.google.com/apikey).");

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

export const generateJSON = (req: JSONRequest): Promise<any> =>
  activeProvider() === "gemini" ? geminiJSON(req) : claudeJSON(req);

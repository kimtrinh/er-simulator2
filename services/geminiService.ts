import { Vitals, SimulationResponse, ExtractedImage, TrainingLevel, DebriefData } from "../types";

/**
 * Thin client for the clinical simulation engine. All AI calls go through the
 * app's own server (which talks to Claude or Gemini), so no API key ever reaches the
 * browser. Voice playback is handled client-side via the Web Speech API
 * (see ChatInterface), so there is no speech endpoint here.
 */

export interface GeminiFileInput {
  mimeType: string;
  data: string;
}

/* ------------------------------------------------------------------ */
/* Bring-your-own-key                                                  */
/* ------------------------------------------------------------------ */
// Each player's key lives only in their own browser (localStorage) and is sent
// with each request; the server uses it for that request and never stores it.
// The site owner can instead enter the owner access code to use the server's key.

export type KeyProvider = "gemini" | "claude";

export interface KeySettings {
  provider: KeyProvider;
  geminiKey: string;
  claudeKey: string;
  accessCode: string;
}

const LS = {
  provider: "medisim_key_provider",
  gemini: "medisim_key_gemini",
  claude: "medisim_key_claude",
  code: "medisim_access_code",
};

const lsGet = (k: string) => {
  try { return localStorage.getItem(k) || ""; } catch { return ""; }
};
const lsSet = (k: string, v: string) => {
  try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {}
};

export const loadKeySettings = (): KeySettings => ({
  provider: lsGet(LS.provider) === "claude" ? "claude" : "gemini",
  geminiKey: lsGet(LS.gemini),
  claudeKey: lsGet(LS.claude),
  accessCode: lsGet(LS.code),
});

export const saveKeySettings = (k: KeySettings) => {
  lsSet(LS.provider, k.provider);
  lsSet(LS.gemini, k.geminiKey.trim());
  lsSet(LS.claude, k.claudeKey.trim());
  lsSet(LS.code, k.accessCode.trim());
};

/** Which credential this browser will use: its own key first, else the owner code. */
export const activeCredential = (k: KeySettings = loadKeySettings()) => {
  const key = (k.provider === "claude" ? k.claudeKey : k.geminiKey).trim();
  if (key) return { kind: "key" as const, provider: k.provider };
  if (k.accessCode.trim()) return { kind: "owner" as const };
  return { kind: "none" as const };
};

const authHeaders = (k: KeySettings = loadKeySettings()): Record<string, string> => {
  const key = (k.provider === "claude" ? k.claudeKey : k.geminiKey).trim();
  if (key) return { "x-user-provider": k.provider, "x-user-api-key": key };
  if (k.accessCode.trim()) return { "x-access-code": k.accessCode.trim() };
  return {};
};

/** Thrown when the server needs a (valid) key — the app opens Settings. */
export class NeedKeyError extends Error {
  needKey = true;
}

const postJSON = async (url: string, body: unknown, settings?: KeySettings) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(settings) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 || data.code === "NEED_KEY") {
    throw new NeedKeyError(data.error || "Add your own API key in Settings.");
  }
  if (!res.ok) throw new Error(data.error || "The clinical engine returned an error.");
  return data;
};

/** Check the key (or access code) in these settings without starting a case. */
export const testKey = async (
  settings: KeySettings
): Promise<{ provider: KeyProvider; model: string; source: "player" | "owner" }> =>
  postJSON("/api/key/test", {}, settings);

export interface CaseInitResponse {
  intro: string;
  vitals: Vitals;
  context: string;
  learningPoints: string[];
  diagnosis: string;
  /** Time-critical actions for this case, surfaced as clickable orders. */
  criticalActions: string[];
  visualCatalog: ExtractedImage[];
}

export const startCaseFromTopic = async (
  topic: string,
  level: TrainingLevel
): Promise<CaseInitResponse> => postJSON("/api/sim/topic", { topic, level });

export const analyzePDFAndStartCase = async (
  files: GeminiFileInput[],
  extractedImages: string[],
  level: TrainingLevel
): Promise<CaseInitResponse> => postJSON("/api/sim/pdf", { files, extractedImages, level });

export const progressSimulation = async (
  context: string,
  history: string[],
  userAction: string,
  visuals: ExtractedImage[],
  cmePoints: string[],
  /** The player's current working differential, in their own words. */
  workingDiagnoses: string[] = [],
  level?: TrainingLevel
): Promise<SimulationResponse> =>
  postJSON("/api/sim/progress", {
    context,
    history,
    userAction,
    visuals,
    cmePoints,
    workingDiagnoses,
    level,
  });

export interface EngineInfo {
  mode: "bring-your-own-key";
  /** True when the site owner has set an access code for the server's own key. */
  ownerAccess: boolean;
  models: { gemini: string; claude: string };
}

export const getEngineInfo = async (): Promise<EngineInfo | null> => {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    return typeof data.engine === "object" ? data.engine : null;
  } catch {
    return null;
  }
};

/** Everything the tutor and the grader see about the case so far. */
export interface CaseRecord {
  context: string;
  diagnosis: string;
  criticalActions: string[];
  learningPoints: string[];
  vitals: string;
  orderLog: string[];
  differential: string[];
  transcript: string[];
  hintsUsed: number;
}

export interface TutorReply {
  hint: string;
  why: string;
  watchFor: string;
}

export const askTutor = async (
  record: CaseRecord,
  hintLevel: number,
  question: string,
  level: TrainingLevel
): Promise<TutorReply> => postJSON("/api/sim/tutor", { record, hintLevel, question, level });

export const gradeCase = async (
  record: CaseRecord,
  preliminary: Partial<DebriefData> | undefined,
  level: TrainingLevel
): Promise<Partial<DebriefData>> => postJSON("/api/sim/grade", { record, preliminary, level });

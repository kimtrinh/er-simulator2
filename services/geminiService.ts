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

const postJSON = async (url: string, body: unknown) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "The clinical engine returned an error.");
  return data;
};

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
  provider: 'claude' | 'gemini';
  model: string;
  configured: boolean;
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

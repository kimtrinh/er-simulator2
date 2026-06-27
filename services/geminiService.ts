import { Vitals, SimulationResponse, ExtractedImage } from "../types";

/**
 * Thin client for the clinical simulation engine. All AI calls go through the
 * app's own server (which talks to Claude), so no API key ever reaches the
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

export const startCaseFromTopic = async (
  topic: string
): Promise<{
  intro: string;
  vitals: Vitals;
  context: string;
  learningPoints: string[];
  diagnosis: string;
  visualCatalog: ExtractedImage[];
}> => postJSON("/api/sim/topic", { topic });

export const analyzePDFAndStartCase = async (
  files: GeminiFileInput[],
  extractedImages: string[]
): Promise<{
  intro: string;
  vitals: Vitals;
  context: string;
  learningPoints: string[];
  diagnosis: string;
  visualCatalog: ExtractedImage[];
}> => postJSON("/api/sim/pdf", { files, extractedImages });

export const progressSimulation = async (
  context: string,
  history: string[],
  userAction: string,
  visuals: ExtractedImage[],
  cmePoints: string[]
): Promise<SimulationResponse> =>
  postJSON("/api/sim/progress", { context, history, userAction, visuals, cmePoints });

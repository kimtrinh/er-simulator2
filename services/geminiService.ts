
import { Vitals, SimulationResponse, ExtractedImage } from "../types";

export interface GeminiFileInput {
  mimeType: string;
  data: string;
}

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const res = await fetch('/api/gemini/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.audioData;
};

export const startCaseFromTopic = async (topic: string): Promise<{
  intro: string;
  vitals: Vitals;
  context: string;
  learningPoints: string[];
  diagnosis: string;
  visualCatalog: ExtractedImage[];
}> => {
  const res = await fetch('/api/gemini/topic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
};

export const analyzePDFAndStartCase = async (files: GeminiFileInput[], extractedImages: string[]): Promise<{
  intro: string;
  vitals: Vitals;
  context: string;
  learningPoints: string[];
  diagnosis: string;
  visualCatalog: ExtractedImage[];
}> => {
  const res = await fetch('/api/gemini/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, extractedImages })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
};

export const progressSimulation = async (
  context: string,
  history: string[],
  userAction: string,
  visuals: ExtractedImage[],
  cmePoints: string[]
): Promise<SimulationResponse> => {
  const res = await fetch('/api/gemini/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, history, userAction, visuals, cmePoints })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
};

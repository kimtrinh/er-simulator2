import { GoogleGenAI, Type, Modality, ThinkingLevel } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  if (!apiKey) {
    console.warn("WARNING: No Gemini API Key found in either GEMINI_API_KEY or API_KEY environment variables.");
  } else {
    const source = process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : "API_KEY";
    console.log(`Gemini API key sourced from ${source} (length: ${apiKey.length})`);
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

const CLINICAL_MODEL_PRO = "gemini-3.5-flash";
const CLINICAL_MODEL_FLASH = "gemini-3.5-flash";
const TTS_MODEL = "gemini-3.1-flash-tts-preview"; // or appropriate model

const DEFAULT_VITALS = {
  hr: 80, bpSystolic: 120, bpDiastolic: 80, rr: 16, o2: 98, temp: 37.0, rhythm: "Sinus Rhythm"
};

function ensureArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

const CASE_INIT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    intro: { type: Type.STRING },
    vitals: {
      type: Type.OBJECT,
      properties: {
        hr: { type: Type.NUMBER },
        bpSystolic: { type: Type.NUMBER },
        bpDiastolic: { type: Type.NUMBER },
        rr: { type: Type.NUMBER },
        o2: { type: Type.NUMBER },
        temp: { type: Type.NUMBER },
        rhythm: { type: Type.STRING }
      },
      required: ["hr", "bpSystolic", "bpDiastolic", "rr", "o2", "temp", "rhythm"]
    },
    context: { type: Type.STRING },
    learningPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    diagnosis: { type: Type.STRING },
    visualCatalog: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING }
        },
        required: ["id", "label"]
      }
    }
  },
  required: ["intro", "vitals", "context", "learningPoints", "diagnosis"]
};

export const startCaseFromTopicCmd = async (topic: string) => {
  const ai = getAI();
  const systemInstruction = `You are a Clinical Simulation Architect. Your goal is to transform a medical topic into a high-fidelity, evidence-based ER simulation. Use Google Search to ensure the clinical presentation, vitals, and management are based on the latest medical guidelines. RULES: 1. NO SPOILERS: Never reveal the diagnosis or learning objectives in the intro. 2. The intro MUST be a bedside scene with character dialogue (Nurse/Patient). 3. Identify 3-5 core learning points for this case. 4. Respond ONLY in JSON.`;
  const prompt = `Create a complex ER simulation case based on the topic: "${topic}". Ensure the case is realistic, challenging, and follows evidence-based practices.`;
  
  const response = await ai.models.generateContent({
    model: CLINICAL_MODEL_PRO,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: CASE_INIT_SCHEMA
    },
  });

  if (!response.text) throw new Error("No response from AI");
  const parsed = JSON.parse(response.text);
  return { ...parsed, vitals: { ...DEFAULT_VITALS, ...parsed.vitals }, visualCatalog: [], learningPoints: ensureArray(parsed.learningPoints) };
};

export const analyzePDFAndStartCaseCmd = async (files: any[], extractedImages: string[]) => {
  const ai = getAI();
  const systemInstruction = `You are a Clinical Simulation Architect. Your goal is to transform medical documents into a high-fidelity ER simulation. RULES: 1. NO SPOILERS: Never reveal the diagnosis or learning objectives in the intro. 2. The intro MUST be a bedside scene. 3. Identify 3-5 core CME learning points from the provided PDF. 4. Respond ONLY in JSON.`;
  const prompt = `Analyze the attached medical records. Create a complex simulation case. Available visual assets: ${extractedImages.length}.`;
  const fileParts = files.map((f: any) => ({ inlineData: { mimeType: f.mimeType, data: f.data } }));
  
  const response = await ai.models.generateContent({
    model: CLINICAL_MODEL_PRO,
    contents: { parts: [...fileParts, { text: prompt }] },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: CASE_INIT_SCHEMA
    },
  });

  if (!response.text) throw new Error("No response from AI");
  const parsed = JSON.parse(response.text);
  const finalVisuals = (parsed.visualCatalog || []).map((item: any) => ({ ...item, data: extractedImages[parseInt(item.id)] || "" })).filter((v: any) => v.data !== "");
  return { ...parsed, vitals: { ...DEFAULT_VITALS, ...parsed.vitals }, visualCatalog: finalVisuals, learningPoints: ensureArray(parsed.learningPoints) };
};

const SIM_PROGRESS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING },
    updatedVitals: {
      type: Type.OBJECT,
      properties: {
        hr: { type: Type.NUMBER },
        bpSystolic: { type: Type.NUMBER },
        bpDiastolic: { type: Type.NUMBER },
        rr: { type: Type.NUMBER },
        o2: { type: Type.NUMBER },
        temp: { type: Type.NUMBER },
        rhythm: { type: Type.STRING }
      }
    },
    vitalTrend: { type: Type.STRING, enum: ["stable", "improving", "worsening", "critical"] },
    labResults: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.STRING },
          unit: { type: Type.STRING },
          flag: { type: Type.STRING }
        }
      }
    },
    diagnosticReports: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          body: { type: Type.STRING }
        }
      }
    },
    physicalExam: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          system: { type: Type.STRING },
          finding: { type: Type.STRING }
        }
      }
    },
    isCaseOver: { type: Type.BOOLEAN },
    clinicalRationale: { type: Type.STRING },
    imageIdToDisplay: { type: Type.STRING },
    debriefData: {
      type: Type.OBJECT,
      properties: {
        outcome: { type: Type.STRING },
        score: { type: Type.NUMBER },
        summary: { type: Type.STRING },
        performanceBreakdown: {
          type: Type.OBJECT,
          properties: {
            historyDataCollection: { type: Type.NUMBER },
            differentialDiagnosis: { type: Type.NUMBER },
            medicalManagement: { type: Type.NUMBER },
            communicationEfficiency: { type: Type.NUMBER }
          }
        },
        criticalEvents: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              event: { type: Type.STRING },
              userAction: { type: Type.STRING },
              optimalAction: { type: Type.STRING },
              feedback: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["positive", "negative", "neutral"] }
            }
          }
        },
        missedOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  },
  required: ["narrative", "vitalTrend", "isCaseOver"]
};

export const progressSimulationCmd = async (context: string, history: string[], userAction: string, visuals: any[], cmePoints: string[]) => {
  const ai = getAI();
  const systemInstruction = `You are the Bedside Simulation Engine. STRICT CHARTING RULES: 1. PHYSICAL EXAM: Always return an ARRAY of objects { "system": string, "finding": string }. 2. RADIOLOGY/IMAGING: Return a detailed technical report in 'diagnosticReports' array. 3. LABS: Always return an ARRAY of structured values in 'labResults' { "name": "Sodium", "value": 140, "unit": "mEq/L", "flag": "H/L" }. 4. DEBRIEF: If isCaseOver is true, provide a detailed EVALUATION based on these points: ${cmePoints.join(', ')}. 5. BE CONCISE. 6. Respond only in JSON.`;
  const visualInventory = (visuals || []).map(v => `ID ${v.id}: ${v.label}`).join(", ");
  const prompt = `CLINICAL TRUTH: ${context}\nHISTORY: ${history.slice(-10).join("\n")}\nUSER ACTION: ${userAction}\nVISUALS: ${visualInventory}\n\nProvide the clinicalRationale for your response. Explain WHY the vitals or findings changed based on medical physiology. Ensure updatedVitals has hr, bpSystolic, bpDiastolic, rr, o2, temp, rhythm.`;
  
  const response = await ai.models.generateContent({
    model: CLINICAL_MODEL_FLASH,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: SIM_PROGRESS_SCHEMA
    },
  });

  if (!response.text) throw new Error("No response from AI");
  const parsed = JSON.parse(response.text);
  return {
    ...parsed,
    updatedVitals: parsed.updatedVitals ? { ...DEFAULT_VITALS, ...parsed.updatedVitals } : DEFAULT_VITALS,
    physicalExam: ensureArray(parsed.physicalExam),
    diagnosticReports: ensureArray(parsed.diagnosticReports),
    labResults: ensureArray(parsed.labResults),
    isCaseOver: !!parsed.isCaseOver
  };
};

export const generateSpeechCmd = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text: `Read this clinical update clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

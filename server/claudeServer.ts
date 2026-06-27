import Anthropic from "@anthropic-ai/sdk";

/**
 * Clinical simulation engine powered by Claude (Anthropic API).
 * The API key stays server-side; the browser only talks to this server.
 */

const MODEL = "claude-opus-4-8";

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.API_KEY || "";
  if (!apiKey) {
    console.warn(
      "WARNING: No Anthropic API key found. Set ANTHROPIC_API_KEY in your environment."
    );
  }
  return new Anthropic({ apiKey });
};

const DEFAULT_VITALS = {
  hr: 80,
  bpSystolic: 120,
  bpDiastolic: 80,
  rr: 16,
  o2: 98,
  temp: 37.0,
  rhythm: "Sinus Rhythm",
};

function ensureArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

/** Pull the JSON object out of a Claude response constrained by output_config.format. */
function parseJSON(message: Anthropic.Message): any {
  const textBlock = message.content.find((b) => b.type === "text") as
    | Anthropic.TextBlock
    | undefined;
  if (!textBlock || !textBlock.text) {
    throw new Error("No response from the clinical engine.");
  }
  return JSON.parse(textBlock.text);
}

const VITALS_SCHEMA = {
  type: "object",
  properties: {
    hr: { type: "number" },
    bpSystolic: { type: "number" },
    bpDiastolic: { type: "number" },
    rr: { type: "number" },
    o2: { type: "number" },
    temp: { type: "number" },
    rhythm: { type: "string" },
  },
  required: ["hr", "bpSystolic", "bpDiastolic", "rr", "o2", "temp", "rhythm"],
  additionalProperties: false,
};

const CASE_INIT_SCHEMA = {
  type: "object",
  properties: {
    intro: { type: "string" },
    vitals: VITALS_SCHEMA,
    context: { type: "string" },
    learningPoints: { type: "array", items: { type: "string" } },
    diagnosis: { type: "string" },
    visualCatalog: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
        },
        required: ["id", "label"],
        additionalProperties: false,
      },
    },
  },
  required: ["intro", "vitals", "context", "learningPoints", "diagnosis", "visualCatalog"],
  additionalProperties: false,
};

const CASE_SYSTEM = `You are a Clinical Simulation Architect. Transform a medical topic or a set of clinical records into a high-fidelity, evidence-based emergency-room simulation case.

RULES:
1. NO SPOILERS: never reveal the diagnosis or the learning objectives inside the "intro".
2. The "intro" MUST be a vivid bedside scene with character dialogue (e.g. triage nurse handoff, the patient speaking).
3. "context" is the hidden clinical truth (true diagnosis, pathophysiology, expected course, key exam/lab/imaging findings) used by the engine — the player never sees it.
4. Identify 3-5 concrete learning points for the case.
5. "diagnosis" is the single hidden correct diagnosis.
6. Base presentation, vitals, and management on current evidence-based practice.
7. Respond ONLY with the JSON object defined by the schema.`;

export const startCaseFromTopicCmd = async (topic: string) => {
  const client = getClient();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: CASE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Create a complex, realistic, challenging ER simulation case based on the topic: "${topic}". Leave visualCatalog as an empty array (no documents were uploaded).`,
      },
    ],
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: CASE_INIT_SCHEMA },
    },
  } as any);

  const parsed = parseJSON(message);
  return {
    ...parsed,
    vitals: { ...DEFAULT_VITALS, ...parsed.vitals },
    visualCatalog: [],
    learningPoints: ensureArray(parsed.learningPoints),
  };
};

export const analyzePDFAndStartCaseCmd = async (
  files: { mimeType: string; data: string }[],
  extractedImages: string[]
) => {
  const client = getClient();

  const fileBlocks: any[] = (files || [])
    .map((f) => {
      if (f.mimeType === "application/pdf") {
        return {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: f.data },
        };
      }
      if (f.mimeType && f.mimeType.startsWith("image/")) {
        return {
          type: "image",
          source: { type: "base64", media_type: f.mimeType, data: f.data },
        };
      }
      return null;
    })
    .filter(Boolean);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: CASE_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ...fileBlocks,
          {
            type: "text",
            text: `Analyze the attached clinical records and build a complex ER simulation case from them.
There are ${extractedImages.length} visual assets available, indexed 0..${Math.max(
              0,
              extractedImages.length - 1
            )}. For any asset relevant to the case (EKG, chest X-ray, CT, etc.) add an entry to "visualCatalog" where "id" is the string index (e.g. "0") and "label" is a short name (e.g. "12-Lead EKG"). If no assets are relevant, return an empty visualCatalog array.`,
          },
        ],
      },
    ],
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: CASE_INIT_SCHEMA },
    },
  } as any);

  const parsed = parseJSON(message);
  const finalVisuals = (parsed.visualCatalog || [])
    .map((item: any) => ({ ...item, data: extractedImages[parseInt(item.id)] || "" }))
    .filter((v: any) => v.data !== "");

  return {
    ...parsed,
    vitals: { ...DEFAULT_VITALS, ...parsed.vitals },
    visualCatalog: finalVisuals,
    learningPoints: ensureArray(parsed.learningPoints),
  };
};

const SIM_PROGRESS_SCHEMA = {
  type: "object",
  properties: {
    narrative: { type: "string" },
    updatedVitals: VITALS_SCHEMA,
    vitalTrend: {
      type: "string",
      enum: ["stable", "improving", "worsening", "critical"],
    },
    labResults: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: { type: "string" },
          unit: { type: "string" },
          flag: { type: "string", enum: ["H", "L", "CRITICAL", ""] },
        },
        required: ["name", "value", "unit"],
        additionalProperties: false,
      },
    },
    diagnosticReports: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
        },
        required: ["title", "body"],
        additionalProperties: false,
      },
    },
    physicalExam: {
      type: "array",
      items: {
        type: "object",
        properties: {
          system: { type: "string" },
          finding: { type: "string" },
        },
        required: ["system", "finding"],
        additionalProperties: false,
      },
    },
    isCaseOver: { type: "boolean" },
    clinicalRationale: { type: "string" },
    imageIdToDisplay: { type: "string" },
    debriefData: {
      type: "object",
      properties: {
        outcome: { type: "string" },
        score: { type: "number" },
        summary: { type: "string" },
        performanceBreakdown: {
          type: "object",
          properties: {
            historyDataCollection: { type: "number" },
            differentialDiagnosis: { type: "number" },
            medicalManagement: { type: "number" },
            communicationEfficiency: { type: "number" },
          },
          required: [
            "historyDataCollection",
            "differentialDiagnosis",
            "medicalManagement",
            "communicationEfficiency",
          ],
          additionalProperties: false,
        },
        criticalEvents: {
          type: "array",
          items: {
            type: "object",
            properties: {
              event: { type: "string" },
              userAction: { type: "string" },
              optimalAction: { type: "string" },
              feedback: { type: "string" },
              type: { type: "string", enum: ["positive", "negative", "neutral"] },
            },
            required: ["event", "userAction", "optimalAction", "feedback", "type"],
            additionalProperties: false,
          },
        },
        missedOpportunities: { type: "array", items: { type: "string" } },
      },
      required: [
        "outcome",
        "score",
        "summary",
        "performanceBreakdown",
        "criticalEvents",
        "missedOpportunities",
      ],
      additionalProperties: false,
    },
  },
  required: ["narrative", "updatedVitals", "vitalTrend", "isCaseOver"],
  additionalProperties: false,
};

export const progressSimulationCmd = async (
  context: string,
  history: string[],
  userAction: string,
  visuals: { id: string; label: string }[],
  cmePoints: string[]
) => {
  const client = getClient();

  const system = `You are the Bedside Simulation Engine for a high-fidelity ER trainer. The player is the treating physician; you control the patient, nurse, environment, and all clinical data.

STRICT RULES:
1. PHYSICAL EXAM: when the player examines the patient, return findings as a "physicalExam" array of { "system", "finding" }.
2. RADIOLOGY/IMAGING: return a detailed technical report in the "diagnosticReports" array { "title", "body" }.
3. LABS: return structured values in "labResults" { "name", "value", "unit", "flag" } where flag is "H", "L", "CRITICAL", or "".
4. Update "updatedVitals" (all of hr, bpSystolic, bpDiastolic, rr, o2, temp, rhythm) and "vitalTrend" based on physiology and the player's actions.
5. "clinicalRationale" explains WHY vitals/findings changed, grounded in pathophysiology.
6. Only return labs/imaging/exam findings the player actually ordered or performed this turn. Do not volunteer the diagnosis.
7. Set "isCaseOver" to true when the encounter reaches a natural end (stabilized/admitted, transferred, or death). When true, populate "debriefData" with a fair evaluation against these learning points: ${cmePoints.join(
    "; "
  )}.
8. If the player requests a visual that exists, set "imageIdToDisplay" to its id.
9. Be concise and clinically realistic. Respond ONLY with the JSON object defined by the schema.`;

  const visualInventory = (visuals || [])
    .map((v) => `id ${v.id}: ${v.label}`)
    .join(", ");

  const prompt = `HIDDEN CLINICAL TRUTH (never reveal directly): ${context}

RECENT TRANSCRIPT:
${history.slice(-10).join("\n")}

AVAILABLE VISUALS: ${visualInventory || "none"}

PLAYER ACTION: ${userAction}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: SIM_PROGRESS_SCHEMA },
    },
  } as any);

  const parsed = parseJSON(message);
  return {
    ...parsed,
    updatedVitals: parsed.updatedVitals
      ? { ...DEFAULT_VITALS, ...parsed.updatedVitals }
      : DEFAULT_VITALS,
    physicalExam: ensureArray(parsed.physicalExam),
    diagnosticReports: ensureArray(parsed.diagnosticReports),
    labResults: ensureArray(parsed.labResults),
    isCaseOver: !!parsed.isCaseOver,
  };
};

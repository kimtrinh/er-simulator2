import { getLevel, TrainingLevel } from "../data/trainingLevels";
import { generateJSON, Part } from "./llm";

/**
 * Clinical simulation engine. Runs on Claude or Gemini (see server/llm.ts);
 * API keys stay server-side and the browser only talks to this server.
 */

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
    criticalActions: { type: "array", items: { type: "string" } },
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
  required: [
    "intro",
    "vitals",
    "context",
    "learningPoints",
    "diagnosis",
    "criticalActions",
    "visualCatalog",
  ],
  additionalProperties: false,
};

const caseSystem = (level: TrainingLevel) => {
  const spec = getLevel(level);
  return `You are a Clinical Simulation Architect. Transform a medical topic or a set of clinical records into a high-fidelity, evidence-based emergency-room simulation case.

TRAINING LEVEL — ${spec.label.toUpperCase()}: ${spec.casePrompt}

RULES:
1. NO SPOILERS: never reveal the diagnosis or the learning objectives inside the "intro".
2. The "intro" MUST be a vivid bedside scene with character dialogue (e.g. triage nurse handoff, the patient speaking).
3. "context" is the hidden clinical truth (true diagnosis, pathophysiology, expected course, key exam/lab/imaging findings) used by the engine — the player never sees it.
4. Identify 3-5 concrete learning points for the case.
5. "diagnosis" is the single hidden correct diagnosis.
6. "criticalActions" lists 4-8 time-critical interventions this specific patient needs, as short
   imperative order names a physician would click at the bedside (e.g. "Apply pelvic binder",
   "Arterial tourniquet", "Activate massive transfusion protocol", "Needle decompression",
   "Activate cath lab"). Name the intervention only — never the diagnosis, and no explanation.
7. Base presentation, vitals, and management on current evidence-based practice.
8. Pitch the difficulty, the amount of missing data, and the subtlety of the findings at the training level above.
9. Respond ONLY with the JSON object defined by the schema.`;
};

export const startCaseFromTopicCmd = async (
  topic: string,
  level: TrainingLevel = "resident"
) => {
  const parsed = await generateJSON({
    system: caseSystem(level),
    parts: [
      {
        type: "text",
        text: `Create a complex, realistic, challenging ER simulation case based on the topic: "${topic}". Leave visualCatalog as an empty array (no documents were uploaded).`,
      },
    ],
    schema: CASE_INIT_SCHEMA,
    effort: "medium",
  });
  return {
    ...parsed,
    vitals: { ...DEFAULT_VITALS, ...parsed.vitals },
    visualCatalog: [],
    learningPoints: ensureArray(parsed.learningPoints),
    criticalActions: ensureArray(parsed.criticalActions),
  };
};

export const analyzePDFAndStartCaseCmd = async (
  files: { mimeType: string; data: string }[],
  extractedImages: string[],
  level: TrainingLevel = "resident"
) => {
  const fileParts: Part[] = (files || [])
    .filter(
      (f) => f.mimeType === "application/pdf" || (f.mimeType && f.mimeType.startsWith("image/"))
    )
    .map((f) => ({ type: "file", mimeType: f.mimeType, data: f.data }));

  const parsed = await generateJSON({
    system: caseSystem(level),
    parts: [
      ...fileParts,
      {
            type: "text",
            text: `Analyze the attached clinical records and build a complex ER simulation case from them.
There are ${extractedImages.length} visual assets available, indexed 0..${Math.max(
              0,
              extractedImages.length - 1
            )}. For any asset relevant to the case (EKG, chest X-ray, CT, etc.) add an entry to "visualCatalog" where "id" is the string index (e.g. "0") and "label" is a short name (e.g. "12-Lead EKG"). If no assets are relevant, return an empty visualCatalog array.`,
      },
    ],
    schema: CASE_INIT_SCHEMA,
    effort: "medium",
  });
  const finalVisuals = (parsed.visualCatalog || [])
    .map((item: any) => ({ ...item, data: extractedImages[parseInt(item.id)] || "" }))
    .filter((v: any) => v.data !== "");

  return {
    ...parsed,
    vitals: { ...DEFAULT_VITALS, ...parsed.vitals },
    visualCatalog: finalVisuals,
    learningPoints: ensureArray(parsed.learningPoints),
    criticalActions: ensureArray(parsed.criticalActions),
  };
};

const ORDER_CATEGORIES = [
  "critical", "medication", "lab", "imaging", "procedure",
  "exam", "history", "consult", "disposition", "other",
];

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
    interpretedOrders: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          category: { type: "string", enum: ORDER_CATEGORIES },
          critical: { type: "boolean" },
        },
        required: ["label", "category", "critical"],
        additionalProperties: false,
      },
    },
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
        diagnosisReview: { type: "string" },
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
  cmePoints: string[],
  workingDiagnoses: string[] = [],
  level: TrainingLevel = "resident"
) => {
  const spec = getLevel(level);

  const system = `You are the Bedside Simulation Engine for a high-fidelity ER trainer. The player is the treating physician; you control the patient, nurse, environment, and all clinical data.

TRAINING LEVEL — ${spec.label.toUpperCase()}. Bedside behaviour: ${spec.enginePrompt}
Debrief marking: ${spec.debriefPrompt}

STRICT RULES:
1. PHYSICAL EXAM: when the player examines the patient, return findings as a "physicalExam" array of { "system", "finding" }.
2. RADIOLOGY/IMAGING: return a detailed technical report in the "diagnosticReports" array { "title", "body" }.
3. LABS: return structured values in "labResults" { "name", "value", "unit", "flag" } where flag is "H", "L", "CRITICAL", or "".
4. Update "updatedVitals" (all of hr, bpSystolic, bpDiastolic, rr, o2, temp, rhythm) and "vitalTrend" based on physiology and the player's actions.
5. "clinicalRationale" explains WHY vitals/findings changed, grounded in pathophysiology.
6. Only return labs/imaging/exam findings the player actually ordered or performed this turn. Do not volunteer the diagnosis.
7. DIFFERENTIAL: the player may carry several working diagnoses at once and may document or revise
   that differential mid-case. Treat it as their charted reasoning — the team responds to it, but
   never confirm or deny it outright, and never let a wrong entry on it change the underlying truth.
8. ORDER SETS: the player may send several orders in one action. Carry out every one of them and
   report the result of each.
9. Hold the bedside behaviour for the training level above in every turn. Set "isCaseOver" to true when the encounter reaches a natural end (stabilized/admitted, transferred, or death). When true, populate "debriefData" with a fair evaluation against these learning points: ${cmePoints.join(
    "; "
  )}. Score "differentialDiagnosis" on the breadth, ranking, and timing of the differential the
   player documented — a broad differential that named the true diagnosis early scores well; a
   narrow or anchored one scores poorly. Put that reasoning in "diagnosisReview", naming which of
   their diagnoses were right, which were reasonable to carry, and what was missed.
10. If the player requests a visual that exists, set "imageIdToDisplay" to its id.
11. FREE-TEXT ORDERS: the player's action is often typed or voice-dictated — informal, abbreviated,
   or slightly misheard. Work out the real clinical orders a physician would mean, whether or not
   they appear on any menu, and carry them out. List each in "interpretedOrders" under a concise
   standard order name (e.g. "Ceftriaxone 2 g IV", "CT head without contrast"); "critical" is true
   for time-critical resuscitative interventions. If an order is clinically meaningless or
   dangerously incomplete (e.g. a high-risk drug with no dose), leave it out and have the nurse ask
   for clarification in the narrative instead of guessing.
12. Be concise and clinically realistic. Respond ONLY with the JSON object defined by the schema.`;

  const visualInventory = (visuals || [])
    .map((v) => `id ${v.id}: ${v.label}`)
    .join(", ");

  const differential = (workingDiagnoses || []).filter(Boolean);

  const prompt = `HIDDEN CLINICAL TRUTH (never reveal directly): ${context}

RECENT TRANSCRIPT:
${history.slice(-10).join("\n")}

AVAILABLE VISUALS: ${visualInventory || "none"}

PLAYER'S DOCUMENTED DIFFERENTIAL: ${
    differential.length ? differential.join("; ") : "none documented yet"
  }

PLAYER ACTION: ${userAction}`;

  const parsed = await generateJSON({
    system,
    parts: [{ type: "text", text: prompt }],
    schema: SIM_PROGRESS_SCHEMA,
    effort: "low",
  });
  return {
    ...parsed,
    updatedVitals: parsed.updatedVitals
      ? { ...DEFAULT_VITALS, ...parsed.updatedVitals }
      : DEFAULT_VITALS,
    physicalExam: ensureArray(parsed.physicalExam),
    diagnosticReports: ensureArray(parsed.diagnosticReports),
    labResults: ensureArray(parsed.labResults),
    // Left undefined when the model omits it, so the client can fall back to local matching.
    interpretedOrders: Array.isArray(parsed.interpretedOrders)
      ? parsed.interpretedOrders.filter((o: any) => o && o.label)
      : undefined,
    isCaseOver: !!parsed.isCaseOver,
  };
};

/* ------------------------------------------------------------------ */
/* Tutor + full-case grading                                          */
/* ------------------------------------------------------------------ */

/** Everything the tutor and the grader need to know about the case so far. */
export interface CaseRecord {
  context: string;
  diagnosis: string;
  criticalActions: string[];
  learningPoints: string[];
  /** e.g. "HR 120, BP 90/60, RR 24, SpO2 92%, T 38.5, Sinus Tachycardia (worsening)" */
  vitals: string;
  /** Oldest first, e.g. "14:02  Ceftriaxone 2 g IV [medication, critical]". */
  orderLog: string[];
  differential: string[];
  /** Transcript lines, "DOCTOR: ..." / "SIM: ...". Tutor exchanges excluded. */
  transcript: string[];
  hintsUsed: number;
}

const recordText = (r: CaseRecord, transcriptLines?: number) => `TRUE DIAGNOSIS: ${r.diagnosis}
HIDDEN CONTEXT: ${r.context}
EXPECTED CRITICAL ACTIONS: ${(r.criticalActions || []).join("; ") || "not specified"}
LEARNING POINTS: ${(r.learningPoints || []).join("; ")}
CURRENT VITALS: ${r.vitals}
ORDER LOG (oldest first):
${(r.orderLog || []).join("\n") || "no orders placed"}
DOCUMENTED DIFFERENTIAL: ${(r.differential || []).join("; ") || "none documented"}
HINTS USED FROM THE TUTOR: ${r.hintsUsed || 0}
TRANSCRIPT:
${(transcriptLines ? (r.transcript || []).slice(-transcriptLines) : r.transcript || []).join("\n")}`;

const TUTOR_SCHEMA = {
  type: "object",
  properties: {
    hint: { type: "string" },
    why: { type: "string" },
    watchFor: { type: "string" },
  },
  required: ["hint", "why", "watchFor"],
  additionalProperties: false,
};

/**
 * A private attending the player can ask when stuck. Hint level 1 is a
 * Socratic nudge, 2 names the area to focus on, 3 gives the explicit next step.
 */
export const tutorCmd = async (
  record: CaseRecord,
  hintLevel: number,
  question: string = "",
  level: TrainingLevel = "resident"
) => {
  const spec = getLevel(level);
  const lvl = Math.max(1, Math.min(3, Math.round(hintLevel || 1)));
  const system = `You are an emergency-medicine attending quietly coaching a ${spec.label.toLowerCase()} through a live simulated resuscitation. You can see the hidden case truth; the player cannot.
- "hint": 1-3 sentences on what to do or think about next, pitched by HINT LEVEL: 1 = a Socratic nudge toward what they are overlooking (a question, no answer); 2 = name the domain or finding to focus on and why; 3 = the specific next action(s), with doses where relevant.
- "why": one or two sentences of teaching — the physiology or guideline behind it.
- "watchFor": one short line on a danger or trap coming up in this case, or "" if none.
- If the player asks a direct question, answer it as a teacher would at their level.
- Never state the hidden diagnosis outright, even at level 3; you may name the finding or test that would reveal it. If they are already on the right track, say so briefly and tell them what comes next.
Respond ONLY with the JSON object defined by the schema.`;

  const q = (question || "").trim();
  return generateJSON({
    system,
    parts: [
      {
        type: "text",
        text: `${recordText(record, 12)}
HINT LEVEL: ${lvl}
${q ? `PLAYER QUESTION: ${q}` : 'The player pressed "Hint" — they are not sure what to do next.'}`,
      },
    ],
    schema: TUTOR_SCHEMA,
    effort: "low",
    maxTokens: 1500,
  });
};

const GRADE_SCHEMA = {
  type: "object",
  properties: {
    outcome: { type: "string" },
    score: { type: "number" },
    summary: { type: "string" },
    performanceBreakdown: (SIM_PROGRESS_SCHEMA.properties.debriefData as any).properties.performanceBreakdown,
    criticalEvents: (SIM_PROGRESS_SCHEMA.properties.debriefData as any).properties.criticalEvents,
    missedOpportunities: { type: "array", items: { type: "string" } },
    diagnosisReview: { type: "string" },
    actionReview: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          status: { type: "string", enum: ["done", "late", "missed", "unnecessary", "harmful"] },
          feedback: { type: "string" },
        },
        required: ["action", "status", "feedback"],
        additionalProperties: false,
      },
    },
    nextTime: { type: "array", items: { type: "string" } },
  },
  required: [
    "outcome", "score", "summary", "performanceBreakdown", "criticalEvents",
    "missedOpportunities", "diagnosisReview", "actionReview", "nextTime",
  ],
  additionalProperties: false,
};

/**
 * A dedicated review of the whole case once it ends — every order with its
 * timing, the differential, and the hints used — instead of grading inside a
 * single bedside turn.
 */
export const gradeCmd = async (
  record: CaseRecord,
  preliminary: unknown,
  level: TrainingLevel = "resident"
) => {
  const spec = getLevel(level);
  const system = `You are an emergency-medicine attending grading a completed simulated case for a ${spec.label.toLowerCase()}. ${spec.debriefPrompt}
Rules:
1. "actionReview" covers every expected critical action (done, late, or missed — judge timing from the order log) plus any order that was unnecessary or harmful. "feedback" says specifically what was right or wrong and what the correct move was, with doses where relevant.
2. "diagnosisReview" judges the differential: breadth, ranking, whether they anchored or closed prematurely, and what should have prompted the right diagnosis.
3. "score" and each "performanceBreakdown" value are 0-100, marked to the training level; deduct modestly for tutor hints used.
4. "criticalEvents" are the key moments, with what the player did ("userAction") and what was optimal ("optimalAction").
5. "nextTime" is 2-4 concrete habits to change.
6. Be specific to what this player actually did — quote their orders.
Respond ONLY with the JSON object defined by the schema.`;

  const g = await generateJSON({
    system,
    parts: [
      {
        type: "text",
        text: `${recordText(record)}
ENGINE'S PRELIMINARY DEBRIEF: ${JSON.stringify(preliminary || {})}`,
      },
    ],
    schema: GRADE_SCHEMA,
    effort: "medium",
    maxTokens: 6000,
  });
  return {
    ...g,
    criticalEvents: ensureArray(g.criticalEvents),
    missedOpportunities: ensureArray(g.missedOpportunities),
    actionReview: ensureArray(g.actionReview),
    nextTime: ensureArray(g.nextTime),
  };
};

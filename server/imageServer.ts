/**
 * Patient imagery engine powered by Google Gemini's image models.
 *
 * Claude writes the case and, with it, a structured description of what the
 * patient actually looks like on arrival (age, sex, build, position, the
 * pathology you can see from the doorway, the lines and devices already on
 * them). This module turns that brief into a bedside photograph so the case
 * shows the patient it describes — a bleeding 37-year-old trauma patient looks
 * like a bleeding 37-year-old, not a stock elderly portrait.
 *
 * The Gemini key stays server-side, exactly like the Anthropic key.
 */

export interface PatientVisualBrief {
  /** Apparent age in years — drives the whole render, so it is never optional. */
  ageYears: number;
  /** "male" | "female" — the patient's sex as presented in the case. */
  sex: string;
  /** Body habitus, e.g. "thin and cachectic", "muscular", "obese". */
  build?: string;
  /** How they are lying/sitting, e.g. "supine on the trauma stretcher, C-collar in place". */
  position?: string;
  /** The visible pathology. THE point of the image — e.g. "open mid-shaft tibia fracture, bright red blood soaking the sheet". */
  visibleFindings?: string[];
  /** Lines, tubes and monitoring already attached, e.g. "non-rebreather mask", "left IJ central line". */
  devices?: string[];
  /** Level of distress, e.g. "obtunded", "agitated and diaphoretic", "comfortable". */
  distress?: string;
  /** Where the encounter is happening, e.g. "trauma bay", "resus bay 2", "triage chair". */
  setting?: string;
  /** Free-text extras Claude wants preserved verbatim. */
  notes?: string;
}

export interface PatientImageResult {
  dataUrl: string;
  model: string;
  /** True when the photographic render was refused and the illustrated style was used instead. */
  usedFallbackStyle: boolean;
}

/** Override with GEMINI_API_BASE to route through a proxy or a compatible gateway. */
const apiRoot = () =>
  (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta").replace(
    /\/+$/,
    ""
  ) + "/models";

/**
 * Tried in order; the first model that answers is remembered for the process.
 * Override with GEMINI_IMAGE_MODEL to pin one explicitly.
 */
const DEFAULT_MODEL_CHAIN = [
  "gemini-3.1-flash-image-preview",
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
];

const REQUEST_TIMEOUT_MS = 90_000;

let resolvedModel: string | null = null;

export const getImageApiKey = (): string =>
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

export const isImageGenerationEnabled = (): boolean => !!getImageApiKey();

const modelChain = (): string[] => {
  const pinned = (process.env.GEMINI_IMAGE_MODEL || "").trim();
  if (pinned) return [pinned];
  if (resolvedModel) return [resolvedModel];
  return DEFAULT_MODEL_CHAIN;
};

const list = (items: string[] | undefined): string =>
  (items || []).map((s) => String(s).trim()).filter(Boolean).join("; ");

/**
 * Build the render prompt. Demographics are stated twice on purpose: image
 * models drift toward a generic older patient unless the age and sex are
 * pinned down hard, which is exactly the failure this feature exists to fix.
 */
export const buildPatientPrompt = (
  brief: PatientVisualBrief,
  style: "photographic" | "illustrated"
): string => {
  const age = Number.isFinite(brief.ageYears) ? Math.round(brief.ageYears) : 45;
  const sex = (brief.sex || "adult").trim();
  const findings = list(brief.visibleFindings);
  const devices = list(brief.devices);

  const medium =
    style === "photographic"
      ? "A clinical documentation photograph used in emergency-medicine simulation training. Realistic photography, natural hospital lighting, shot from the foot of the bed at a slight angle, shallow depth of field, colour-accurate skin tones."
      : "A detailed medical training illustration in the style of an emergency-medicine textbook plate. Clean, instructive, anatomically accurate rendering rather than a photograph.";

  const subject = [
    "SUBJECT - a fictional simulated patient (a training scenario, not a real identifiable person):",
    `- Apparent age: exactly ${age} years old. The face and body must read as ${age}, not older and not younger.`,
    `- Sex: ${sex}.`,
    brief.build && `- Build: ${brief.build}.`,
    brief.distress && `- Level of distress: ${brief.distress}.`,
    `- Position: ${brief.position || "supine on an emergency-department stretcher"}.`,
    `- Setting: ${brief.setting || "an emergency department resuscitation bay"}.`,
  ].filter(Boolean).join("\n");

  const clinical = [
    "VISIBLE CLINICAL FINDINGS - these are the point of the image and must all be clearly shown:",
    findings
      ? `${findings}.`
      : "an acutely ill patient with visible physiologic distress appropriate to the scenario.",
    devices && `\nEQUIPMENT ALREADY ON THE PATIENT: ${devices}.`,
    brief.notes && `\nADDITIONAL DETAIL: ${brief.notes}`,
  ].filter(Boolean).join("\n");

  const requirements = [
    "REQUIREMENTS:",
    "- Show ONE patient only, framed so every finding listed above is visible.",
    "- The findings must match the description exactly; do not substitute a generic sick patient.",
    "- Clinically plausible: correct anatomy, correct laterality, realistic wound and skin appearance for the stated pathology.",
    "- Educational and non-gratuitous - the tone of a medical textbook or moulage training photograph.",
    "- No text, captions, watermarks, logos, arrows or labels anywhere in the image.",
    "- No recognisable real person, and no readable documents, name bands or identifiers.",
    "- Landscape framing.",
  ].join("\n");

  return [medium, subject, clinical, requirements].join("\n\n");
};

interface GeminiCallOutcome {
  dataUrl?: string;
  /** Set when the model answered but declined to produce an image. */
  refused?: boolean;
  /** Set when the model itself is unavailable (404 / not enabled for the key). */
  unavailable?: boolean;
  errorMessage?: string;
}

const callGemini = async (
  model: string,
  prompt: string,
  apiKey: string
): Promise<GeminiCallOutcome> => {
  const imageConfig: Record<string, string> = { aspectRatio: "4:3" };
  // imageSize is only understood by the Gemini 3 image family.
  if (model.startsWith("gemini-3")) imageConfig.imageSize = "1K";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${apiRoot()}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig,
        },
      }),
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === "AbortError") {
      return { errorMessage: `Image model ${model} timed out.` };
    }
    return { errorMessage: e?.message || `Could not reach image model ${model}.` };
  }
  clearTimeout(timer);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 404 || res.status === 400) {
      // Unknown or not-enabled model for this key — let the chain move on.
      return {
        unavailable: true,
        errorMessage: `Image model ${model} unavailable (HTTP ${res.status}).`,
      };
    }
    return {
      errorMessage: `Image generation failed (HTTP ${res.status}). ${body.slice(0, 300)}`,
    };
  }

  const json: any = await res.json();

  if (json?.promptFeedback?.blockReason) {
    return { refused: true, errorMessage: `Blocked: ${json.promptFeedback.blockReason}` };
  }

  const parts = json?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p?.inlineData?.data);
  if (imagePart) {
    const mime = imagePart.inlineData.mimeType || "image/png";
    return { dataUrl: `data:${mime};base64,${imagePart.inlineData.data}` };
  }

  const finish = json?.candidates?.[0]?.finishReason || "no image returned";
  return { refused: true, errorMessage: `Image model returned no image (${finish}).` };
};

/**
 * Render the patient. Falls back from photographic to illustrated if the
 * photographic request is declined — a textbook-style plate still teaches the
 * finding, which beats showing the trainee nothing at all.
 */
export const generatePatientImage = async (
  brief: PatientVisualBrief
): Promise<PatientImageResult> => {
  const apiKey = getImageApiKey();
  if (!apiKey) {
    throw new Error(
      "Patient imagery is not configured. Set GEMINI_API_KEY in the server environment to enable it."
    );
  }
  if (!brief || typeof brief !== "object") {
    throw new Error("No patient visual brief was provided.");
  }

  let lastError = "Image generation failed.";

  for (const model of modelChain()) {
    for (const style of ["photographic", "illustrated"] as const) {
      const outcome = await callGemini(model, buildPatientPrompt(brief, style), apiKey);

      if (outcome.dataUrl) {
        resolvedModel = model;
        return {
          dataUrl: outcome.dataUrl,
          model,
          usedFallbackStyle: style === "illustrated",
        };
      }

      lastError = outcome.errorMessage || lastError;
      // A missing model won't be fixed by restyling the prompt — try the next model.
      if (outcome.unavailable) break;
      // A hard error (auth, quota) is not a safety refusal either.
      if (!outcome.refused) break;
    }
  }

  throw new Error(lastError);
};

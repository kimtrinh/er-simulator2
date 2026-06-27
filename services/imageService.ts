
/**
 * Image Service disabled for performance reasons.
 * AI-generated medical imagery (ECGs/Radiology) has been removed to prevent app slowness and crashes.
 */
export const generateClinicalImage = async (apiKey: string, prompt: string): Promise<string> => {
  console.warn("Image generation is disabled.");
  return "";
};

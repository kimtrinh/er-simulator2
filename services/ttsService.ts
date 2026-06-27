
/**
 * Voice service disabled to maintain free-tier compatibility.
 * TTS models require a billing-enabled project.
 */
export const speakClinicalNarrative = async (apiKey: string, text: string, audioContext: AudioContext): Promise<void> => {
  return Promise.resolve();
};

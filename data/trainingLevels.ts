/**
 * Training level — the same clinical engine, pitched at where the player is in
 * training. The level changes how the case is written, how much the team gives
 * away at the bedside, and how the debrief is scored.
 */

export type TrainingLevel = 'student' | 'resident' | 'attending';

export interface TrainingLevelSpec {
  id: TrainingLevel;
  label: string;
  short: string;
  blurb: string;
  /** How the case itself is built. */
  casePrompt: string;
  /** How the bedside behaves turn to turn. */
  enginePrompt: string;
  /** How the debrief is marked. */
  debriefPrompt: string;
  /** Whether case-specific critical actions are shown up front or kept behind a toggle. */
  suggestionsExpandedByDefault: boolean;
}

export const TRAINING_LEVELS: TrainingLevelSpec[] = [
  {
    id: 'student',
    label: 'Medical Student',
    short: 'Student',
    blurb: 'Classic presentations. The team coaches you and flags what you miss.',
    casePrompt:
      'Write a classic, textbook presentation of a common emergency diagnosis. The history, vitals, and examination should point coherently at one answer. No rare variants, no red herrings, no competing diagnoses.',
    enginePrompt:
      'The nurse is experienced and proactive: she volunteers relevant observations, flags abnormal findings the player has not asked about, and gently prompts when an obvious next step is being missed ("Do you want me to get an EKG, doctor?"). Explain the underlying physiology plainly in "clinicalRationale". Never state the diagnosis, but do not let the player stall.',
    debriefPrompt:
      'Mark as a supportive clinical teacher. Score generously, credit sound reasoning even when execution was incomplete, and frame every error as a learning point. Expect recognition of the diagnosis and the core initial management — not polish.',
    suggestionsExpandedByDefault: true,
  },
  {
    id: 'resident',
    label: 'Resident',
    short: 'Resident',
    blurb: 'Comorbidity and distractors. The team follows orders but will not prompt.',
    casePrompt:
      'Write a typical but non-trivial presentation: relevant comorbidity, an incomplete or unreliable history, or one distracting finding that has to be reasoned past. The diagnosis should be reachable but not obvious from the door chart.',
    enginePrompt:
      'The team answers what it is asked and carries out orders competently, but volunteers nothing and never hints. Include real-world friction: results take time, the scanner is busy, the patient is a poor historian, the IV is difficult.',
    debriefPrompt:
      'Mark to the standard expected of a senior resident running the resuscitation: timeliness of the critical actions, breadth and ranking of the differential, appropriate escalation, and whether the plan held together.',
    suggestionsExpandedByDefault: true,
  },
  {
    id: 'attending',
    label: 'Attending',
    short: 'Attending',
    blurb: 'Undifferentiated and ambiguous. You run the room; consultants push back.',
    casePrompt:
      'Write an atypical, undifferentiated, or diagnostically ambiguous presentation — a blunted response in an elderly or immunosuppressed patient, two problems at once, or a common diagnosis wearing an unfamiliar face. Data should be incomplete and some findings genuinely misleading.',
    enginePrompt:
      'The team looks to the player to run the room and does nothing unprompted. Consultants may disagree, push back, or be slow to arrive. Introduce competing demands and resource constraints where they fit — a second sick patient, no ICU bed, a family that needs a conversation. Never hint, and never rescue a bad plan.',
    debriefPrompt:
      'Mark as a peer reviewing a colleague: diagnostic accuracy under uncertainty, resuscitation timing, resource stewardship, disposition, and communication with consultants and family. Name anchoring and premature closure explicitly where they occurred.',
    suggestionsExpandedByDefault: false,
  },
];

export const DEFAULT_LEVEL: TrainingLevel = 'resident';

export const getLevel = (level?: TrainingLevel | string): TrainingLevelSpec =>
  TRAINING_LEVELS.find((l) => l.id === level) ||
  TRAINING_LEVELS.find((l) => l.id === DEFAULT_LEVEL)!;

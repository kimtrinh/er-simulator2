
export interface Vitals {
  hr: number;
  bpSystolic: number;
  bpDiastolic: number;
  rr: number;
  o2: number;
  temp: number;
  rhythm: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'alert' | 'success';
  timestamp: number;
  imageUrl?: string;
  clinicalRationale?: string;
}

export interface CriticalEvent {
  event: string;
  userAction: string;
  optimalAction: string;
  feedback: string;
  type: 'positive' | 'negative' | 'neutral';
}

export interface DebriefData {
  outcome: string;
  score: number; // 0-100
  summary: string;
  performanceBreakdown: {
    historyDataCollection: number; // 0-100
    differentialDiagnosis: number; // 0-100
    medicalManagement: number; // 0-100
    communicationEfficiency: number; // 0-100
  };
  criticalEvents: CriticalEvent[];
  missedOpportunities: string[];
  cmeLearningPoints: string[];
  /** Engine feedback on the differential the player committed to. */
  diagnosisReview?: string;
  /** The true diagnosis, revealed at debrief. */
  correctDiagnosis?: string;
  /** Snapshot of the differential the player submitted during the case. */
  submittedDiagnoses?: WorkingDiagnosis[];
}

export interface ExtractedImage {
  id: string;
  data: string; // base64
  label: string; // e.g. "EKG", "CXR"
}

export interface LabResult {
  name: string;
  value: string | number;
  unit: string;
  flag?: 'H' | 'L' | 'CRITICAL';
}

export interface DiagnosticReport {
  title: string;
  body: string;
  timestamp: number;
}

export interface PhysicalExamResult {
  system: string;
  finding: string;
  timestamp: number;
}

/** One entry on the player's working differential. Several can be active at once. */
export interface WorkingDiagnosis {
  id: string;
  name: string;
  /** How strongly the player is committing to this entry. */
  confidence: 'leading' | 'considering' | 'ruled-out';
  timestamp: number;
  /** True once the differential containing it has been documented to the chart. */
  submitted?: boolean;
}

export type OrderCategory =
  | 'critical'
  | 'medication'
  | 'lab'
  | 'imaging'
  | 'procedure'
  | 'exam'
  | 'history'
  | 'consult'
  | 'disposition'
  | 'other';

/** Every order / action the player has issued, kept as a running chart log. */
export interface OrderLogEntry {
  id: string;
  label: string;
  detail: string;
  category: OrderCategory;
  timestamp: number;
  critical?: boolean;
}

export interface CaseHistoryEntry {
  id: string;
  timestamp: number;
  diagnosis: string;
  outcome: string;
  score: number;
  summary: string;
  criticalEvents: CriticalEvent[];
  missedOpportunities: string[];
  learningPoints: string[];
  submittedDiagnoses?: string[];
}

export interface GameState {
  stage: 'upload' | 'analyzing' | 'playing' | 'debrief';
  vitals: Vitals;
  messages: Message[];
  learningPoints: string[];
  hiddenDiagnosis: string;
  caseContext: string;
  visuals: ExtractedImage[];
  debriefData?: DebriefData;
  labResults: LabResult[];
  diagnosticReports: DiagnosticReport[];
  physicalExam: PhysicalExamResult[];
  vitalTrend: 'stable' | 'improving' | 'worsening' | 'critical';
  /** Player's working differential — supports several diagnoses at once. */
  workingDiagnoses: WorkingDiagnosis[];
  /** Running log of every order placed, incl. meds given. */
  orderLog: OrderLogEntry[];
  /** Case-specific critical actions surfaced by the engine as clickable orders. */
  criticalActions: string[];
}

export interface ActionPayload {
  actionType: 'history' | 'exam' | 'labs' | 'imaging' | 'treatment' | 'consult';
  detail: string;
}

export interface SimulationResponse {
  narrative: string;
  updatedVitals: Vitals;
  vitalTrend: 'stable' | 'improving' | 'worsening' | 'critical';
  labResults?: LabResult[];
  diagnosticReports?: { title: string; body: string }[];
  physicalExam?: { system: string; finding: string }[];
  isCaseOver: boolean;
  clinicalRationale?: string;
  imageIdToDisplay?: string;
  debriefData?: DebriefData;
}

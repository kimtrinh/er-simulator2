
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
  /** Caption shown over an attached image, e.g. "Patient on arrival". */
  imageLabel?: string;
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
}

/**
 * What the patient actually looks like. Claude writes this alongside the case
 * so the rendered image matches the pathology instead of showing a stock
 * patient who has nothing to do with the scenario.
 */
export interface PatientVisualBrief {
  ageYears: number;
  sex: string;
  build?: string;
  position?: string;
  visibleFindings?: string[];
  devices?: string[];
  distress?: string;
  setting?: string;
  notes?: string;
}

export type PatientImageStatus = 'idle' | 'generating' | 'ready' | 'unavailable';

export interface PatientImage {
  status: PatientImageStatus;
  /** Data URL of the most recent render. */
  dataUrl?: string;
  label?: string;
  /** Why no image is showing, when status is 'unavailable'. */
  message?: string;
  /** True when the photographic render was declined and an illustration was used. */
  illustrated?: boolean;
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
}

export interface GameState {
  stage: 'upload' | 'analyzing' | 'playing' | 'debrief';
  vitals: Vitals;
  messages: Message[];
  learningPoints: string[];
  hiddenDiagnosis: string;
  caseContext: string;
  visuals: ExtractedImage[];
  patientVisual?: PatientVisualBrief;
  patientImage?: PatientImage;
  debriefData?: DebriefData;
  labResults: LabResult[];
  diagnosticReports: DiagnosticReport[];
  physicalExam: PhysicalExamResult[];
  vitalTrend: 'stable' | 'improving' | 'worsening' | 'critical';
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
  /**
   * Set when the patient's visible appearance materially changed this turn
   * (intubated, chest tube placed, bleeding controlled, new rash) so the
   * bedside image can be re-rendered to match.
   */
  patientVisualUpdate?: {
    reason: string;
    visibleFindings?: string[];
    devices?: string[];
    distress?: string;
    position?: string;
  };
  debriefData?: DebriefData;
}

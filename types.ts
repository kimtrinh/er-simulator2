
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
  debriefData?: DebriefData;
}

export type CtpsConfidence = "HIGH" | "MEDIUM" | "LOW";
export type CtpsParseStatus = "COMPLETE" | "REVIEW_REQUIRED" | "UNRECOGNIZED";
export type CtpsEmploymentStatus = "ACTIVE" | "TERMINATED";
export type CtpsContractType = "FIXED_TERM" | "INDEFINITE" | "UNKNOWN";
export type CtpsEventType =
  | "ADMISSION"
  | "TERMINATION"
  | "SALARY_CHANGE"
  | "POSITION_CHANGE"
  | "CBO_CHANGE"
  | "ESTABLISHMENT_CHANGE"
  | "VACATION"
  | "CONTRACT_CHANGE"
  | "EMPLOYMENT_RELATION_CHANGE"
  | "OTHER";
export type CtpsAlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type CtpsSalaryPeriodicity = "MONTHLY" | "HOURLY" | "DAILY" | "UNKNOWN";

export interface CtpsDocumentData {
  type: "CTPS_DIGITAL";
  issuer: string | null;
  ctpsIssuedAt: string | null;
  documentSignedAt: string | null;
  analysisDate: string;
  pageCount: number;
  extractionMethod: "PDF_TEXT" | "PDF_OCR" | "PDF_TEXT_AND_OCR";
  parseStatus: CtpsParseStatus;
  confidence: CtpsConfidence;
}

export interface CtpsHolder {
  name: string | null;
  cpf: string | null;
  birthDate: string | null;
  nationality: string | null;
  sex: string | null;
  motherName: string | null;
}

export interface CtpsEmployer {
  name: string | null;
  cnpj: string | null;
}

export interface CtpsEstablishment {
  name: string | null;
  cnpj: string | null;
}

export interface CtpsSalaryRecord {
  amount: number;
  recordedAt: string | null;
  effectiveFrom: string | null;
  periodicity: CtpsSalaryPeriodicity;
  confidence: CtpsConfidence;
  source: "CONTRACTUAL_FIELD" | "HISTORY";
  originalText: string;
}

export interface CtpsPositionRecord {
  title: string;
  cbo: string | null;
  from: string | null;
  to: string | null;
  originalText: string;
}

export interface CtpsContractRecord {
  type: CtpsContractType;
  from: string | null;
  to: string | null;
  originalText: string;
}

export interface CtpsVacationRecord {
  startDate: string | null;
  endDate: string | null;
  recordedAt: string | null;
  originalText: string;
}

export interface CtpsEmploymentEvent {
  type: CtpsEventType;
  recordedAt: string | null;
  effectiveFrom: string | null;
  originalText: string;
  pageNumber: number;
}

export interface CtpsEmployment {
  id: string;
  status: CtpsEmploymentStatus;
  admissionDate: string | null;
  terminationDate: string | null;
  employer: CtpsEmployer;
  establishment: CtpsEstablishment;
  currentPosition: string | null;
  currentCbo: string | null;
  contractType: CtpsContractType;
  employmentRelation: string | null;
  admissionType: string | null;
  currentSalary: CtpsSalaryRecord | null;
  salaryHistory: CtpsSalaryRecord[];
  positionHistory: CtpsPositionRecord[];
  contractHistory: CtpsContractRecord[];
  vacations: CtpsVacationRecord[];
  events: CtpsEmploymentEvent[];
  confidence: CtpsConfidence;
}

export interface CtpsAnalysisSummary {
  activeEmploymentCount: number;
  terminatedEmploymentCount: number;
  currentContractualIncome: number;
  oldestActiveAdmissionDate: string | null;
}

export interface CtpsAlert {
  code: string;
  severity: CtpsAlertSeverity;
  message: string;
  employmentId?: string;
}

export interface CtpsReadingQuality {
  confidence: CtpsConfidence;
  textCharacters: number;
  pageCount: number;
  recognizedEventCount: number;
  unrecognizedEventCount: number;
}

export interface CtpsAnalysis {
  document: CtpsDocumentData;
  holder: CtpsHolder;
  employments: CtpsEmployment[];
  summary: CtpsAnalysisSummary;
  alerts: CtpsAlert[];
  quality: CtpsReadingQuality;
}

export interface CtpsDocumentProcessingProgress {
  stage: "READING" | "IDENTIFYING" | "PROCESSING" | "VALIDATING" | "GENERATING";
  label: string;
  progress: number;
}

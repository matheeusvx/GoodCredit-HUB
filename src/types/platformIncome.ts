export type PlatformProvider = "UBER" | "99" | "LALAMOVE" | "RAPPI";

export type PlatformDocumentPeriod = "MONTHLY" | "ANNUAL" | "UNKNOWN";

export type PlatformIncomeStatus =
  | "COMPLETE"
  | "INSUFFICIENT_DOCUMENTS"
  | "HOLDER_MISMATCH"
  | "DUPLICATE_COMPETENCE"
  | "VALUE_DIVERGENCE"
  | "REVIEW_REQUIRED";

export interface PlatformValueEvidence {
  label: string;
  value: number;
  pageNumber: number;
  priority: number;
}

export interface PlatformIncomeDocument {
  id: string;
  fileName: string;
  platform: PlatformProvider;
  documentPeriod: PlatformDocumentPeriod;
  holderName: string | null;
  holderCpf: string | null;
  competence: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  grossIncome: number | null;
  netIncome: number | null;
  grossIncomeEvidence: PlatformValueEvidence[];
  documentConfidence: number;
  extractionMethod: "PDF_TEXT" | "PDF_OCR";
  parserId: string;
  pageCount: number;
  isValidForIncomeCalculation: boolean;
  invalidReason: string | null;
  warnings: string[];
}

export interface PlatformIncomeResult {
  platform: PlatformProvider;
  holderName: string | null;
  holderCpf: string | null;
  validDocuments: PlatformIncomeDocument[];
  selectedDocuments: PlatformIncomeDocument[];
  ignoredDocuments: PlatformIncomeDocument[];
  consideredGrossIncome: number | null;
  determiningCompetence: string | null;
  status: PlatformIncomeStatus;
  method: string;
  warnings: string[];
  canSendToSimulation: boolean;
}

export interface PlatformDocumentDetection {
  platform: PlatformProvider | null;
  confidence: number;
  signals: string[];
}

export interface PlatformParserContext {
  id: string;
  fileName: string;
  extractionMethod: "PDF_TEXT" | "PDF_OCR";
  pageCount: number;
}

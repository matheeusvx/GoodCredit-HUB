export type SaoPauloOperationType =
  | "CASH_PURCHASE"
  | "SFH"
  | "PAR"
  | "HIS"
  | "CONSORTIUM"
  | "SFI";

export type SaoPauloItbiRule =
  | "POTENTIAL_EXEMPTION"
  | "GENERAL_RATE"
  | "REDUCED_FINANCING_RATE";

export type SaoPauloExemptionStatus =
  | "POTENTIALLY_EXEMPT"
  | "NOT_ELIGIBLE"
  | "INCOMPLETE";

export interface SaoPauloItbiInput {
  purchasePrice: number;
  referenceValue: number;
  financedAmount: number | null;
  operationType: SaoPauloOperationType;
  contractYear: 2026;
  isIndividualPerson: boolean | null;
  isExclusivelyResidential: boolean | null;
  isFirstPropertyAcquisition: boolean | null;
  isMinhaCasaMinhaVida: boolean | null;
}

export interface SaoPauloPotentialExemptionResult {
  potentiallyExempt: boolean;
  status: SaoPauloExemptionStatus;
  message: string;
}

export interface SaoPauloItbiResult {
  status: "CALCULATED" | "INVALID_INPUT" | "REVIEW_REQUIRED";
  city: "SAO_PAULO";
  ruleYear: 2026;
  operationType: SaoPauloOperationType;
  purchasePrice: number;
  referenceValue: number;
  baseCalculation: number;
  financedAmount: number | null;
  benefitedFinancing: number;
  reducedTaxAmount: number;
  regularTaxBase: number;
  regularTaxAmount: number;
  totalTax: number | null;
  potentiallyExempt: boolean;
  exemptionStatus: SaoPauloExemptionStatus;
  exemptionMessage: string;
  ruleApplied: SaoPauloItbiRule | null;
  badge: string;
  explanation: string;
  warnings: string[];
  errors: string[];
}

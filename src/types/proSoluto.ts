export type FinancingSourceType = "APPROVED" | "ESTIMATED" | "UNAVAILABLE";

export type ProSolutoStatus =
  | "HAS_PRO_SOLUTO"
  | "FULLY_COVERED"
  | "SURPLUS_RESOURCES"
  | "INCOMPLETE";

export type ProSolutoAlertLevel = "info" | "warning" | "danger" | "success";

export interface ProSolutoAlert {
  code: string;
  level: ProSolutoAlertLevel;
  message: string;
}

export interface ProSolutoForm {
  clientName: string;
  purchasePrice: number;
  appraisalValue: number | null;
  financeablePercent: number | null;
  approvedFinancing: number | null;
  useEstimatedFinancing: boolean;
  fgtsAmount: number;
  subsidyAmount: number;
  paidEntryAmount: number;
  otherOwnResources: number;
}

export interface ProSolutoCalculationResult {
  financingBase: number;
  financingLimit: number | null;
  financingConsidered: number;
  financingSource: FinancingSourceType;
  financingIsEstimated: boolean;
  approvedFinancingExcess: number;
  complementaryResources: number;
  totalCovered: number;
  rawProSoluto: number;
  proSoluto: number;
  uncoveredPercent: number;
  surplusResources: number;
  status: ProSolutoStatus;
  warnings: ProSolutoAlert[];
}

export interface ProSolutoExplanationStep {
  number: number;
  title: string;
  description: string;
  formula: string;
  substitution: string;
  result: string;
}

export interface StoredProSolutoState {
  version: 1;
  form: ProSolutoForm;
}


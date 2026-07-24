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

export interface ProSolutoInput {
  sellerReceivableAmount: number;
  appraisalValue: number;
  financeablePercent: number;
  approvedCreditAmount: number | null;
  creditNotApprovedYet: boolean;
  fgtsAmount: number;
  paidEntryAmount: number;
}

export interface ProSolutoForm extends ProSolutoInput {
  clientName: string;
}

export interface ProSolutoCalculationResult {
  validatedFinanceablePercent: number;
  appraisalFinancingLimit: number;
  financingConsidered: number;
  financingSource: FinancingSourceType;
  financingIsEstimated: boolean;
  approvedCreditExcess: number;
  approvedCreditShortfall: number;
  totalAvailableResources: number;
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
  calculation: string;
  result: string;
}

export interface StoredProSolutoState {
  version: 2;
  form: ProSolutoForm;
}

export interface LegacyStoredProSolutoState {
  version?: 1;
  form?: {
    clientName?: string;
    purchasePrice?: number;
    appraisalValue?: number | null;
    financeablePercent?: number | null;
    approvedFinancing?: number | null;
    useEstimatedFinancing?: boolean;
    fgtsAmount?: number;
    subsidyAmount?: number;
    paidEntryAmount?: number;
    otherOwnResources?: number;
  };
}

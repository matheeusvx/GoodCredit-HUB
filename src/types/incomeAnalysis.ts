export type IncomeProfile = "AUTONOMO" | "LIBERAL" | "EMPRESARIO" | "MEI" | "INFORMAL" | "CLT_COMPLEMENTAR" | "OUTRO";
export type TransactionClassification = "INCLUDE" | "EXCLUDE" | "REVIEW";
export type TransactionType = "CREDIT" | "DEBIT";
export type ExclusionReason = "SAME_OWNERSHIP" | "SPOUSE_OR_COPARTICIPANT" | "PARENTS_OR_FAMILY" | "INVESTMENT_REDEMPTION" | "DUPLICATE" | "REVERSAL" | "LOAN" | "REFUND" | "BETWEEN_ANALYZED_ACCOUNTS" | "OWN_CAPITAL" | "ASSET_SALE" | "OTHER";
export type InclusionReason = "PROFESSIONAL_REVENUE" | "CLIENT_PAYMENT" | "SERVICE" | "RECURRING_SALE" | "FEES" | "COMMISSION" | "PRO_LABORE" | "RECURRING_DISTRIBUTION" | "SALARY_COMPLEMENT" | "OPERATING_REVENUE" | "OTHER";
export type ReviewReason = "UNIDENTIFIED_PIX" | "CASH_DEPOSIT" | "GENERIC_DESCRIPTION" | "UNUSUAL_VALUE" | "POSSIBLE_DUPLICATE" | "ONE_OFF_ENTRY" | "FRACTIONED_CREDITS" | "LOW_CONFIDENCE" | "OTHER";
export type ClassificationReason = ExclusionReason | InclusionReason | ReviewReason | "";

export interface BankTransaction {
  id: string;
  selected: boolean;
  date: string;
  competence: string;
  description: string;
  payer: string;
  reference: string;
  type: TransactionType;
  amount: number;
  account: string;
  participant: string;
  classification: TransactionClassification;
  reason: ClassificationReason;
  note: string;
  classificationSource: "MANUAL" | "SUGGESTED";
  suggestion?: { classification: TransactionClassification; reason: ClassificationReason; label: string };
}

export interface IncomeAnalysisForm {
  clientName: string;
  incomeProfile: IncomeProfile | "";
  participantCount: "1" | "2" | "3_PLUS";
  bank: string;
  accountCount: number;
  periodStart: string;
  periodEnd: string;
  analysisType: "SINGLE_ACCOUNT" | "MULTIPLE_SAME_OWNER" | "MULTIPLE_PARTICIPANTS";
  declaredActivity: string;
  analystNotes: string;
  excludedCompetences: Record<string, string>;
}

export interface MonthlyIncomeSummary {
  competence: string;
  label: string;
  totalEntries: number;
  totalIncluded: number;
  totalExcluded: number;
  totalReview: number;
  includedCount: number;
  excludedCount: number;
  status: "COMPLETED" | "PENDING" | "EMPTY" | "EXCLUDED";
  exclusionJustification?: string;
}

export interface PayerRecurrence { payer: string; months: number; total: number; average: number; occurrences: number; }

export interface IncomeAnalysisResult {
  months: MonthlyIncomeSummary[];
  monthCount: number;
  totalEntries: number;
  totalIncluded: number;
  totalExcluded: number;
  totalReview: number;
  averageIncome: number;
  medianIncome: number;
  highestMonth?: MonthlyIncomeSummary;
  lowestMonth?: MonthlyIncomeSummary;
  variationPercent: number;
  stability: "HIGH" | "MODERATE" | "ELEVATED" | "INSUFFICIENT";
  stabilityLabel: string;
  includedCount: number;
  excludedCount: number;
  pendingCount: number;
  consideredPercent: number;
  recurrence: PayerRecurrence[];
  exclusionTotals: Array<{ reason: string; total: number }>;
}

export interface CsvColumnMapping { date: string; description: string; amount: string; type: string; payer: string; account: string; competence: string; }
export interface CsvPreview { headers: string[]; rows: string[][]; separator: string; ignoreHeader: boolean; }

export interface IncomeAnalysisState { form: IncomeAnalysisForm; transactions: BankTransaction[]; doNotSave: boolean; }
export interface IncomeSimulationPrefill { clientName: string; incomeProfile: IncomeProfile | ""; analyzedPeriod: { start: string; end: string; months: number }; averageIncome: number; medianIncome: number; totalConsidered: number; pendingReviewAmount: number; generatedAt: string; }

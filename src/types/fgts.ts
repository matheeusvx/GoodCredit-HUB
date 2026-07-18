export type FgtsUsageMode = "ACQUISITION" | "AMORTIZATION" | "SETTLEMENT" | "INSTALLMENTS";
export type FgtsEligibilityAnswer = "YES" | "NO" | "UNKNOWN";
export type FgtsEligibilityStatus = "ELIGIBLE_INDICATIONS" | "POSSIBLE_BARRIER" | "NEEDS_CONFIRMATION" | "INCOMPLETE";

export interface FgtsEligibilityForm {
  employmentThreeYears: FgtsEligibilityAnswer;
  activeSfhFinancing: FgtsEligibilityAnswer;
  ownsHomeResidenceCity: FgtsEligibilityAnswer;
  ownsHomeWorkCity: FgtsEligibilityAnswer;
  ownsHomeNearbyCity: FgtsEligibilityAnswer;
  ownsHomeOtherState: FgtsEligibilityAnswer;
  otherStateHomePaid: FgtsEligibilityAnswer;
  ownHousingPurpose: FgtsEligibilityAnswer;
  contractEligible: FgtsEligibilityAnswer;
  usageMode: FgtsUsageMode | "";
  installmentsCurrent: "YES" | "NO" | "NOT_APPLICABLE";
}

export interface FgtsEligibilityResult {
  status: FgtsEligibilityStatus;
  label: string;
  messages: string[];
}

export type FgtsEmploymentType = "REGULAR" | "APPRENTICE" | "OTHER" | "UNKNOWN";
export type FgtsIncomeCriterion = "PAYSLIP" | "FGTS_ESTIMATE" | "HIGHEST" | "MANUAL";
export type CaixaAquiIncomeOption = "FGTS" | "PAYSLIP" | "EQUIVALENT" | "PENDING_VALIDATION";

export interface FgtsIncomeForm {
  payslipCompetence: string;
  payslipGross: number;
  depositCompetence: string;
  monthlyDeposit: number;
  employmentType: FgtsEmploymentType;
  contributionRate: number;
  criterion: FgtsIncomeCriterion;
  manualIncome: number;
  regularMonthlyDeposit: boolean;
  sameCompetence: boolean;
  notThirteenthSalary: boolean;
  notVacationPayment: boolean;
  notRetroactiveAdjustment: boolean;
  notAccumulatedPayment: boolean;
  rateConfirmed: boolean;
}

export interface FgtsIncomeResult {
  estimatedIncome: number;
  consideredIncome: number;
  differenceAmount: number;
  differencePercent: number | null;
  highestIncome: number;
  recommendedOption: CaixaAquiIncomeOption;
  provisionalOption: Exclude<CaixaAquiIncomeOption, "PENDING_VALIDATION">;
  recommendedOptionLabel: string;
  higherValueLabel: string;
  competenceMatches: boolean;
  requiresReview: boolean;
  status: "COMPETENCES_CONFIRMED" | "COMPETENCES_DIVERGENT" | "REVIEW_REQUIRED" | "PENDING_VALIDATION";
  statusLabel: string;
  warnings: string[];
}

export type FgtsContributionMode = "FIXED" | "CURRENT_BALANCE" | "MONTHLY_PROJECTION" | "INDIVIDUAL";

export interface FgtsWorker {
  id: string;
  name: string;
  currentBalance: number;
  monthlyDeposit: number;
  lastUsageDate: string;
}

export interface FgtsAmortizationEvent {
  id: string;
  eventNumber: number;
  month: number;
  estimatedDate: string;
  availableBalance: number;
  amount: number;
  remainingBalance: number;
  active: boolean;
  note: string;
  source: "FGTS";
}

export interface FgtsProjectionForm {
  contractDate: string;
  lastUsageDate: string;
  neverUsed: boolean;
  currentBalance: number;
  monthlyDeposit: number;
  remainingTermMonths: number;
  firstContributionMonth: number;
  periodicityMonths: number;
  contributionMode: FgtsContributionMode;
  fixedAmount: number;
  lastMonth?: number;
}

export interface FgtsProjectionResult {
  nextEligibleDate: string;
  events: FgtsAmortizationEvent[];
  totalProjected: number;
}

export interface FgtsDocumentItem {
  id: string;
  label: string;
  required?: boolean;
}

export interface FgtsModuleState {
  clientName: string;
  eligibility: FgtsEligibilityForm;
  income: FgtsIncomeForm;
  projection: FgtsProjectionForm;
  customEvents: FgtsAmortizationEvent[];
}

export interface FgtsAmortizationPrefill {
  clientName: string;
  periodicityMonths: number;
  nextEligibleDate: string;
  events: Array<{ month: number; amount: number; source: "FGTS" }>;
}

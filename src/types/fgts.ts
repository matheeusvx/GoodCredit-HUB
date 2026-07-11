export type FgtsUsageMode = "ACQUISITION" | "AMORTIZATION" | "SETTLEMENT" | "INSTALLMENTS";
export type FgtsEligibilityAnswer = "YES" | "NO" | "UNKNOWN";
export type FgtsEligibilityStatus = "ELIGIBLE_INDICATIONS" | "POSSIBLE_BARRIER" | "NEEDS_CONFIRMATION" | "INCOMPLETE";

export interface FgtsEligibilityForm {
  employmentThreeYears: FgtsEligibilityAnswer;
  activeSfhFinancing: FgtsEligibilityAnswer;
  ownsHomeResidenceCity: FgtsEligibilityAnswer;
  ownsHomeWorkCity: FgtsEligibilityAnswer;
  ownsHomeNearbyCity: FgtsEligibilityAnswer;
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
  notAtypicalPayment: boolean;
  rateConfirmed: boolean;
}

export interface FgtsIncomeResult {
  estimatedIncome: number;
  consideredIncome: number;
  differenceAmount: number;
  differencePercent: number;
  highestIncome: number;
  status: "COHERENT" | "DIVERGENT" | "REVIEW_REQUIRED";
  statusLabel: string;
  criterionLabel: string;
  alerts: string[];
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
  advancedPeriodicity: boolean;
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

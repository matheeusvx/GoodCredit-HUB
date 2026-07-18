export type AmortizationSystem = "SAC" | "PRICE";

export type ContributionMap = Record<number, number>;

export type ContributionSource = "MANUAL" | "FGTS";

export type AmortizationEventStatus =
  | "APPLIED"
  | "PARTIALLY_APPLIED"
  | "NOT_USED_AFTER_PAYOFF"
  | "INVALID";

export interface AmortizationContributionEvent {
  id: string;
  month: number;
  source: ContributionSource;
  requestedAmount: number;
  enabled: boolean;
}

export interface AmortizationEventResult {
  month: number;
  source: ContributionSource;
  requestedAmount: number;
  appliedAmount: number;
  unusedAmount: number;
  status: AmortizationEventStatus;
}

export interface FinancingInputs {
  nomeCliente: string;
  valorFinanciado: number;
  prazoMeses: number;
  taxaAnual: number;
  sistema: AmortizationSystem;
}

export interface AmortizationRow {
  month: number;
  remainingMonths: number;
  contractInitialBalance: number;
  contractInterest: number;
  contractCurrentBalance: number;
  contractAmortization: number;
  contractInstallment: number;
  contractFinalBalance: number;
  manualContribution: number;
  fgtsContribution: number;
  manualContributionApplied: number;
  fgtsContributionApplied: number;
  manualContributionUnused: number;
  fgtsContributionUnused: number;
  simulatedInitialBalance: number;
  simulatedInterest: number;
  simulatedCurrentBalance: number;
  simulatedAmortization: number;
  simulatedInstallment: number;
  simulatedFinalBalance: number;
  payoff: boolean;
  afterPayoff: boolean;
  eventResults: AmortizationEventResult[];
}

export interface AmortizationSummary {
  prazoOriginal: number;
  prazoAtual: number;
  sistema: AmortizationSystem;
  valorFinanciado: number;
  jurosContrato: number;
  totalOriginal: number;
  jurosPago: number;
  totalPago: number;
  totalAportesManuais: number;
  totalAportesFgts: number;
  totalAportes: number;
  economiaJuros: number;
  percentualReducaoJuros: number;
  reducaoParcelas: number;
  percentualReducaoParcelas: number;
  economiaSobreTotalOriginal: number;
}

export interface AmortizationImpactSummary {
  originalTermMonths: number;
  correctedTermMonths: number;
  eliminatedInstallments: number;
  termReductionPercent: number;
  originalInterestTotal: number;
  correctedInterestTotal: number;
  interestSavings: number;
  interestSavingsPercent: number;
  manualAmortizationApplied: number;
  fgtsAmortizationApplied: number;
  totalAmortizationApplied: number;
  manualSharePercent: number;
  fgtsSharePercent: number;
  originalProjectedTotal: number;
  correctedProjectedTotal: number;
  totalCostReduction: number;
  totalCostReductionPercent: number;
  payoffMonth: number | null;
  paidOff: boolean;
  unusedManualAmount: number;
  unusedFgtsAmount: number;
  eventResults: AmortizationEventResult[];
}

export interface RecurringContributionConfig {
  value: number;
  frequency: number;
  firstMonth: number;
  hasLimit: boolean;
  limitMonth?: number;
}

export interface StoredSimulation {
  inputs: FinancingInputs;
  version?: number;
  manualEvents: AmortizationContributionEvent[];
  fgtsEvents: AmortizationContributionEvent[];
  manualContributions?: ContributionMap;
  fgtsContributions?: ContributionMap;
}

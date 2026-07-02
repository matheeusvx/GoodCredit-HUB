export type AmortizationSystem = "SAC" | "PRICE";

export type ContributionMap = Record<number, number>;

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
  simulatedInitialBalance: number;
  simulatedInterest: number;
  simulatedCurrentBalance: number;
  simulatedAmortization: number;
  simulatedInstallment: number;
  simulatedFinalBalance: number;
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

export interface RecurringContributionConfig {
  value: number;
  frequency: number;
  firstMonth: number;
  hasLimit: boolean;
  limitMonth?: number;
}

export interface StoredSimulation {
  inputs: FinancingInputs;
  manualContributions: ContributionMap;
  fgtsContributions: ContributionMap;
}

import {
  AmortizationEventResult,
  AmortizationRow,
  AmortizationSummary,
  ContributionMap,
  FinancingInputs,
  RecurringContributionConfig
} from "../types/amortization";
import { calculateAmortizationImpact, MONEY_EPSILON } from "./amortization/impact";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function parseCurrencyBR(value: string | number): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  return parseNumberBR(value);
}

export function parseNumberBR(value: string): number {
  if (!value) return 0;

  const normalized = value
    .replace(/\s/g, "")
    .replace(/R\$/g, "")
    .replace(/%/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parsePercentBR(value: string): number {
  if (!value) return 0;

  const normalized = value.replace(/\s/g, "").replace("%", "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed / 100 : 0;
}

export function parseIntegerBR(value: string): number {
  const onlyNumbers = value.replace(/\D/g, "");
  const parsed = Number(onlyNumbers);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrencyBR(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatPercentBR(value: number): string {
  return percentFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatInputCurrencyBR(value: number): string {
  return (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatInputPercentBR(value: number): string {
  return ((Number.isFinite(value) ? value : 0) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function calcMonthlyRate(annualRate: number): number {
  return Math.pow(1 + Math.max(0, annualRate), 1 / 12) - 1;
}

export function pmt(rate: number, nper: number, pv: number): number {
  if (nper <= 0 || pv <= 0) return 0;
  if (rate === 0) return pv / nper;
  return (rate * pv) / (1 - Math.pow(1 + rate, -nper));
}

export function generateRecurringContributions(
  config: RecurringContributionConfig,
  prazoMeses: number
): ContributionMap {
  const value = Math.max(0, config.value);
  const frequency = Math.max(1, Math.floor(config.frequency));
  const firstMonth = Math.max(1, Math.floor(config.firstMonth));
  const finalMonth = config.hasLimit
    ? Math.min(prazoMeses, Math.max(firstMonth, Math.floor(config.limitMonth ?? prazoMeses)))
    : prazoMeses;

  const contributions: ContributionMap = {};
  if (value <= 0 || firstMonth > prazoMeses) return contributions;

  for (let month = firstMonth; month <= finalMonth; month += frequency) {
    contributions[month] = value;
  }

  return contributions;
}

export function generateAmortizationSchedule(
  inputs: FinancingInputs,
  manualContributions: ContributionMap = {},
  fgtsContributions: ContributionMap = {}
): AmortizationRow[] {
  const valorFinanciado = Math.max(0, inputs.valorFinanciado);
  const prazoMeses = Math.max(1, Math.floor(inputs.prazoMeses));
  const taxaMensal = calcMonthlyRate(inputs.taxaAnual);
  const fixedAmortization = valorFinanciado / prazoMeses;

  let contractFinalBalance = valorFinanciado;
  let simulatedFinalBalance = valorFinanciado;

  return Array.from({ length: prazoMeses }, (_, index) => {
    const month = index + 1;
    const remainingMonths = prazoMeses - index;
    const contractInitialBalance = month === 1 ? valorFinanciado : contractFinalBalance;
    const contractInterest = contractInitialBalance * taxaMensal;
    const contractCurrentBalance = contractInitialBalance + contractInterest;

    let contractAmortization = 0;
    let contractInstallment = 0;

    if (inputs.sistema === "SAC") {
      contractAmortization = Math.min(fixedAmortization, contractInitialBalance);
      contractInstallment = contractInterest + contractAmortization;
    } else {
      contractInstallment = Math.min(
        pmt(taxaMensal, remainingMonths, contractInitialBalance),
        contractCurrentBalance
      );
      contractAmortization = Math.max(0, contractInstallment - contractInterest);
    }

    contractFinalBalance = Math.max(0, contractCurrentBalance - contractInstallment);

    const manualContribution = Math.max(0, manualContributions[month] ?? 0);
    const fgtsContribution = Math.max(0, fgtsContributions[month] ?? 0);
    const simulatedInitialBalance = month === 1 ? valorFinanciado : simulatedFinalBalance;

    let simulatedInterest = 0;
    let simulatedCurrentBalance = 0;
    let simulatedAmortization = 0;
    let simulatedInstallment = 0;
    let manualContributionApplied = 0;
    let fgtsContributionApplied = 0;
    let manualContributionUnused = manualContribution;
    let fgtsContributionUnused = fgtsContribution;
    const afterPayoff = simulatedInitialBalance <= MONEY_EPSILON;

    if (!afterPayoff) {
      simulatedInterest = simulatedInitialBalance * taxaMensal;
      simulatedCurrentBalance = simulatedInitialBalance + simulatedInterest;
      const regularInstallment = Math.min(contractInstallment, simulatedCurrentBalance);
      const balanceBeforeContributions = Math.max(0, simulatedCurrentBalance - regularInstallment);

      // Deterministic order: manual contributions are applied before FGTS.
      manualContributionApplied = Math.min(manualContribution, balanceBeforeContributions);
      const balanceAfterManual = Math.max(0, balanceBeforeContributions - manualContributionApplied);
      fgtsContributionApplied = Math.min(fgtsContribution, balanceAfterManual);
      manualContributionUnused = Math.max(0, manualContribution - manualContributionApplied);
      fgtsContributionUnused = Math.max(0, fgtsContribution - fgtsContributionApplied);
      simulatedInstallment = regularInstallment + manualContributionApplied + fgtsContributionApplied;
      simulatedAmortization = Math.max(0, simulatedInstallment - simulatedInterest);
      simulatedFinalBalance = Math.max(0, simulatedCurrentBalance - simulatedInstallment);
      if (simulatedFinalBalance <= MONEY_EPSILON) simulatedFinalBalance = 0;
    } else {
      simulatedFinalBalance = 0;
    }

    const payoff = !afterPayoff && simulatedFinalBalance === 0;
    const eventResults: AmortizationEventResult[] = [
      ...(manualContribution > 0
        ? [
            {
              month,
              source: "MANUAL" as const,
              requestedAmount: manualContribution,
              appliedAmount: manualContributionApplied,
              unusedAmount: manualContributionUnused,
              status: afterPayoff
                ? ("NOT_USED_AFTER_PAYOFF" as const)
                : manualContributionApplied <= MONEY_EPSILON
                  ? ("NOT_USED_AFTER_PAYOFF" as const)
                  : manualContributionUnused > MONEY_EPSILON
                    ? ("PARTIALLY_APPLIED" as const)
                    : ("APPLIED" as const)
            }
          ]
        : []),
      ...(fgtsContribution > 0
        ? [
            {
              month,
              source: "FGTS" as const,
              requestedAmount: fgtsContribution,
              appliedAmount: fgtsContributionApplied,
              unusedAmount: fgtsContributionUnused,
              status: afterPayoff
                ? ("NOT_USED_AFTER_PAYOFF" as const)
                : fgtsContributionApplied <= MONEY_EPSILON
                  ? ("NOT_USED_AFTER_PAYOFF" as const)
                  : fgtsContributionUnused > MONEY_EPSILON
                    ? ("PARTIALLY_APPLIED" as const)
                    : ("APPLIED" as const)
            }
          ]
        : [])
    ];

    return {
      month,
      remainingMonths,
      contractInitialBalance,
      contractInterest,
      contractCurrentBalance,
      contractAmortization,
      contractInstallment,
      contractFinalBalance,
      manualContribution,
      fgtsContribution,
      manualContributionApplied,
      fgtsContributionApplied,
      manualContributionUnused,
      fgtsContributionUnused,
      simulatedInitialBalance,
      simulatedInterest,
      simulatedCurrentBalance,
      simulatedAmortization,
      simulatedInstallment,
      simulatedFinalBalance,
      payoff,
      afterPayoff,
      eventResults
    };
  });
}

export function summarizeSchedule(
  inputs: FinancingInputs,
  rows: AmortizationRow[]
): AmortizationSummary {
  const impact = calculateAmortizationImpact(rows);

  return {
    prazoOriginal: inputs.prazoMeses,
    prazoAtual: impact.correctedTermMonths,
    sistema: inputs.sistema,
    valorFinanciado: inputs.valorFinanciado,
    jurosContrato: impact.originalInterestTotal,
    totalOriginal: impact.originalProjectedTotal,
    jurosPago: impact.correctedInterestTotal,
    totalPago: impact.correctedProjectedTotal,
    totalAportesManuais: impact.manualAmortizationApplied,
    totalAportesFgts: impact.fgtsAmortizationApplied,
    totalAportes: impact.totalAmortizationApplied,
    economiaJuros: impact.interestSavings,
    percentualReducaoJuros: impact.interestSavingsPercent,
    reducaoParcelas: impact.eliminatedInstallments,
    percentualReducaoParcelas: impact.termReductionPercent,
    economiaSobreTotalOriginal: impact.totalCostReductionPercent
  };
}

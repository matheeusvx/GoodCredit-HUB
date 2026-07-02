import {
  AmortizationRow,
  AmortizationSummary,
  ContributionMap,
  FinancingInputs,
  RecurringContributionConfig
} from "../types/amortization";

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
    const aporteTotal = manualContribution + fgtsContribution;
    const simulatedInitialBalance = month === 1 ? valorFinanciado : simulatedFinalBalance;

    let simulatedInterest = 0;
    let simulatedCurrentBalance = 0;
    let simulatedAmortization = 0;
    let simulatedInstallment = 0;

    if (simulatedInitialBalance > 0) {
      simulatedInterest = simulatedInitialBalance * taxaMensal;
      simulatedCurrentBalance = simulatedInitialBalance + simulatedInterest;
      simulatedInstallment = Math.min(contractInstallment + aporteTotal, simulatedCurrentBalance);
      simulatedAmortization = Math.max(0, simulatedInstallment - simulatedInterest);
      simulatedFinalBalance = Math.max(0, simulatedCurrentBalance - simulatedInstallment);
    } else {
      simulatedFinalBalance = 0;
    }

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
      simulatedInitialBalance,
      simulatedInterest,
      simulatedCurrentBalance,
      simulatedAmortization,
      simulatedInstallment,
      simulatedFinalBalance
    };
  });
}

export function summarizeSchedule(
  inputs: FinancingInputs,
  rows: AmortizationRow[]
): AmortizationSummary {
  const paidRows = rows.filter((row) => row.simulatedInstallment > 0 || row.simulatedInterest > 0);
  const firstPaidOff = rows.find((row) => row.simulatedFinalBalance <= 0);
  const prazoAtual = firstPaidOff?.month ?? inputs.prazoMeses;
  const jurosContrato = rows.reduce((sum, row) => sum + row.contractInterest, 0);
  const totalOriginal = rows.reduce((sum, row) => sum + row.contractInstallment, 0);
  const jurosPago = paidRows.reduce((sum, row) => sum + row.simulatedInterest, 0);
  const totalPago = paidRows.reduce((sum, row) => sum + row.simulatedInstallment, 0);
  const totalAportesManuais = rows.reduce((sum, row) => sum + row.manualContribution, 0);
  const totalAportesFgts = rows.reduce((sum, row) => sum + row.fgtsContribution, 0);
  const totalAportes = totalAportesManuais + totalAportesFgts;
  const economiaJuros = Math.max(0, jurosContrato - jurosPago);
  const reducaoParcelas = Math.max(0, inputs.prazoMeses - prazoAtual);

  return {
    prazoOriginal: inputs.prazoMeses,
    prazoAtual,
    sistema: inputs.sistema,
    valorFinanciado: inputs.valorFinanciado,
    jurosContrato,
    totalOriginal,
    jurosPago,
    totalPago,
    totalAportesManuais,
    totalAportesFgts,
    totalAportes,
    economiaJuros,
    percentualReducaoJuros: jurosContrato > 0 ? economiaJuros / jurosContrato : 0,
    reducaoParcelas,
    percentualReducaoParcelas: inputs.prazoMeses > 0 ? reducaoParcelas / inputs.prazoMeses : 0,
    economiaSobreTotalOriginal: totalOriginal > 0 ? economiaJuros / totalOriginal : 0
  };
}

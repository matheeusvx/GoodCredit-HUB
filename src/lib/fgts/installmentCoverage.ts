import { FGTS_RULES } from "./fgtsRules";

export interface InstallmentCoverageInput {
  installmentAmount: number;
  installmentCount: number;
  coveragePercent: number;
  availableFgtsBalance: number;
}

export interface InstallmentCoverageResult {
  totalInstallments: number;
  theoreticalCoverageLimit: number;
  appliedFgtsAmount: number;
  remainingClientAmount: number;
  effectiveCoveragePercent: number;
  unusedFgtsBalance: number;
}

export const MAXIMUM_INSTALLMENT_COVERAGE_PERCENT = FGTS_RULES.maximumInstallmentCoveragePercent * 100;

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateInstallmentCoverage(
  input: InstallmentCoverageInput
): InstallmentCoverageResult {
  const installmentAmount = nonNegative(input.installmentAmount);
  const installmentCount = Math.max(0, Math.floor(nonNegative(input.installmentCount)));
  const coveragePercent = Math.min(
    MAXIMUM_INSTALLMENT_COVERAGE_PERCENT,
    nonNegative(input.coveragePercent)
  );
  const availableFgtsBalance = nonNegative(input.availableFgtsBalance);
  const totalInstallments = installmentAmount * installmentCount;
  const theoreticalCoverageLimit = totalInstallments * (coveragePercent / 100);
  const appliedFgtsAmount = Math.min(availableFgtsBalance, theoreticalCoverageLimit);
  const remainingClientAmount = Math.max(0, totalInstallments - appliedFgtsAmount);
  const effectiveCoveragePercent = totalInstallments > 0 ? appliedFgtsAmount / totalInstallments : 0;
  const unusedFgtsBalance = Math.max(0, availableFgtsBalance - appliedFgtsAmount);

  return {
    totalInstallments,
    theoreticalCoverageLimit,
    appliedFgtsAmount,
    remainingClientAmount,
    effectiveCoveragePercent,
    unusedFgtsBalance
  };
}

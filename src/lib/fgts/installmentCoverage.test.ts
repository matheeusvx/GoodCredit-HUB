import { describe, expect, it } from "vitest";
import {
  calculateInstallmentCoverage,
  MAXIMUM_INSTALLMENT_COVERAGE_PERCENT
} from "./installmentCoverage";

describe("pagamento de parte das prestações com FGTS", () => {
  it("cenário A: usa todo o saldo quando ele é inferior ao limite", () => {
    const result = calculateInstallmentCoverage({
      installmentAmount: 1200,
      installmentCount: 12,
      coveragePercent: 80,
      availableFgtsBalance: 4500
    });

    expect(result.totalInstallments).toBe(14400);
    expect(result.theoreticalCoverageLimit).toBe(11520);
    expect(result.appliedFgtsAmount).toBe(4500);
    expect(result.remainingClientAmount).toBe(9900);
    expect(result.effectiveCoveragePercent).toBeCloseTo(0.3125);
    expect(result.unusedFgtsBalance).toBe(0);
  });

  it("cenário B: limita o FGTS quando o saldo supera a cobertura", () => {
    const result = calculateInstallmentCoverage({
      installmentAmount: 1200,
      installmentCount: 12,
      coveragePercent: 80,
      availableFgtsBalance: 15000
    });

    expect(result.appliedFgtsAmount).toBe(11520);
    expect(result.remainingClientAmount).toBe(2880);
    expect(result.effectiveCoveragePercent).toBeCloseTo(0.8);
    expect(result.unusedFgtsBalance).toBe(3480);
  });

  it("cenário C: respeita uma cobertura inferior a 80%", () => {
    const result = calculateInstallmentCoverage({
      installmentAmount: 1000,
      installmentCount: 10,
      coveragePercent: 50,
      availableFgtsBalance: 8000
    });

    expect(result.totalInstallments).toBe(10000);
    expect(result.theoreticalCoverageLimit).toBe(5000);
    expect(result.appliedFgtsAmount).toBe(5000);
    expect(result.remainingClientAmount).toBe(5000);
    expect(result.effectiveCoveragePercent).toBeCloseTo(0.5);
    expect(result.unusedFgtsBalance).toBe(3000);
  });

  it("cenário D: limita matematicamente coberturas superiores a 80%", () => {
    const result = calculateInstallmentCoverage({
      installmentAmount: 1000,
      installmentCount: 10,
      coveragePercent: 90,
      availableFgtsBalance: 10000
    });

    expect(MAXIMUM_INSTALLMENT_COVERAGE_PERCENT).toBe(80);
    expect(result.theoreticalCoverageLimit).toBe(8000);
  });

  it("cenário E: não produz valores inválidos com prestação zerada", () => {
    const result = calculateInstallmentCoverage({
      installmentAmount: 0,
      installmentCount: 12,
      coveragePercent: 80,
      availableFgtsBalance: 4500
    });

    expect(result.totalInstallments).toBe(0);
    expect(result.effectiveCoveragePercent).toBe(0);
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
    expect(Object.values(result).every((value) => value >= 0)).toBe(true);
  });
});

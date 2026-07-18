import { describe, expect, it } from "vitest";
import type { FgtsEligibilityForm, FgtsIncomeForm, FgtsProjectionForm } from "../../types/fgts";
import { parseCurrencyBRL } from "./currency";
import { evaluateFgtsEligibility } from "./eligibilityEngine";
import { compareIncomeSources } from "./incomeComparison";
import { projectFgtsContributions } from "./projectionEngine";

const baseIncome: FgtsIncomeForm = {
  payslipCompetence: "2026-06",
  payslipGross: 4_800,
  depositCompetence: "2026-06",
  monthlyDeposit: 400,
  employmentType: "REGULAR",
  contributionRate: 0.08,
  criterion: "HIGHEST",
  manualIncome: 0,
  regularMonthlyDeposit: true,
  sameCompetence: true,
  notThirteenthSalary: true,
  notVacationPayment: true,
  notRetroactiveAdjustment: true,
  notAccumulatedPayment: true,
  rateConfirmed: true,
};

const baseEligibility: FgtsEligibilityForm = {
  employmentThreeYears: "YES",
  activeSfhFinancing: "NO",
  ownsHomeResidenceCity: "NO",
  ownsHomeWorkCity: "NO",
  ownsHomeNearbyCity: "NO",
  ownsHomeOtherState: "NO",
  otherStateHomePaid: "UNKNOWN",
  ownHousingPurpose: "YES",
  contractEligible: "YES",
  usageMode: "ACQUISITION",
  installmentsCurrent: "NOT_APPLICABLE",
};

describe("comparação de renda pelo FGTS", () => {
  it("cenário A: recomenda FGTS quando a estimativa é maior", () => {
    const result = compareIncomeSources(baseIncome);
    expect(result.estimatedIncome).toBe(5_000);
    expect(result.consideredIncome).toBe(5_000);
    expect(result.recommendedOption).toBe("FGTS");
  });

  it("cenário B: recomenda holerite quando seu valor é maior", () => {
    const result = compareIncomeSources({ ...baseIncome, payslipGross: 5_500 });
    expect(result.consideredIncome).toBe(5_500);
    expect(result.recommendedOption).toBe("PAYSLIP");
  });

  it("cenário C: bloqueia recomendação com competências diferentes", () => {
    const result = compareIncomeSources({ ...baseIncome, depositCompetence: "2026-05" });
    expect(result.status).toBe("COMPETENCES_DIVERGENT");
    expect(result.recommendedOption).toBe("PENDING_VALIDATION");
    expect(result.recommendedOptionLabel).toBe("Aguardando correção das competências");
  });

  it("cenário D: não escolhe silenciosamente em caso de empate", () => {
    const result = compareIncomeSources({ ...baseIncome, payslipGross: 5_000 });
    expect(result.recommendedOption).toBe("EQUIVALENT");
    expect(result.recommendedOptionLabel).toBe("Valores equivalentes — revisão operacional");
  });

  it("cenário E: depósito atípico exige revisão", () => {
    const result = compareIncomeSources({ ...baseIncome, notThirteenthSalary: false });
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.recommendedOption).toBe("PENDING_VALIDATION");
    expect(result.warnings.join(" ")).toContain("pode não representar uma competência mensal regular");
  });
});

describe("triagem de imóvel em outro estado", () => {
  it("cenário F: imóvel quitado necessita confirmação", () => {
    const result = evaluateFgtsEligibility({ ...baseEligibility, ownsHomeOtherState: "YES", otherStateHomePaid: "YES" });
    expect(result.status).toBe("NEEDS_CONFIRMATION");
    expect(result.messages.join(" ")).toContain("poderá seguir para análise");
  });

  it("cenário G: imóvel não quitado indica possível impedimento", () => {
    const result = evaluateFgtsEligibility({ ...baseEligibility, ownsHomeOtherState: "YES", otherStateHomePaid: "NO" });
    expect(result.status).toBe("POSSIBLE_BARRIER");
    expect(result.messages.join(" ")).toContain("não está quitado");
  });
});

describe("periodicidade e entradas do módulo FGTS", () => {
  it("cenário H: mantém os eventos em intervalos fixos de 24 meses", () => {
    const form: FgtsProjectionForm = { contractDate: "", lastUsageDate: "", neverUsed: true, currentBalance: 0, monthlyDeposit: 0, remainingTermMonths: 72, firstContributionMonth: 24, periodicityMonths: 12, contributionMode: "FIXED", fixedAmount: 1_000 };
    expect(projectFgtsContributions(form).events.map((event) => event.month)).toEqual([24, 48, 72]);
  });

  it("aceita os formatos monetários brasileiros previstos", () => {
    expect(parseCurrencyBRL("4800")).toBe(4_800);
    expect(parseCurrencyBRL("4800,00")).toBe(4_800);
    expect(parseCurrencyBRL("4.800,00")).toBe(4_800);
    expect(parseCurrencyBRL("R$ 4.800,00")).toBe(4_800);
  });
});

import { describe, expect, it } from "vitest";
import { ProSolutoForm } from "../../types/proSoluto";
import { calculateProSoluto, validateProSolutoForm } from "./proSolutoCalculator";
import { MAX_FINANCEABLE_PERCENT } from "./proSolutoConstants";

const baseForm: ProSolutoForm = {
  clientName: "",
  sellerReceivableAmount: 270000,
  appraisalValue: 250000,
  financeablePercent: 0.8,
  approvedCreditAmount: 220000,
  creditNotApprovedYet: false,
  fgtsAmount: 28000,
  paidEntryAmount: 0
};

describe("calculateProSoluto", () => {
  it("cenário A: limita o crédito pela avaliação e calcula R$ 42 mil de pró-soluto", () => {
    const result = calculateProSoluto(baseForm);

    expect(result.appraisalFinancingLimit).toBe(200000);
    expect(result.financingConsidered).toBe(200000);
    expect(result.totalAvailableResources).toBe(228000);
    expect(result.proSoluto).toBe(42000);
  });

  it("cenário B: calcula R$ 70 mil sem FGTS", () => {
    const result = calculateProSoluto({ ...baseForm, fgtsAmount: 0 });

    expect(result.totalAvailableResources).toBe(200000);
    expect(result.proSoluto).toBe(70000);
  });

  it("cenário C: desconta FGTS e entrada já paga uma única vez", () => {
    const result = calculateProSoluto({ ...baseForm, paidEntryAmount: 10000 });

    expect(result.totalAvailableResources).toBe(238000);
    expect(result.proSoluto).toBe(32000);
  });

  it("cenário D: usa o crédito aprovado quando ele é inferior ao limite", () => {
    const result = calculateProSoluto({ ...baseForm, approvedCreditAmount: 180000 });

    expect(result.financingConsidered).toBe(180000);
    expect(result.approvedCreditShortfall).toBe(20000);
    expect(result.warnings.some((warning) => warning.code === "APPROVED_BELOW_LIMIT")).toBe(true);
  });

  it("cenário E: limita o crédito aprovado acima do limite", () => {
    const result = calculateProSoluto({ ...baseForm, approvedCreditAmount: 240000 });

    expect(result.financingConsidered).toBe(200000);
    expect(result.approvedCreditExcess).toBe(40000);
    expect(result.warnings.some((warning) => warning.code === "APPROVED_ABOVE_LIMIT")).toBe(true);
  });

  it("cenário F: usa o limite como estimativa quando o crédito ainda não foi aprovado", () => {
    const result = calculateProSoluto({
      ...baseForm,
      approvedCreditAmount: null,
      creditNotApprovedYet: true
    });

    expect(result.financingConsidered).toBe(200000);
    expect(result.financingIsEstimated).toBe(true);
    expect(result.warnings.some((warning) => warning.code === "ESTIMATED_FINANCING")).toBe(true);
  });

  it("cenário G: mantém pró-soluto em zero e separa o excedente", () => {
    const result = calculateProSoluto({
      ...baseForm,
      sellerReceivableAmount: 200000,
      appraisalValue: 225000,
      approvedCreditAmount: 180000,
      fgtsAmount: 30000,
      paidEntryAmount: 10000
    });

    expect(result.totalAvailableResources).toBe(220000);
    expect(result.proSoluto).toBe(0);
    expect(result.surplusResources).toBe(20000);
    expect(result.status).toBe("SURPLUS_RESOURCES");
    expect(result.warnings.some((warning) => warning.code === "FGTS_ABOVE_NEEDED")).toBe(true);
  });

  it("cenário H: retorna estado incompleto e nunca produz NaN", () => {
    const invalid = { ...baseForm, sellerReceivableAmount: 0 };
    const result = calculateProSoluto(invalid);

    expect(validateProSolutoForm(invalid)).toContain(
      "Informe o valor que o vendedor precisa receber, maior que zero."
    );
    expect(result.status).toBe("INCOMPLETE");
    expect(result.proSoluto).toBe(0);
    expect(Number.isNaN(result.appraisalFinancingLimit)).toBe(false);
    expect(Number.isNaN(result.uncoveredPercent)).toBe(false);
  });

  it("não limita o financiamento pela CCV quando a avaliação é superior", () => {
    const result = calculateProSoluto({
      ...baseForm,
      sellerReceivableAmount: 200000,
      appraisalValue: 300000,
      approvedCreditAmount: 240000,
      fgtsAmount: 0
    });

    expect(result.appraisalFinancingLimit).toBe(240000);
    expect(result.financingConsidered).toBe(240000);
    expect(result.surplusResources).toBe(40000);
  });

  it("aceita o limite máximo de 80% e calcula R$ 200 mil sobre a avaliação", () => {
    const result = calculateProSoluto({
      ...baseForm,
      appraisalValue: 250000,
      financeablePercent: MAX_FINANCEABLE_PERCENT / 100
    });

    expect(result.status).not.toBe("INCOMPLETE");
    expect(result.validatedFinanceablePercent).toBe(0.8);
    expect(result.appraisalFinancingLimit).toBe(200000);
  });

  it("aceita 75% e calcula R$ 187,5 mil sobre a avaliação", () => {
    const result = calculateProSoluto({
      ...baseForm,
      appraisalValue: 250000,
      financeablePercent: 0.75,
      approvedCreditAmount: 180000
    });

    expect(result.status).not.toBe("INCOMPLETE");
    expect(result.validatedFinanceablePercent).toBe(0.75);
    expect(result.appraisalFinancingLimit).toBe(187500);
  });

  it.each([0.8001, 0.9, 1])(
    "bloqueia o cálculo com percentual acima de 80%%: %s",
    (financeablePercent) => {
      const input = { ...baseForm, financeablePercent };
      const result = calculateProSoluto(input);

      expect(validateProSolutoForm(input)).toContain(
        "O percentual máximo financiável permitido é de 80%."
      );
      expect(result.status).toBe("INCOMPLETE");
      expect(result.validatedFinanceablePercent).toBe(0.8);
      expect(result.appraisalFinancingLimit).toBe(200000);
      expect(result.financingConsidered).toBe(0);
      expect(result.warnings.some((warning) => warning.code === "PERCENT_ABOVE_MAX")).toBe(true);
    }
  );

  it.each([0, Number.NaN, Number.POSITIVE_INFINITY])(
    "bloqueia percentual não positivo ou não finito: %s",
    (financeablePercent) => {
      const result = calculateProSoluto({ ...baseForm, financeablePercent });

      expect(result.status).toBe("INCOMPLETE");
      expect(result.financingConsidered).toBe(0);
      expect(Number.isFinite(result.appraisalFinancingLimit)).toBe(true);
    }
  );
});

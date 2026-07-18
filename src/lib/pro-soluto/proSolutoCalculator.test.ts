import { describe, expect, it } from "vitest";
import { ProSolutoForm } from "../../types/proSoluto";
import { calculateProSoluto } from "./proSolutoCalculator";

const baseForm: ProSolutoForm = {
  clientName: "",
  purchasePrice: 300000,
  appraisalValue: null,
  financeablePercent: null,
  approvedFinancing: 220000,
  useEstimatedFinancing: false,
  fgtsAmount: 0,
  subsidyAmount: 0,
  paidEntryAmount: 0,
  otherOwnResources: 0
};

describe("calculateProSoluto", () => {
  it("calcula o exemplo simples com recursos complementares", () => {
    const result = calculateProSoluto({
      ...baseForm,
      fgtsAmount: 25000,
      subsidyAmount: 5000,
      paidEntryAmount: 10000
    });
    expect(result.proSoluto).toBe(40000);
    expect(result.totalCovered).toBe(260000);
    expect(result.status).toBe("HAS_PRO_SOLUTO");
  });

  it("usa a avaliação menor e estima o financiamento pelo percentual", () => {
    const result = calculateProSoluto({
      ...baseForm,
      appraisalValue: 280000,
      financeablePercent: 0.8,
      approvedFinancing: null,
      useEstimatedFinancing: true,
      fgtsAmount: 20000,
      paidEntryAmount: 10000
    });
    expect(result.financingBase).toBe(280000);
    expect(result.financingLimit).toBe(224000);
    expect(result.financingConsidered).toBe(224000);
    expect(result.proSoluto).toBe(46000);
    expect(result.financingIsEstimated).toBe(true);
  });

  it("limita a base ao valor de compra quando a avaliação é maior", () => {
    const result = calculateProSoluto({
      ...baseForm,
      appraisalValue: 320000,
      financeablePercent: 0.8
    });
    expect(result.financingBase).toBe(300000);
    expect(result.financingLimit).toBe(240000);
  });

  it("mantém o aprovado quando ele é menor que o limite", () => {
    const result = calculateProSoluto({ ...baseForm, financeablePercent: 0.8 });
    expect(result.financingConsidered).toBe(220000);
  });

  it("limita o aprovado acima do limite e gera alerta", () => {
    const result = calculateProSoluto({
      ...baseForm,
      appraisalValue: 280000,
      financeablePercent: 0.8,
      approvedFinancing: 240000
    });
    expect(result.financingConsidered).toBe(224000);
    expect(result.approvedFinancingExcess).toBe(16000);
    expect(result.warnings.some((warning) => warning.code === "APPROVED_ABOVE_LIMIT")).toBe(true);
  });

  it("não exibe pró-soluto negativo e separa recursos excedentes", () => {
    const result = calculateProSoluto({
      ...baseForm,
      purchasePrice: 200000,
      approvedFinancing: 170000,
      fgtsAmount: 20000,
      paidEntryAmount: 20000
    });
    expect(result.proSoluto).toBe(0);
    expect(result.surplusResources).toBe(10000);
    expect(result.status).toBe("SURPLUS_RESOURCES");
  });

  it("retorna estado incompleto sem NaN quando falta o valor de compra", () => {
    const result = calculateProSoluto({ ...baseForm, purchasePrice: 0 });
    expect(result.status).toBe("INCOMPLETE");
    expect(result.proSoluto).toBe(0);
    expect(Number.isNaN(result.financingBase)).toBe(false);
    expect(Number.isNaN(result.uncoveredPercent)).toBe(false);
  });
});

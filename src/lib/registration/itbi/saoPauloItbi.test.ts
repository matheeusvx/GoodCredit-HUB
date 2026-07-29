import { describe, expect, it } from "vitest";
import {
  formatCurrencyBRL,
  parseCurrencyBRL,
} from "../../fgts/currency";
import {
  calculateSaoPauloBase,
  calculateSaoPauloBenefitedFinancing,
  calculateSaoPauloItbi,
  checkSaoPauloPotentialExemption,
} from "./saoPauloItbi";
import type {
  SaoPauloItbiInput,
  SaoPauloOperationType,
} from "./saoPauloItbi.types";

function input(
  patch: Partial<SaoPauloItbiInput> = {}
): SaoPauloItbiInput {
  return {
    purchasePrice: 500_000,
    referenceValue: 480_000,
    financedAmount: null,
    operationType: "CASH_PURCHASE",
    contractYear: 2026,
    isIndividualPerson: false,
    isExclusivelyResidential: false,
    isFirstPropertyAcquisition: false,
    isMinhaCasaMinhaVida: false,
    ...patch,
  };
}

describe("ITBI São Paulo 2026 - base de cálculo", () => {
  it("usa o CCV quando ele é maior que o VVR", () => {
    expect(calculateSaoPauloBase(500_000, 480_000)).toBe(500_000);
  });

  it("usa o VVR quando ele é maior que o CCV", () => {
    expect(calculateSaoPauloBase(500_000, 540_000)).toBe(540_000);
  });
});

describe("ITBI São Paulo 2026 - alíquota integral", () => {
  it("calcula compra sem financiamento a 3%", () => {
    const result = calculateSaoPauloItbi(input());
    expect(result).toMatchObject({
      status: "CALCULATED",
      baseCalculation: 500_000,
      ruleApplied: "GENERAL_RATE",
      regularTaxAmount: 15_000,
      totalTax: 15_000,
    });
  });

  it("calcula SFI a 3% sem parcela reduzida", () => {
    const result = calculateSaoPauloItbi(input({
      operationType: "SFI",
      financedAmount: 400_000,
    }));
    expect(result).toMatchObject({
      ruleApplied: "GENERAL_RATE",
      benefitedFinancing: 0,
      regularTaxBase: 500_000,
      totalTax: 15_000,
    });
  });
});

describe("ITBI São Paulo 2026 - benefício de financiamento", () => {
  it("reproduz exatamente o exemplo de SFH de R$ 11.975,80", () => {
    const result = calculateSaoPauloItbi(input({
      operationType: "SFH",
      financedAmount: 400_000,
    }));
    expect(result).toMatchObject({
      status: "CALCULATED",
      ruleApplied: "REDUCED_FINANCING_RATE",
      benefitedFinancing: 120_968,
      reducedTaxAmount: 604.84,
      regularTaxBase: 379_032,
      regularTaxAmount: 11_370.96,
      totalTax: 11_975.80,
    });
  });

  it("usa somente o financiamento efetivo quando inferior ao limite", () => {
    const result = calculateSaoPauloItbi(input({
      operationType: "SFH",
      financedAmount: 80_000,
    }));
    expect(result).toMatchObject({
      benefitedFinancing: 80_000,
      reducedTaxAmount: 400,
      regularTaxBase: 420_000,
      regularTaxAmount: 12_600,
      totalTax: 13_000,
    });
  });

  it("aplica o benefício no limite exato do imóvel", () => {
    const result = calculateSaoPauloItbi(input({
      purchasePrice: 725_808,
      referenceValue: 700_000,
      operationType: "SFH",
      financedAmount: 300_000,
    }));
    expect(result.ruleApplied).toBe("REDUCED_FINANCING_RATE");
    expect(result.benefitedFinancing).toBe(120_968);
  });

  it("aplica 3% integral um centavo acima do limite", () => {
    const result = calculateSaoPauloItbi(input({
      purchasePrice: 725_808.01,
      referenceValue: 700_000,
      operationType: "SFH",
      financedAmount: 300_000,
    }));
    expect(result).toMatchObject({
      ruleApplied: "GENERAL_RATE",
      benefitedFinancing: 0,
      totalTax: 21_774.24,
    });
  });

  it.each<SaoPauloOperationType>(["PAR", "HIS", "CONSORTIUM"])(
    "aplica a fórmula reduzida para %s dentro do limite",
    (operationType) => {
      const result = calculateSaoPauloItbi(input({
        operationType,
        financedAmount: 400_000,
      }));
      expect(result.totalTax).toBe(11_975.80);
      expect(result.ruleApplied).toBe("REDUCED_FINANCING_RATE");
    }
  );

  it.each<SaoPauloOperationType>(["SFH", "PAR", "HIS", "CONSORTIUM"])(
    "aplica 3%% integral para %s acima do limite",
    (operationType) => {
      const result = calculateSaoPauloItbi(input({
        purchasePrice: 800_000,
        referenceValue: 780_000,
        operationType,
        financedAmount: 500_000,
      }));
      expect(result.totalTax).toBe(24_000);
      expect(result.ruleApplied).toBe("GENERAL_RATE");
    }
  );

  it("limita a parcela beneficiada à base e ao teto", () => {
    expect(calculateSaoPauloBenefitedFinancing(100_000, 150_000)).toBe(100_000);
    expect(calculateSaoPauloBenefitedFinancing(500_000, 400_000)).toBe(120_968);
  });
});

describe("ITBI São Paulo 2026 - possível isenção", () => {
  it("indica possível isenção no limite exato", () => {
    const result = calculateSaoPauloItbi(input({
      purchasePrice: 245_527.77,
      referenceValue: 240_000,
      isIndividualPerson: true,
      isExclusivelyResidential: true,
      isFirstPropertyAcquisition: true,
      isMinhaCasaMinhaVida: false,
    }));
    expect(result).toMatchObject({
      potentiallyExempt: true,
      exemptionStatus: "POTENTIALLY_EXEMPT",
      ruleApplied: "POTENTIAL_EXEMPTION",
      totalTax: 0,
      badge: "Possível isenção",
    });
  });

  it("não indica isenção um centavo acima do limite", () => {
    const result = calculateSaoPauloItbi(input({
      purchasePrice: 245_527.78,
      referenceValue: 240_000,
      isIndividualPerson: true,
      isExclusivelyResidential: true,
      isFirstPropertyAcquisition: true,
      isMinhaCasaMinhaVida: false,
    }));
    expect(result.potentiallyExempt).toBe(false);
    expect(result.totalTax).toBe(7_365.83);
  });

  it("não indica isenção para pessoa jurídica ou imóvel não residencial", () => {
    expect(checkSaoPauloPotentialExemption(input({
      purchasePrice: 200_000,
      referenceValue: 190_000,
      isIndividualPerson: false,
      isExclusivelyResidential: true,
      isFirstPropertyAcquisition: true,
      isMinhaCasaMinhaVida: false,
    })).potentiallyExempt).toBe(false);
    expect(checkSaoPauloPotentialExemption(input({
      purchasePrice: 200_000,
      referenceValue: 190_000,
      isIndividualPerson: true,
      isExclusivelyResidential: false,
      isFirstPropertyAcquisition: true,
      isMinhaCasaMinhaVida: false,
    })).potentiallyExempt).toBe(false);
  });

  it("aceita MCMV como condição alternativa à primeira aquisição", () => {
    const result = calculateSaoPauloItbi(input({
      purchasePrice: 200_000,
      referenceValue: 190_000,
      isIndividualPerson: true,
      isExclusivelyResidential: true,
      isFirstPropertyAcquisition: false,
      isMinhaCasaMinhaVida: true,
    }));
    expect(result.potentiallyExempt).toBe(true);
    expect(result.totalTax).toBe(0);
  });

  it("não indica isenção sem primeira aquisição nem MCMV", () => {
    const result = calculateSaoPauloItbi(input({
      purchasePrice: 200_000,
      referenceValue: 190_000,
      isIndividualPerson: true,
      isExclusivelyResidential: true,
      isFirstPropertyAcquisition: false,
      isMinhaCasaMinhaVida: false,
    }));
    expect(result.potentiallyExempt).toBe(false);
    expect(result.totalTax).toBe(6_000);
  });

  it("mantém o cálculo normal e informa quando as respostas estão incompletas", () => {
    const result = calculateSaoPauloItbi(input({
      isIndividualPerson: null,
      isExclusivelyResidential: null,
      isFirstPropertyAcquisition: null,
      isMinhaCasaMinhaVida: null,
    }));
    expect(result.totalTax).toBe(15_000);
    expect(result.exemptionStatus).toBe("INCOMPLETE");
    expect(result.warnings.join(" ")).toContain("Preencha");
  });
});

describe("ITBI São Paulo 2026 - validações", () => {
  it.each([
    { purchasePrice: 0 },
    { purchasePrice: -1 },
    { purchasePrice: Number.NaN },
    { referenceValue: 0 },
    { referenceValue: Number.POSITIVE_INFINITY },
  ])("rejeita valores inválidos", (patch) => {
    const result = calculateSaoPauloItbi(input(patch));
    expect(result.status).toBe("INVALID_INPUT");
    expect(result.totalTax).toBeNull();
  });

  it("exige financiamento nas modalidades financiadas", () => {
    const result = calculateSaoPauloItbi(input({
      operationType: "SFH",
      financedAmount: null,
    }));
    expect(result.status).toBe("INVALID_INPUT");
    expect(result.totalTax).toBeNull();
  });

  it("bloqueia financiamento superior à base", () => {
    const result = calculateSaoPauloItbi(input({
      operationType: "SFH",
      financedAmount: 500_000.01,
    }));
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.totalTax).toBeNull();
    expect(result.warnings.join(" ")).toContain("superior à base");
  });

  it("rejeita ano diferente de 2026 mesmo por chamada interna inválida", () => {
    const result = calculateSaoPauloItbi(input({
      contractYear: 2027 as 2026,
    }));
    expect(result.status).toBe("INVALID_INPUT");
    expect(result.errors.join(" ")).toContain("2026");
  });

  it("normaliza e formata valores monetários no padrão brasileiro", () => {
    expect(parseCurrencyBRL("500000")).toBe(500_000);
    expect(parseCurrencyBRL("500000,00")).toBe(500_000);
    expect(parseCurrencyBRL("500.000")).toBe(500_000);
    expect(parseCurrencyBRL("500.000,00")).toBe(500_000);
    expect(parseCurrencyBRL("R$ 500.000,00")).toBe(500_000);
    expect(formatCurrencyBRL(500_000)).toBe("R$ 500.000,00");
  });
});

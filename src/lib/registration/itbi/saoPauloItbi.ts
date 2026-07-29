import {
  SAO_PAULO_2026_BENEFIT_PROPERTY_LIMIT,
  SAO_PAULO_2026_FIRST_PROPERTY_EXEMPTION_LIMIT,
  SAO_PAULO_2026_REDUCED_BASE_LIMIT,
  SAO_PAULO_ITBI_GENERAL_RATE,
  SAO_PAULO_ITBI_REDUCED_RATE,
  SAO_PAULO_ITBI_RULE_YEAR,
} from "./saoPauloItbi.constants";
import type {
  SaoPauloItbiInput,
  SaoPauloItbiResult,
  SaoPauloOperationType,
  SaoPauloPotentialExemptionResult,
} from "./saoPauloItbi.types";

const REDUCED_OPERATION_TYPES = new Set<SaoPauloOperationType>([
  "SFH",
  "PAR",
  "HIS",
  "CONSORTIUM",
]);

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(value: number): number {
  return value / 100;
}

function calculateTaxInCents(baseInCents: number, rate: number): number {
  return Math.round(baseInCents * rate);
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function formatRuleCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function calculateSaoPauloBase(
  purchasePrice: number,
  referenceValue: number
): number {
  if (!isPositiveFinite(purchasePrice) || !isPositiveFinite(referenceValue)) return 0;
  return fromCents(Math.max(toCents(purchasePrice), toCents(referenceValue)));
}

export function checkSaoPauloPotentialExemption(
  input: SaoPauloItbiInput,
  baseCalculation = calculateSaoPauloBase(input.purchasePrice, input.referenceValue)
): SaoPauloPotentialExemptionResult {
  const answers = [
    input.isIndividualPerson,
    input.isExclusivelyResidential,
    input.isFirstPropertyAcquisition,
    input.isMinhaCasaMinhaVida,
  ];
  if (answers.some((answer) => answer === null)) {
    return {
      potentiallyExempt: false,
      status: "INCOMPLETE",
      message: "Preencha as informações sobre a possível isenção para verificar o enquadramento.",
    };
  }

  const potentiallyExempt = Boolean(
    baseCalculation > 0
      && input.isIndividualPerson
      && input.isExclusivelyResidential
      && baseCalculation <= SAO_PAULO_2026_FIRST_PROPERTY_EXEMPTION_LIMIT
      && (input.isFirstPropertyAcquisition || input.isMinhaCasaMinhaVida)
  );
  return potentiallyExempt
    ? {
      potentiallyExempt: true,
      status: "POTENTIALLY_EXEMPT",
      message: "Operação potencialmente elegível à isenção.",
    }
    : {
      potentiallyExempt: false,
      status: "NOT_ELIGIBLE",
      message: "Os dados informados não atendem a todos os critérios básicos da possível isenção.",
    };
}

export function calculateSaoPauloBenefitedFinancing(
  baseCalculation: number,
  financedAmount: number
): number {
  if (!isPositiveFinite(baseCalculation) || !isPositiveFinite(financedAmount)) return 0;
  return fromCents(Math.min(
    toCents(baseCalculation),
    toCents(financedAmount),
    toCents(SAO_PAULO_2026_REDUCED_BASE_LIMIT)
  ));
}

function invalidResult(
  input: SaoPauloItbiInput,
  baseCalculation: number,
  errors: string[],
  warnings: string[] = []
): SaoPauloItbiResult {
  const exemption = checkSaoPauloPotentialExemption(input, baseCalculation);
  return {
    status: warnings.length ? "REVIEW_REQUIRED" : "INVALID_INPUT",
    city: "SAO_PAULO",
    ruleYear: SAO_PAULO_ITBI_RULE_YEAR,
    operationType: input.operationType,
    purchasePrice: Number.isFinite(input.purchasePrice) ? input.purchasePrice : 0,
    referenceValue: Number.isFinite(input.referenceValue) ? input.referenceValue : 0,
    baseCalculation,
    financedAmount: input.financedAmount,
    benefitedFinancing: 0,
    reducedTaxAmount: 0,
    regularTaxBase: baseCalculation,
    regularTaxAmount: 0,
    totalTax: null,
    potentiallyExempt: false,
    exemptionStatus: exemption.status,
    exemptionMessage: exemption.message,
    ruleApplied: null,
    badge: "Revisão necessária",
    explanation: "",
    warnings,
    errors,
  };
}

export function formatSaoPauloItbiExplanation(
  result: Pick<
    SaoPauloItbiResult,
    "ruleApplied" | "baseCalculation" | "operationType"
  >
): string {
  if (result.ruleApplied === "POTENTIAL_EXEMPTION") {
    return "Os dados informados indicam possível enquadramento na isenção para aquisição residencial por pessoa física. O benefício deve ser confirmado conforme os procedimentos do Município de São Paulo.";
  }
  if (result.ruleApplied === "REDUCED_FINANCING_RATE") {
    return `O imóvel está dentro do limite de ${formatRuleCurrency(SAO_PAULO_2026_BENEFIT_PROPERTY_LIMIT)} previsto para 2026. A alíquota de 0,5% foi aplicada sobre o valor financiado, limitada a ${formatRuleCurrency(SAO_PAULO_2026_REDUCED_BASE_LIMIT)}. Sobre o restante da base de cálculo foi aplicada a alíquota de 3%.`;
  }
  if (
    REDUCED_OPERATION_TYPES.has(result.operationType)
    && result.baseCalculation > SAO_PAULO_2026_BENEFIT_PROPERTY_LIMIT
  ) {
    return `A base de cálculo ultrapassa ${formatRuleCurrency(SAO_PAULO_2026_BENEFIT_PROPERTY_LIMIT)}. Por isso, o benefício da alíquota reduzida não foi aplicado.`;
  }
  return "A operação não possui o benefício da alíquota reduzida. Foi aplicada a alíquota integral de 3% sobre toda a base de cálculo.";
}

export function calculateSaoPauloItbi(
  input: SaoPauloItbiInput
): SaoPauloItbiResult {
  const errors: string[] = [];
  if (input.contractYear !== SAO_PAULO_ITBI_RULE_YEAR) {
    errors.push("Esta configuração contempla somente contratos celebrados em 2026.");
  }
  if (!isPositiveFinite(input.purchasePrice)) {
    errors.push("O valor da compra e venda precisa ser maior que zero.");
  }
  if (!isPositiveFinite(input.referenceValue)) {
    errors.push("O Valor Venal de Referência precisa ser maior que zero.");
  }

  const baseCalculation = calculateSaoPauloBase(
    input.purchasePrice,
    input.referenceValue
  );
  const requiresFinancing = input.operationType !== "CASH_PURCHASE";
  if (
    requiresFinancing
    && (input.financedAmount === null || !isPositiveFinite(input.financedAmount))
  ) {
    errors.push("Informe o valor efetivamente financiado ou o crédito utilizado.");
  }
  if (
    input.financedAmount !== null
    && (!Number.isFinite(input.financedAmount) || input.financedAmount < 0)
  ) {
    errors.push("O valor financiado precisa ser válido e não pode ser negativo.");
  }
  if (errors.length) return invalidResult(input, baseCalculation, errors);

  if (
    requiresFinancing
    && input.financedAmount !== null
    && toCents(input.financedAmount) > toCents(baseCalculation)
  ) {
    return invalidResult(
      input,
      baseCalculation,
      [],
      ["O valor financiado informado é superior à base de cálculo. Revise os valores da operação."]
    );
  }

  const exemption = checkSaoPauloPotentialExemption(input, baseCalculation);
  if (exemption.potentiallyExempt) {
    const result: SaoPauloItbiResult = {
      status: "CALCULATED",
      city: "SAO_PAULO",
      ruleYear: SAO_PAULO_ITBI_RULE_YEAR,
      operationType: input.operationType,
      purchasePrice: input.purchasePrice,
      referenceValue: input.referenceValue,
      baseCalculation,
      financedAmount: requiresFinancing ? input.financedAmount : null,
      benefitedFinancing: 0,
      reducedTaxAmount: 0,
      regularTaxBase: 0,
      regularTaxAmount: 0,
      totalTax: 0,
      potentiallyExempt: true,
      exemptionStatus: exemption.status,
      exemptionMessage: exemption.message,
      ruleApplied: "POTENTIAL_EXEMPTION",
      badge: "Possível isenção",
      explanation: "",
      warnings: [
        "A isenção depende do enquadramento legal da operação e da declaração ou documentação exigida pelo Município de São Paulo. Confirme o benefício antes da emissão da guia e do registro.",
      ],
      errors: [],
    };
    return { ...result, explanation: formatSaoPauloItbiExplanation(result) };
  }

  const baseInCents = toCents(baseCalculation);
  const appliesReducedRate = REDUCED_OPERATION_TYPES.has(input.operationType)
    && baseCalculation <= SAO_PAULO_2026_BENEFIT_PROPERTY_LIMIT;
  const benefitedFinancing = appliesReducedRate
    ? calculateSaoPauloBenefitedFinancing(
      baseCalculation,
      input.financedAmount || 0
    )
    : 0;
  const benefitedInCents = toCents(benefitedFinancing);
  const regularBaseInCents = baseInCents - benefitedInCents;
  const reducedTaxInCents = calculateTaxInCents(
    benefitedInCents,
    SAO_PAULO_ITBI_REDUCED_RATE
  );
  const regularTaxInCents = calculateTaxInCents(
    regularBaseInCents,
    SAO_PAULO_ITBI_GENERAL_RATE
  );
  const result: SaoPauloItbiResult = {
    status: "CALCULATED",
    city: "SAO_PAULO",
    ruleYear: SAO_PAULO_ITBI_RULE_YEAR,
    operationType: input.operationType,
    purchasePrice: input.purchasePrice,
    referenceValue: input.referenceValue,
    baseCalculation,
    financedAmount: requiresFinancing ? input.financedAmount : null,
    benefitedFinancing,
    reducedTaxAmount: fromCents(reducedTaxInCents),
    regularTaxBase: fromCents(regularBaseInCents),
    regularTaxAmount: fromCents(regularTaxInCents),
    totalTax: fromCents(reducedTaxInCents + regularTaxInCents),
    potentiallyExempt: false,
    exemptionStatus: exemption.status,
    exemptionMessage: exemption.message,
    ruleApplied: appliesReducedRate
      ? "REDUCED_FINANCING_RATE"
      : "GENERAL_RATE",
    badge: appliesReducedRate
      ? "Benefício SFH/PAR/HIS/Consórcio"
      : REDUCED_OPERATION_TYPES.has(input.operationType)
        ? "Benefício não aplicável"
        : "Alíquota integral de 3%",
    explanation: "",
    warnings: exemption.status === "INCOMPLETE"
      ? [exemption.message]
      : [],
    errors: [],
  };
  return { ...result, explanation: formatSaoPauloItbiExplanation(result) };
}

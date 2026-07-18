import {
  ProSolutoAlert,
  ProSolutoCalculationResult,
  ProSolutoForm,
  ProSolutoStatus
} from "../../types/proSoluto";

const CENT = 0.01;

function safeMoney(value: number | null | undefined): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0;
}

function validPercent(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0 && value <= 1;
}

export function validateProSolutoForm(input: ProSolutoForm): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(input.purchasePrice) || input.purchasePrice <= 0) {
    errors.push("Informe um valor de compra maior que zero.");
  }
  if (input.appraisalValue !== null && (!Number.isFinite(input.appraisalValue) || input.appraisalValue < 0)) {
    errors.push("O valor de avaliação não pode ser negativo.");
  }
  if (input.financeablePercent !== null && !validPercent(input.financeablePercent)) {
    errors.push("O percentual financiável deve ser maior que 0% e menor ou igual a 100%.");
  }
  if (input.useEstimatedFinancing && !validPercent(input.financeablePercent)) {
    errors.push("Informe o percentual financiável para estimar o financiamento.");
  }
  if (!input.useEstimatedFinancing && safeMoney(input.approvedFinancing) <= 0) {
    errors.push("Informe o financiamento aprovado ou marque que ele ainda não foi aprovado.");
  }
  return errors;
}

export function calculateProSoluto(input: ProSolutoForm): ProSolutoCalculationResult {
  const purchasePrice = safeMoney(input.purchasePrice);
  const appraisalValue = safeMoney(input.appraisalValue);
  const approvedFinancing = safeMoney(input.approvedFinancing);
  const hasPurchasePrice = purchasePrice > 0;
  const hasAppraisal = appraisalValue > 0;
  const hasValidPercent = validPercent(input.financeablePercent);
  const financeablePercent = hasValidPercent ? Number(input.financeablePercent) : 0;

  const financingBase = hasPurchasePrice
    ? hasAppraisal
      ? Math.min(purchasePrice, appraisalValue)
      : purchasePrice
    : 0;
  const financingLimit = hasPurchasePrice && hasValidPercent
    ? financingBase * financeablePercent
    : null;

  let financingConsidered = 0;
  let financingSource: ProSolutoCalculationResult["financingSource"] = "UNAVAILABLE";
  if (input.useEstimatedFinancing && financingLimit !== null) {
    financingConsidered = financingLimit;
    financingSource = "ESTIMATED";
  } else if (!input.useEstimatedFinancing && approvedFinancing > 0) {
    financingConsidered = financingLimit === null
      ? approvedFinancing
      : Math.min(approvedFinancing, financingLimit);
    financingSource = "APPROVED";
  }

  const complementaryResources =
    safeMoney(input.fgtsAmount) +
    safeMoney(input.subsidyAmount) +
    safeMoney(input.paidEntryAmount) +
    safeMoney(input.otherOwnResources);
  const calculationComplete = hasPurchasePrice && financingSource !== "UNAVAILABLE";
  const totalCovered = calculationComplete ? financingConsidered + complementaryResources : 0;
  const rawProSoluto = calculationComplete ? purchasePrice - totalCovered : 0;
  const proSoluto = calculationComplete ? Math.max(0, rawProSoluto) : 0;
  const surplusResources = calculationComplete ? Math.max(0, -rawProSoluto) : 0;
  const uncoveredPercent = calculationComplete && purchasePrice > 0 ? proSoluto / purchasePrice : 0;
  const approvedFinancingExcess = financingLimit !== null
    ? Math.max(0, approvedFinancing - financingLimit)
    : 0;

  let status: ProSolutoStatus = "INCOMPLETE";
  if (calculationComplete) {
    if (surplusResources >= CENT) status = "SURPLUS_RESOURCES";
    else if (proSoluto < CENT) status = "FULLY_COVERED";
    else status = "HAS_PRO_SOLUTO";
  }

  const warnings: ProSolutoAlert[] = [];
  if (!calculationComplete) {
    warnings.push({
      code: "INCOMPLETE",
      level: "warning",
      message: "Preencha o valor de compra e informe o financiamento aprovado ou os dados necessários para estimá-lo."
    });
  }
  if (hasPurchasePrice && hasAppraisal && appraisalValue < purchasePrice) {
    warnings.push({
      code: "APPRAISAL_BELOW_PURCHASE",
      level: "warning",
      message: "A avaliação é menor que o valor de compra. O limite financiável foi calculado sobre a avaliação."
    });
  }
  if (hasPurchasePrice && hasAppraisal && appraisalValue > purchasePrice) {
    warnings.push({
      code: "APPRAISAL_ABOVE_PURCHASE",
      level: "info",
      message: "A avaliação é maior que o valor de compra. A base financiável permanece limitada ao valor de compra."
    });
  }
  if (!input.useEstimatedFinancing && approvedFinancingExcess >= CENT) {
    warnings.push({
      code: "APPROVED_ABOVE_LIMIT",
      level: "danger",
      message: "O financiamento informado supera o limite estimado. O cálculo considerou apenas o limite financiável."
    });
  }
  if (financingSource === "ESTIMATED") {
    warnings.push({
      code: "ESTIMATED_FINANCING",
      level: "info",
      message: "O financiamento considerado é uma estimativa e não representa aprovação bancária."
    });
  }
  if (status === "HAS_PRO_SOLUTO") {
    warnings.push({
      code: "HAS_PRO_SOLUTO",
      level: "warning",
      message: "A composição informada ainda possui valor descoberto a ser negociado como pró-soluto."
    });
  }
  if (status === "FULLY_COVERED") {
    warnings.push({
      code: "FULLY_COVERED",
      level: "success",
      message: "Os recursos informados cobrem integralmente o valor de compra."
    });
  }
  if (status === "SURPLUS_RESOURCES") {
    warnings.push({
      code: "SURPLUS_RESOURCES",
      level: "info",
      message: "Os recursos informados excedem o valor de compra. Revise a composição para evitar dupla contagem."
    });
  }

  return {
    financingBase,
    financingLimit,
    financingConsidered,
    financingSource,
    financingIsEstimated: financingSource === "ESTIMATED",
    approvedFinancingExcess,
    complementaryResources,
    totalCovered,
    rawProSoluto,
    proSoluto,
    uncoveredPercent,
    surplusResources,
    status,
    warnings
  };
}

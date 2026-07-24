import {
  ProSolutoAlert,
  ProSolutoCalculationResult,
  ProSolutoForm,
  ProSolutoStatus
} from "../../types/proSoluto";
import {
  MAX_FINANCEABLE_PERCENT,
  MAX_FINANCEABLE_PERCENT_DECIMAL,
  clampFinanceablePercent
} from "./proSolutoConstants";

const CENT = 0.01;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function finiteOrZero(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function validateProSolutoForm(input: ProSolutoForm): string[] {
  const errors: string[] = [];

  if (!Number.isFinite(input.sellerReceivableAmount) || input.sellerReceivableAmount <= 0) {
    errors.push("Informe o valor que o vendedor precisa receber, maior que zero.");
  }
  if (!Number.isFinite(input.appraisalValue) || input.appraisalValue <= 0) {
    errors.push("Informe o valor de avaliação do imóvel, maior que zero.");
  }
  if (!Number.isFinite(input.financeablePercent) || input.financeablePercent <= 0) {
    errors.push("O percentual máximo financiável deve ser maior que 0%.");
  } else if (input.financeablePercent > MAX_FINANCEABLE_PERCENT_DECIMAL) {
    errors.push(`O percentual máximo financiável permitido é de ${MAX_FINANCEABLE_PERCENT}%.`);
  }
  if (
    !input.creditNotApprovedYet &&
    (!Number.isFinite(input.approvedCreditAmount) || Number(input.approvedCreditAmount) <= 0)
  ) {
    errors.push("Informe o crédito aprovado ou marque que ele ainda não foi aprovado.");
  }
  if (finiteOrZero(input.fgtsAmount) < 0) {
    errors.push("O valor de FGTS não pode ser negativo.");
  }
  if (finiteOrZero(input.paidEntryAmount) < 0) {
    errors.push("A entrada já paga não pode ser negativa.");
  }

  return errors;
}

export function calculateProSoluto(input: ProSolutoForm): ProSolutoCalculationResult {
  const validationErrors = validateProSolutoForm(input);
  const sellerReceivableAmount = Math.max(0, finiteOrZero(input.sellerReceivableAmount));
  const appraisalValue = Math.max(0, finiteOrZero(input.appraisalValue));
  const validatedFinanceablePercent = clampFinanceablePercent(input.financeablePercent);
  const approvedCreditAmount = Math.max(0, finiteOrZero(input.approvedCreditAmount));
  const fgtsAmount = Math.max(0, finiteOrZero(input.fgtsAmount));
  const paidEntryAmount = Math.max(0, finiteOrZero(input.paidEntryAmount));

  const appraisalFinancingLimit = roundMoney(appraisalValue * validatedFinanceablePercent);
  const calculationComplete = validationErrors.length === 0;

  let financingConsidered = 0;
  let financingSource: ProSolutoCalculationResult["financingSource"] = "UNAVAILABLE";

  if (calculationComplete && input.creditNotApprovedYet) {
    financingConsidered = appraisalFinancingLimit;
    financingSource = "ESTIMATED";
  } else if (calculationComplete) {
    financingConsidered = Math.min(approvedCreditAmount, appraisalFinancingLimit);
    financingSource = "APPROVED";
  }

  financingConsidered = roundMoney(financingConsidered);
  const totalAvailableResources = calculationComplete
    ? roundMoney(financingConsidered + fgtsAmount + paidEntryAmount)
    : 0;
  const rawProSoluto = calculationComplete
    ? roundMoney(sellerReceivableAmount - totalAvailableResources)
    : 0;
  const proSoluto = calculationComplete ? roundMoney(Math.max(0, rawProSoluto)) : 0;
  const surplusResources = calculationComplete ? roundMoney(Math.max(0, -rawProSoluto)) : 0;
  const uncoveredPercent = calculationComplete && sellerReceivableAmount > 0
    ? proSoluto / sellerReceivableAmount
    : 0;
  const approvedCreditExcess = calculationComplete && !input.creditNotApprovedYet
    ? roundMoney(Math.max(0, approvedCreditAmount - appraisalFinancingLimit))
    : 0;
  const approvedCreditShortfall = calculationComplete && !input.creditNotApprovedYet
    ? roundMoney(Math.max(0, appraisalFinancingLimit - approvedCreditAmount))
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
      message: "Preencha os dados obrigatórios para calcular a composição da operação."
    });
  }
  if (
    Number.isFinite(input.financeablePercent) &&
    input.financeablePercent > MAX_FINANCEABLE_PERCENT_DECIMAL
  ) {
    warnings.push({
      code: "PERCENT_ABOVE_MAX",
      level: "danger",
      message: `O percentual máximo financiável permitido é de ${MAX_FINANCEABLE_PERCENT}%.`
    });
  }
  if (calculationComplete && appraisalValue < sellerReceivableAmount) {
    warnings.push({
      code: "APPRAISAL_BELOW_CCV",
      level: "warning",
      message:
        "A avaliação do imóvel é inferior ao valor que o vendedor precisa receber. Isso reduz o limite estimado de financiamento e pode aumentar o pró-soluto."
    });
  }
  if (calculationComplete && appraisalValue > sellerReceivableAmount) {
    warnings.push({
      code: "APPRAISAL_ABOVE_CCV",
      level: "info",
      message:
        "A avaliação do imóvel é superior ao CCV. O limite foi calculado sobre a avaliação; confirme o percentual aplicável à operação."
    });
  }
  if (approvedCreditExcess >= CENT) {
    warnings.push({
      code: "APPROVED_ABOVE_LIMIT",
      level: "danger",
      message:
        "O crédito aprovado supera o limite calculado pela avaliação. Para esta composição, foi considerado somente o limite financiável."
    });
  }
  if (approvedCreditShortfall >= CENT) {
    warnings.push({
      code: "APPROVED_BELOW_LIMIT",
      level: "info",
      message:
        "O crédito aprovado é inferior ao limite calculado pela avaliação. A composição considerou o valor efetivamente aprovado."
    });
  }
  if (financingSource === "ESTIMATED") {
    warnings.push({
      code: "ESTIMATED_FINANCING",
      level: "warning",
      message:
        "O financiamento considerado é uma estimativa baseada na avaliação e no percentual informado. Ele não representa aprovação bancária."
    });
  }

  const fgtsNeededAfterFinancingAndEntry = Math.max(
    0,
    sellerReceivableAmount - financingConsidered - paidEntryAmount
  );
  if (
    calculationComplete &&
    fgtsAmount > fgtsNeededAfterFinancingAndEntry + CENT &&
    totalAvailableResources > sellerReceivableAmount + CENT
  ) {
    warnings.push({
      code: "FGTS_ABOVE_NEEDED",
      level: "warning",
      message:
        "O FGTS informado é superior ao necessário para completar o valor que o vendedor precisa receber. Revise o valor efetivamente utilizado."
    });
  }
  if (status === "HAS_PRO_SOLUTO") {
    warnings.push({
      code: "HAS_PRO_SOLUTO",
      level: "warning",
      message: "Ainda existe valor descoberto a ser pago com recursos próprios ao vendedor."
    });
  }
  if (status === "FULLY_COVERED") {
    warnings.push({
      code: "FULLY_COVERED",
      level: "success",
      message: "Os recursos informados cobrem exatamente o valor que o vendedor precisa receber."
    });
  }
  if (status === "SURPLUS_RESOURCES") {
    warnings.push({
      code: "SURPLUS_RESOURCES",
      level: "info",
      message:
        "Os recursos informados superam o valor que o vendedor precisa receber. O pró-soluto foi mantido em zero e o excedente foi exibido separadamente."
    });
  }

  return {
    validatedFinanceablePercent,
    appraisalFinancingLimit,
    financingConsidered,
    financingSource,
    financingIsEstimated: financingSource === "ESTIMATED",
    approvedCreditExcess,
    approvedCreditShortfall,
    totalAvailableResources,
    rawProSoluto,
    proSoluto,
    uncoveredPercent,
    surplusResources,
    status,
    warnings
  };
}

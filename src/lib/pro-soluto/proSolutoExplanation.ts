import { formatCurrencyBRL } from "../fgts/currency";
import { ProSolutoCalculationResult, ProSolutoExplanationStep, ProSolutoForm } from "../../types/proSoluto";

function formatPercent(value: number | null): string {
  if (value === null) return "não informado";
  return value.toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildProSolutoExplanation(
  form: ProSolutoForm,
  result: ProSolutoCalculationResult
): ProSolutoExplanationStep[] {
  const appraisal = form.appraisalValue && form.appraisalValue > 0
    ? formatCurrencyBRL(form.appraisalValue)
    : "não informada";
  const limitResult = result.financingLimit === null
    ? "Limite não calculado"
    : formatCurrencyBRL(result.financingLimit);
  const financingRule = result.financingSource === "ESTIMATED"
    ? "Como ainda não há aprovação, o limite calculado foi usado apenas como estimativa."
    : result.financingLimit === null
      ? "Sem limite calculado, foi utilizado o valor aprovado informado."
      : "Foi usado o menor valor entre o financiamento aprovado e o limite calculado.";

  return [
    {
      number: 1,
      title: "Definição da base financiável",
      description: "A base é o menor valor entre compra e avaliação. Sem avaliação, utiliza-se o valor de compra.",
      formula: "Base = menor entre valor de compra e avaliação",
      substitution: `menor entre ${formatCurrencyBRL(form.purchasePrice)} e ${appraisal}`,
      result: formatCurrencyBRL(result.financingBase)
    },
    {
      number: 2,
      title: "Cálculo do limite financiável",
      description: "O percentual informado é aplicado sobre a base financiável.",
      formula: "Limite = base financiável × percentual",
      substitution: `${formatCurrencyBRL(result.financingBase)} × ${formatPercent(form.financeablePercent)}`,
      result: limitResult
    },
    {
      number: 3,
      title: "Financiamento considerado",
      description: financingRule,
      formula: result.financingSource === "ESTIMATED"
        ? "Financiamento considerado = limite estimado"
        : "Financiamento considerado = menor entre aprovado e limite",
      substitution: result.financingSource === "UNAVAILABLE"
        ? "Dados insuficientes"
        : `${formatCurrencyBRL(form.approvedFinancing || 0)} e ${limitResult}`,
      result: formatCurrencyBRL(result.financingConsidered)
    },
    {
      number: 4,
      title: "Soma dos recursos complementares",
      description: "FGTS, subsídio, entrada já paga e outros recursos próprios são somados uma única vez.",
      formula: "Recursos = FGTS + subsídio + entrada + outros",
      substitution: `${formatCurrencyBRL(form.fgtsAmount)} + ${formatCurrencyBRL(form.subsidyAmount)} + ${formatCurrencyBRL(form.paidEntryAmount)} + ${formatCurrencyBRL(form.otherOwnResources)}`,
      result: formatCurrencyBRL(result.complementaryResources)
    },
    {
      number: 5,
      title: "Apuração do pró-soluto",
      description: "O valor descoberto é a diferença positiva entre a compra e todos os recursos considerados.",
      formula: "Pró-soluto = compra − financiamento − recursos complementares",
      substitution: `${formatCurrencyBRL(form.purchasePrice)} − ${formatCurrencyBRL(result.financingConsidered)} − ${formatCurrencyBRL(result.complementaryResources)}`,
      result: formatCurrencyBRL(result.proSoluto)
    }
  ];
}


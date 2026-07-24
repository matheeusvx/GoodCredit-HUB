import { ProSolutoCalculationResult, ProSolutoExplanationStep, ProSolutoForm } from "../../types/proSoluto";
import { formatCurrencyBRL } from "../fgts/currency";

function formatPercent(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function buildProSolutoExplanation(
  form: ProSolutoForm,
  result: ProSolutoCalculationResult
): ProSolutoExplanationStep[] {
  const financingDescription = result.financingIsEstimated
    ? "Como o crédito ainda não foi aprovado, o limite calculado foi usado apenas como estimativa."
    : "Foi considerado o menor valor entre o crédito aprovado e o limite calculado pela avaliação.";

  const financingCalculation = result.financingIsEstimated
    ? `O limite estimado é ${formatCurrencyBRL(result.appraisalFinancingLimit)}.`
    : `Comparação entre ${formatCurrencyBRL(form.approvedCreditAmount || 0)} aprovados e ${formatCurrencyBRL(result.appraisalFinancingLimit)} de limite.`;

  return [
    {
      number: 1,
      title: "Limite de financiamento pela avaliação",
      description:
        "O percentual máximo financiável é aplicado diretamente sobre o valor de avaliação do imóvel.",
      calculation: `${formatCurrencyBRL(form.appraisalValue)} multiplicado por ${formatPercent(result.validatedFinanceablePercent)}.`,
      result: formatCurrencyBRL(result.appraisalFinancingLimit)
    },
    {
      number: 2,
      title: "Financiamento considerado",
      description: financingDescription,
      calculation: financingCalculation,
      result: `${formatCurrencyBRL(result.financingConsidered)}${
        result.financingIsEstimated ? " — estimado" : ""
      }`
    },
    {
      number: 3,
      title: "Total de recursos disponíveis",
      description:
        "Somamos o financiamento considerado, o FGTS efetivamente utilizado e a entrada já paga.",
      calculation: `${formatCurrencyBRL(result.financingConsidered)} mais ${formatCurrencyBRL(form.fgtsAmount)} de FGTS e ${formatCurrencyBRL(form.paidEntryAmount)} de entrada.`,
      result: formatCurrencyBRL(result.totalAvailableResources)
    },
    {
      number: 4,
      title: "Valor do pró-soluto",
      description:
        "Do valor que o vendedor precisa receber, subtraímos o total de recursos disponíveis. Se houver excedente, o pró-soluto permanece em zero.",
      calculation: `${formatCurrencyBRL(form.sellerReceivableAmount)} menos ${formatCurrencyBRL(result.totalAvailableResources)}.`,
      result: formatCurrencyBRL(result.proSoluto)
    }
  ];
}

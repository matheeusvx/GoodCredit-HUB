import { ProSolutoCalculationResult, ProSolutoForm } from "../../types/proSoluto";
import { formatCurrencyBRL } from "../fgts/currency";

function formatPercent(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function buildProSolutoMessage(
  form: ProSolutoForm,
  result: ProSolutoCalculationResult
): string {
  const alerts = result.warnings
    .filter((warning) => warning.code !== "FULLY_COVERED")
    .map((warning) => `- ${warning.message}`)
    .join("\n");

  return `Cálculo de Pró-Soluto

Cliente/processo:
${form.clientName.trim() || "Não informado"}

- Valor que o vendedor precisa receber — CCV: ${formatCurrencyBRL(form.sellerReceivableAmount)}
- Valor de avaliação do imóvel: ${formatCurrencyBRL(form.appraisalValue)}
- Percentual máximo financiável: ${formatPercent(result.validatedFinanceablePercent)}
- Limite de financiamento pela avaliação: ${formatCurrencyBRL(result.appraisalFinancingLimit)}
- Crédito aprovado: ${form.creditNotApprovedYet ? "Ainda não aprovado" : formatCurrencyBRL(form.approvedCreditAmount || 0)}
- Financiamento considerado: ${formatCurrencyBRL(result.financingConsidered)}${result.financingIsEstimated ? " (estimado, não representa aprovação bancária)" : ""}
- FGTS utilizado: ${formatCurrencyBRL(form.fgtsAmount)}
- Entrada já paga: ${formatCurrencyBRL(form.paidEntryAmount)}
- Total de recursos disponíveis: ${formatCurrencyBRL(result.totalAvailableResources)}
- Pró-soluto apurado: ${formatCurrencyBRL(result.proSoluto)}
- Percentual descoberto: ${formatPercent(result.uncoveredPercent)}
${result.surplusResources > 0 ? `- Recursos excedentes: ${formatCurrencyBRL(result.surplusResources)}\n` : ""}
Alertas e observações:
${alerts || "- Nenhum alerta adicional."}

Este cálculo possui caráter orientativo. Confirme o crédito, a avaliação, o percentual financiável e a composição final da operação antes da formalização.`;
}

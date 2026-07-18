import { formatCurrencyBRL } from "../fgts/currency";
import { ProSolutoCalculationResult, ProSolutoForm } from "../../types/proSoluto";

function formatPercent(value: number): string {
  return value.toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildProSolutoMessage(form: ProSolutoForm, result: ProSolutoCalculationResult): string {
  const alerts = result.warnings
    .filter((warning) => warning.code !== "FULLY_COVERED")
    .map((warning) => `- ${warning.message}`)
    .join("\n");

  return `Cálculo de Pró-Soluto

Cliente/processo:
${form.clientName.trim() || "Não informado"}

- Valor de compra: ${formatCurrencyBRL(form.purchasePrice)}
- Avaliação da engenharia: ${form.appraisalValue ? formatCurrencyBRL(form.appraisalValue) : "Não informada"}
- Base financiável: ${formatCurrencyBRL(result.financingBase)}
- Percentual financiável: ${form.financeablePercent === null ? "Não informado" : formatPercent(form.financeablePercent)}
- Limite financiável: ${result.financingLimit === null ? "Não calculado" : formatCurrencyBRL(result.financingLimit)}
- Financiamento considerado: ${formatCurrencyBRL(result.financingConsidered)}${result.financingIsEstimated ? " (estimado)" : ""}
- FGTS: ${formatCurrencyBRL(form.fgtsAmount)}
- Subsídio: ${formatCurrencyBRL(form.subsidyAmount)}
- Entrada já paga: ${formatCurrencyBRL(form.paidEntryAmount)}
- Outros recursos próprios: ${formatCurrencyBRL(form.otherOwnResources)}
- Pró-soluto: ${formatCurrencyBRL(result.proSoluto)}
${result.surplusResources > 0 ? `- Recursos excedentes: ${formatCurrencyBRL(result.surplusResources)}\n` : ""}
Observações:
${alerts || "- Nenhum alerta adicional."}

Este cálculo possui caráter orientativo e está sujeito à validação do financiamento, da avaliação e da composição final da operação.`;
}

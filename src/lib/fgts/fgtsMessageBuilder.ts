import type { FgtsEligibilityForm, FgtsEligibilityResult, FgtsIncomeForm, FgtsIncomeResult, FgtsProjectionResult } from "../../types/fgts";
import { formatCurrencyBR } from "../financial";
import { FGTS_USAGE_LABELS } from "./fgtsRules";

function formatCompetence(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return "não informada";
  const [year, month] = value.split("-");
  return `${month}/${year}`;
}

export function buildFgtsWhatsAppMessage(params: { clientName: string; usageMode: keyof typeof FGTS_USAGE_LABELS | ""; eligibility: FgtsEligibilityResult; eligibilityForm: FgtsEligibilityForm; incomeForm: FgtsIncomeForm; incomeResult: FgtsIncomeResult; projection: FgtsProjectionResult; checkedDocuments: Record<string, boolean> }): string {
  const competence = params.incomeResult.competenceMatches ? formatCompetence(params.incomeForm.payslipCompetence) : `${formatCompetence(params.incomeForm.payslipCompetence)} no holerite e ${formatCompetence(params.incomeForm.depositCompetence)} no FGTS`;
  const alerts = [...params.incomeResult.warnings, ...params.eligibility.messages].map((item) => `- ${item}`).join("\n");
  const greeting = params.clientName ? `Olá, ${params.clientName}! Tudo bem?` : "Olá! Tudo bem?";
  return `${greeting}\n\nRealizamos a comparação inicial entre o holerite e o depósito de FGTS da competência ${competence}.\n\n- Valor bruto do holerite: ${formatCurrencyBR(params.incomeForm.payslipGross)}\n- Renda estimada pelo FGTS: ${formatCurrencyBR(params.incomeResult.estimatedIncome)}\n- Maior valor identificado: ${formatCurrencyBR(params.incomeResult.highestIncome)}\n- Valor considerado na análise: ${formatCurrencyBR(params.incomeResult.consideredIncome)}\n- Opção recomendada para seleção no Caixa Aqui: ${params.incomeResult.recommendedOptionLabel}\n\n${alerts ? `Alertas:\n${alerts}\n\n` : ""}Importante: a análise está sujeita à conferência documental e à validação da instituição financeira.\n\nAtenciosamente,\nGoodCredit`;
}

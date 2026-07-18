import { formatCurrencyBR } from "../../lib/financial";
import { FGTS_DOCUMENTS, FGTS_USAGE_LABELS } from "../../lib/fgts/fgtsRules";
import type { FgtsEligibilityResult, FgtsIncomeForm, FgtsIncomeResult, FgtsProjectionResult } from "../../types/fgts";
import { FgtsActions } from "./FgtsActions";

interface Props { usageMode: keyof typeof FGTS_USAGE_LABELS | ""; eligibility: FgtsEligibilityResult; incomeForm: FgtsIncomeForm; incomeResult: FgtsIncomeResult; projection: FgtsProjectionResult; checked: Record<string, boolean>; onCopy: () => void; onPdf: () => void; onSend: () => void; }
export function FgtsResultPanel(props: Props) {
  const active = props.projection.events.filter((event) => event.active && event.amount > 0);
  const pending = FGTS_DOCUMENTS.filter((item) => !props.checked[item.id]).length;
  const facts = [["Elegibilidade", props.eligibility.label], ["Modalidade", props.usageMode ? FGTS_USAGE_LABELS[props.usageMode] : "Não informada"], ["Próxima utilização", props.projection.nextEligibleDate ? new Date(`${props.projection.nextEligibleDate}T12:00:00`).toLocaleDateString("pt-BR") : "Não informada"], ["Renda do holerite", formatCurrencyBR(props.incomeForm.payslipGross)], ["Renda estimada", formatCurrencyBR(props.incomeResult.estimatedIncome)], ["Renda considerada", formatCurrencyBR(props.incomeResult.consideredIncome)], ["Opção no Caixa Aqui", props.incomeResult.recommendedOptionLabel], ["Aportes projetados", String(active.length)], ["Total projetado", formatCurrencyBR(active.reduce((sum, event) => sum + event.amount, 0))], ["Documentos pendentes", String(pending)]];
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-bold">Resultado e Relatório</h2><p className="mt-1 text-sm text-slate-500">Consolidação da análise preenchida neste navegador.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{facts.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-950">{value}</p></div>)}</div><div className="mt-5"><FgtsActions onCopy={props.onCopy} onPdf={props.onPdf} onSend={props.onSend} canSend={active.length > 0} /></div></section>;
}

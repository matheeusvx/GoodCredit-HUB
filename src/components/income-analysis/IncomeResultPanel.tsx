import { IncomeAnalysisForm, IncomeAnalysisResult } from "../../types/incomeAnalysis";
import { formatCompetence, formatCurrencyBR } from "../../lib/income-analysis/formatters";
import { INCOME_PROFILE_LABELS } from "../../lib/income-analysis/incomeRules";
import { IncomeActions } from "./IncomeActions";

export function IncomeResultPanel({ form, result, onCopy, onPdfSummary, onPdfDetailed, onSend }: { form: IncomeAnalysisForm; result: IncomeAnalysisResult; onCopy: () => void; onPdfSummary: () => void; onPdfDetailed: () => void; onSend: () => void }) {
  const facts = [
    ["Cliente/processo", form.clientName || "Não informado"],
    ["Perfil", form.incomeProfile ? INCOME_PROFILE_LABELS[form.incomeProfile] : "Não informado"],
    ["Período", `${formatCompetence(form.periodStart)} a ${formatCompetence(form.periodEnd)}`],
    ["Contas analisadas", String(form.accountCount)],
    ["Meses considerados", String(result.monthCount)],
    ["Total bruto", formatCurrencyBR(result.totalEntries)],
    ["Total considerado", formatCurrencyBR(result.totalIncluded)],
    ["Total desconsiderado", formatCurrencyBR(result.totalExcluded)],
    ["Em revisão", formatCurrencyBR(result.totalReview)],
    ["Renda média apurada", formatCurrencyBR(result.averageIncome)],
    ["Mediana mensal", formatCurrencyBR(result.medianIncome)],
    ["Indicador de estabilidade", result.stabilityLabel]
  ];
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold">Resultado Geral</h2>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{facts.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-950">{value}</p></div>)}</div>
    <p className="mt-4 text-xs text-slate-500">Indicador interno de estabilidade — não representa critério oficial de aprovação.</p>
    {result.pendingCount > 0 && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Existem lançamentos pendentes de classificação. A renda média poderá mudar após a conclusão da análise.</p>}
    {result.totalEntries > 0 && result.totalExcluded / result.totalEntries >= 0.4 && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Parte relevante das entradas foi desconsiderada. Revise os motivos antes de concluir a apuração.</p>}
    <div className="mt-5"><IncomeActions onCopy={onCopy} onPdfSummary={onPdfSummary} onPdfDetailed={onPdfDetailed} onSend={onSend} canSend={Boolean(form.clientName && form.incomeProfile && result.monthCount && result.averageIncome > 0)} /></div>
  </section>;
}

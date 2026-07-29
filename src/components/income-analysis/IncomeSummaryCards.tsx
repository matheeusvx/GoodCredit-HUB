import { formatCompetence, formatCurrencyBR } from "../../lib/income-analysis/formatters";
import { getReconciliationStatusLabel, getStabilityLabel } from "../../lib/statement-analysis/presentationLabels";
import type { AutomatedIncomeResult } from "../../types/statementAnalysis";

export function IncomeSummaryCards({ result }: { result: AutomatedIncomeResult }) {
  if (result.analysisType === "PLATFORM_INCOME" && result.platformIncomeResult) {
    const platform = result.platformIncomeResult;
    const statusLabels = {
      COMPLETE: "Análise concluída",
      INSUFFICIENT_DOCUMENTS: "Comprovantes insuficientes",
      HOLDER_MISMATCH: "Titulares divergentes",
      DUPLICATE_COMPETENCE: "Competência divergente",
      VALUE_DIVERGENCE: "Valores divergentes",
      REVIEW_REQUIRED: "Revisão necessária",
    };
    const statusTone = platform.status === "COMPLETE"
      ? "text-emerald-700"
      : "text-amber-700";
    const cards = [
      ["Renda considerada", formatCurrencyBR(result.confirmedMonthlyIncome), "text-emerald-700"],
      ["Plataforma", platform.platform, "text-goodblue-700"],
      ["Competência determinante", platform.determiningCompetence ? formatCompetence(platform.determiningCompetence) : "Não definida", "text-slate-900"],
      ["Comprovantes selecionados", `${platform.selectedDocuments.length} de 4`, "text-slate-900"],
      ["Competências analisadas", String(result.months.length), "text-slate-900"],
      ["Mediana (referência)", formatCurrencyBR(result.medianIncome), "text-slate-900"],
      ["Método", "Menor renda bruta", "text-goodblue-700"],
      ["Situação", statusLabels[platform.status], statusTone],
    ];
    return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, tone]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-2 text-xl font-bold ${tone}`}>{value}</p></div>)}</section>;
  }
  const reconciliationTone = result.reconciliationStatus === "DIVERGENCE" ? "text-rose-700" : result.reconciliationStatus === "RECONCILED" ? "text-emerald-700" : "text-amber-700";
  const cards = [["Renda confirmada", formatCurrencyBR(result.confirmedMonthlyIncome), "text-emerald-700"], ["Renda potencial", formatCurrencyBR(result.potentialMonthlyIncome), "text-goodblue-700"], ["Mediana mensal", formatCurrencyBR(result.medianIncome), "text-slate-900"], ["Valores pendentes", formatCurrencyBR(result.totalPending), "text-amber-700"], ["Movimentações", String(result.transactions.length), "text-slate-900"], ["Meses completos", String(result.completeMonths), "text-slate-900"], ["Estabilidade", getStabilityLabel(result.stability), "text-goodblue-700"], ["Conciliação", getReconciliationStatusLabel(result.reconciliationStatus), reconciliationTone]];
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, tone]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-2 text-xl font-bold ${tone}`}>{value}</p></div>)}</section>;
}

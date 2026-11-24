import { formatCompetence, formatCurrencyBR } from "../../lib/income-analysis/formatters";
import { getReconciliationStatusLabel, getStabilityLabel } from "../../lib/statement-analysis/presentationLabels";
import type { AutomatedIncomeResult } from "../../types/statementAnalysis";

export function IncomeSummaryCards({ result }: { result: AutomatedIncomeResult }) {
  if (result.analysisType === "SHOPEE_PAY") {
    const cards = [
      ["Renda confirmada", formatCurrencyBR(result.confirmedMonthlyIncome), "text-emerald-700"],
      ["Renda potencial", formatCurrencyBR(result.potentialMonthlyIncome), "text-goodblue-700"],
      ["Emissor", "ShopeePay", "text-goodblue-700"],
      ["Competências consideradas", `${result.months.length} de 3`, "text-ink"],
      ["Total analisado", formatCurrencyBR(result.confirmedIncomeTotal), "text-ink"],
      ["Mediana (referência)", formatCurrencyBR(result.medianIncome), "text-ink"],
      ["Método", "Média dos 3 meses mais recentes", "text-goodblue-700"],
      ["Situação", result.canSendToSimulation ? "Análise concluída" : "Dados insuficientes", result.canSendToSimulation ? "text-emerald-700" : "text-amber-700"],
    ];
    return <section className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, tone]) => <div key={label} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"><p className="text-[13px] font-medium text-ink-muted">{label}</p><p className={`mt-1.5 text-xl font-semibold tracking-tight ${tone}`}>{value}</p></div>)}</section>;
  }
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
    const firstCompetence = result.months[0]?.competence;
    const lastCompetence = result.months.at(-1)?.competence;
    const periodLabel = firstCompetence && lastCompetence
      ? `${formatCompetence(firstCompetence)} → ${formatCompetence(lastCompetence)}`
      : "Não definido";
    const methodLabel = platform.calculationMethod === "FOUR_MONTH_AVERAGE"
      ? "Média de 4 meses"
      : "Menor renda bruta";
    const cards = [
      ["Renda considerada", formatCurrencyBR(result.confirmedMonthlyIncome), "text-emerald-700"],
      ["Plataforma", platform.platform, "text-goodblue-700"],
      platform.calculationMethod === "FOUR_MONTH_AVERAGE"
        ? ["Período considerado", periodLabel, "text-ink"]
        : ["Competência determinante", platform.determiningCompetence ? formatCompetence(platform.determiningCompetence) : "Não definida", "text-ink"],
      ["Comprovantes selecionados", `${platform.selectedDocuments.length} de 4`, "text-ink"],
      ["Competências analisadas", String(result.months.length), "text-ink"],
      ["Mediana (referência)", formatCurrencyBR(result.medianIncome), "text-ink"],
      ["Método", methodLabel, "text-goodblue-700"],
      ["Situação", statusLabels[platform.status], statusTone],
    ];
    return <section className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, tone]) => <div key={label} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"><p className="text-[13px] font-medium text-ink-muted">{label}</p><p className={`mt-1.5 text-xl font-semibold tracking-tight ${tone}`}>{value}</p></div>)}</section>;
  }
  const reconciliationTone = result.reconciliationStatus === "DIVERGENCE" ? "text-rose-700" : result.reconciliationStatus === "RECONCILED" ? "text-emerald-700" : "text-amber-700";
  const cards = [["Renda confirmada", formatCurrencyBR(result.confirmedMonthlyIncome), "text-emerald-700"], ["Renda potencial", formatCurrencyBR(result.potentialMonthlyIncome), "text-goodblue-700"], ["Mediana mensal", formatCurrencyBR(result.medianIncome), "text-ink"], ["Valores pendentes", formatCurrencyBR(result.totalPending), "text-amber-700"], ["Movimentações", String(result.transactions.length), "text-ink"], ["Meses completos", String(result.completeMonths), "text-ink"], ["Estabilidade", getStabilityLabel(result.stability), "text-goodblue-700"], ["Conciliação", getReconciliationStatusLabel(result.reconciliationStatus), reconciliationTone]];
  return <section className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, tone]) => <div key={label} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"><p className="text-[13px] font-medium text-ink-muted">{label}</p><p className={`mt-1.5 text-xl font-semibold tracking-tight ${tone}`}>{value}</p></div>)}</section>;
}

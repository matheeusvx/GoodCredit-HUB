import { PdfImportSummary } from "../../../types/pdfImport";
import { formatCurrencyBR } from "../../../lib/income-analysis/formatters";

export function PdfExtractionSummary({ summary }: { summary: PdfImportSummary }) {
  const items = [
    ["Movimentações", summary.transactionCount], ["Créditos", summary.credits], ["Débitos", summary.debits], ["Ambíguas", summary.ambiguous],
    ["Total de créditos", formatCurrencyBR(summary.creditTotal)], ["Total de débitos", formatCurrencyBR(summary.debitTotal)], ["Linhas ignoradas", summary.ignoredLineCount], ["Linhas lidas", summary.lineCount],
  ];
  const reconciliation = summary.reconciliation;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{summary.parserLabel && <div className="rounded-lg border border-goodblue-200 bg-goodblue-50 p-3"><p className="text-xs font-semibold text-goodblue-700">Parser utilizado</p><p className="mt-1 font-bold text-goodblue-900">{summary.parserLabel}</p></div>}{items.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>)}</div>
    {reconciliation && <section className={`rounded-xl border p-4 ${reconciliation.status === "MATCHED" ? "border-emerald-200 bg-emerald-50" : reconciliation.status === "DIVERGENT" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-bold text-slate-950">Conferência dos totais</h4><p className="mt-1 text-xs text-slate-600">Comparação entre o resumo informado pelo extrato e as movimentações identificadas.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${reconciliation.status === "MATCHED" ? "bg-emerald-100 text-emerald-800" : reconciliation.status === "DIVERGENT" ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-700"}`}>{reconciliation.status === "MATCHED" ? "Conferido" : reconciliation.status === "DIVERGENT" ? "Divergência encontrada" : "Resumo não identificado"}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6"><ReconciliationValue label="Entradas do extrato" value={reconciliation.statementCreditTotal} /><ReconciliationValue label="Entradas identificadas" value={reconciliation.parsedCreditTotal} /><ReconciliationValue label="Diferença de entradas" value={reconciliation.creditDifference} /><ReconciliationValue label="Saídas do extrato" value={reconciliation.statementDebitTotal} /><ReconciliationValue label="Saídas identificadas" value={reconciliation.parsedDebitTotal} /><ReconciliationValue label="Diferença de saídas" value={reconciliation.debitDifference} /></div>{reconciliation.status === "DIVERGENT" && <p className="mt-3 text-sm font-semibold text-amber-900">Revise linhas ambíguas, páginas processadas e a natureza das movimentações antes de confirmar.</p>}</section>}
  </div>;
}

function ReconciliationValue({ label, value }: { label: string; value: number | null }) {
  return <div><p className="text-[11px] font-semibold text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value === null ? "Não identificado" : formatCurrencyBR(value)}</p></div>;
}

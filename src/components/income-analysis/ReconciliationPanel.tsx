import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrencyBR } from "../../lib/income-analysis/formatters";
import { getExtractionMethodLabel, getParserLabel, getReconciliationStatusLabel } from "../../lib/statement-analysis/presentationLabels";
import type { StatementFileRecord } from "../../types/statementAnalysis";

export function ReconciliationPanel({ files }: { files: StatementFileRecord[] }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Conciliação dos arquivos</h2><div className="mt-4 space-y-3">{files.map((file) => {
    const ok = file.reconciliation.status === "RECONCILED";
    const badgeTone = ok ? "bg-emerald-100 text-emerald-700" : file.reconciliation.status === "DIVERGENCE" ? "bg-rose-100 text-rose-700" : file.reconciliation.status === "NO_SUMMARY" ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-800";
    return <div key={file.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-[minmax(0,1fr)_repeat(3,auto)] sm:items-center"><div className="flex min-w-0 items-start gap-2">{ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}<div className="min-w-0"><p className="truncate text-sm font-bold">{file.name}</p><p className="text-xs text-slate-500">{file.parserId ? getParserLabel(file.parserId) : "Formato ainda não identificado"} · {getExtractionMethodLabel(file.extractionMethod)}</p></div></div><div className="text-xs"><span className="text-slate-500">Créditos</span><br /><strong>{formatCurrencyBR(file.reconciliation.creditTotal)}</strong></div><div className="text-xs"><span className="text-slate-500">Débitos</span><br /><strong>{formatCurrencyBR(file.reconciliation.debitTotal)}</strong></div><span className={`rounded-full px-2.5 py-1 text-center text-xs font-bold ${badgeTone}`}>{getReconciliationStatusLabel(file.reconciliation.status)}</span></div>;
  })}</div></section>;
}

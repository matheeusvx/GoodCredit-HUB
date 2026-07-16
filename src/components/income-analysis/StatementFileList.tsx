import { FileSpreadsheet, FileText, Trash2 } from "lucide-react";
import { getBankLabel, getFileFormatLabel, getParserLabel, getProcessingStatusLabel } from "../../lib/statement-analysis/presentationLabels";
import type { StatementFileRecord } from "../../types/statementAnalysis";

const statusClass: Record<StatementFileRecord["status"], string> = { READY: "bg-slate-100 text-slate-700", READING: "bg-blue-100 text-blue-700", PROCESSING: "bg-blue-100 text-blue-700", COMPLETED: "bg-emerald-100 text-emerald-700", DIVERGENT: "bg-rose-100 text-rose-700", REVIEW_REQUIRED: "bg-amber-100 text-amber-800", PASSWORD_REQUIRED: "bg-amber-100 text-amber-800", UNRECOGNIZED: "bg-rose-100 text-rose-700", ERROR: "bg-rose-100 text-rose-700" };

export function StatementFileList({ files, disabled, onRemove }: { files: StatementFileRecord[]; disabled: boolean; onRemove: (id: string) => void }) {
  if (!files.length) return null;
  return <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
    {files.map((file) => <div key={file.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">{file.format === "PDF" ? <FileText className="mt-0.5 h-5 w-5 shrink-0 text-goodblue-600" /> : <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-goodgreen-600" />}<div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900" title={file.name}>{file.name}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span><span>{getFileFormatLabel(file.format)}</span>{file.pageCount && <span>{file.pageCount} páginas</span>}{file.bank !== "AUTO" && <span>{getBankLabel(file.bank)}</span>}{file.parserId && <span>Leitura: {getParserLabel(file.parserId)}</span>}</div>{file.warnings.length > 0 && <p className="mt-1 text-xs text-amber-700">{file.warnings[0]}</p>}</div></div>
      <div className="flex items-center justify-between gap-2 sm:justify-end"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[file.status]}`}>{getProcessingStatusLabel(file.status)}</span><button type="button" title="Remover arquivo" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40" disabled={disabled} onClick={() => onRemove(file.id)}><Trash2 className="h-4 w-4" /></button></div>
    </div>)}
  </div>;
}

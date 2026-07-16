import { X } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { NormalizedBankTransaction, StatementFileRecord } from "../../types/statementAnalysis";

export function StatementViewer({ transaction, file, onClose }: { transaction: NormalizedBankTransaction; file: StatementFileRecord; onClose: () => void }) {
  const url = useMemo(() => file.format === "PDF" ? URL.createObjectURL(file.file) : "", [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-2" role="dialog" aria-modal="true"><div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white"><header className="flex items-start justify-between border-b p-4"><div><h3 className="font-bold">Documento de origem</h3><p className="text-xs text-slate-500">{file.name} · {transaction.sourcePage ? `página ${transaction.sourcePage}` : `linha ${transaction.sourceRow || "-"}`}</p></div><button type="button" title="Fechar" className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose}><X className="h-5 w-5" /></button></header>{url ? <iframe title="Extrato bancário local" className="h-full w-full" src={`${url}#page=${transaction.sourcePage || 1}&view=FitH`} /> : <div className="grid flex-1 place-items-center p-8 text-center text-sm text-slate-500">A visualização integrada está disponível para PDFs. A origem desta movimentação é a linha {transaction.sourceRow || "não identificada"} da planilha.</div>}</div></div>;
}

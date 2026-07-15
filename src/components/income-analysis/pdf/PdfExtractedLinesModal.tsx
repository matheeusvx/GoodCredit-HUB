import { X } from "lucide-react";
import { ReconstructedPdfLine } from "../../../types/pdfImport";

export function PdfExtractedLinesModal({ lines, onClose }: { lines: ReconstructedPdfLine[]; onClose: () => void }) {
  return <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-slate-950/55 p-3" role="dialog" aria-modal="true" aria-label="Linhas extraídas do PDF">
    <div className="flex max-h-[90%] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-4"><div><h3 className="font-bold text-slate-950">Visualizar linhas extraídas</h3><p className="mt-1 text-xs text-slate-500">Recurso local de desenvolvimento. O conteúdo é apagado ao fechar o arquivo e não é registrado no console.</p></div><button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar linhas extraídas" onClick={onClose}><X className="h-4 w-4" /></button></header>
      <div className="overflow-auto p-4"><table className="w-full min-w-[720px] text-left text-xs"><thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th className="w-20 p-2">Página</th><th className="p-2">Linha extraída</th></tr></thead><tbody className="divide-y divide-slate-100">{lines.map((line, index) => <tr key={`${line.pageNumber}-${line.y}-${index}`}><td className="p-2 align-top font-semibold text-slate-500">{line.pageNumber}</td><td className="whitespace-pre-wrap p-2 font-mono text-slate-800">{line.text}</td></tr>)}</tbody></table></div>
    </div>
  </div>;
}

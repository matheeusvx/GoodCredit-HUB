import { FileSearch, ScanText } from "lucide-react";

export function PdfTextParserFallback({ canInspectLines, onNubank, onGeneric, onSelectBank, onInspectLines, onOcr, onManual }: { canInspectLines: boolean; onNubank: () => void; onGeneric: () => void; onSelectBank: () => void; onInspectLines: () => void; onOcr: () => void; onManual: () => void }) {
  return <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
    <div className="flex gap-3"><FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><h3 className="font-bold">O documento possui texto, mas o formato ainda não foi reconhecido corretamente.</h3><p className="mt-1 text-sm">Escolha um parser ou revise a extração. O OCR fica disponível como última alternativa.</p></div></div>
    <div className="mt-4 flex flex-wrap gap-3"><button type="button" className="btn-primary" onClick={onNubank}>Tentar parser Nubank</button><button type="button" className="btn-secondary" onClick={onGeneric}>Tentar parser genérico</button><button type="button" className="btn-secondary" onClick={onSelectBank}>Selecionar outro banco</button>{canInspectLines && <button type="button" className="btn-muted" onClick={onInspectLines}>Visualizar linhas extraídas</button>}<button type="button" className="btn-muted" onClick={onOcr}><ScanText className="h-4 w-4" /> Tentar OCR</button><button type="button" className="btn-muted" onClick={onManual}>Importar manualmente</button></div>
  </section>;
}

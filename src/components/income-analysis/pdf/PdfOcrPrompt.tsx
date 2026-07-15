import { ScanText, TriangleAlert } from "lucide-react";

export function PdfOcrPrompt({ mixed, onOcr, onReviewText, onCancel }: { mixed: boolean; onOcr: () => void; onReviewText?: () => void; onCancel: () => void }) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
    <div className="flex gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><h3 className="font-bold">{mixed ? "Algumas páginas não possuem texto pesquisável" : "Documento digitalizado detectado"}</h3><p className="mt-1 text-sm">A leitura por OCR ocorre localmente, pode demorar e exige revisão adicional.</p></div></div>
    <div className="mt-4 flex flex-wrap gap-3"><button type="button" className="btn-primary" onClick={onOcr}><ScanText className="h-4 w-4" /> Iniciar OCR local</button>{mixed && onReviewText && <button type="button" className="btn-secondary" onClick={onReviewText}>Revisar somente texto encontrado</button>}<button type="button" className="btn-muted" onClick={onCancel}>Escolher outro arquivo</button></div>
  </div>;
}

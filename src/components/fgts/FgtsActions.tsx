import { ClipboardCopy, FileDown, Send } from "lucide-react";

export function FgtsActions({ onCopy, onPdf, onSend, canSend }: { onCopy: () => void; onPdf: () => void; onSend: () => void; canSend: boolean }) {
  return <div className="flex flex-wrap gap-3"><button type="button" className="btn-secondary" onClick={onCopy}><ClipboardCopy className="h-4 w-4" /> Copiar Resumo</button><button type="button" className="btn-secondary" onClick={onPdf}><FileDown className="h-4 w-4" /> Gerar Relatório de FGTS</button><button type="button" className="btn-primary" disabled={!canSend} onClick={onSend}><Send className="h-4 w-4" /> Enviar para Planilha de Amortização</button></div>;
}

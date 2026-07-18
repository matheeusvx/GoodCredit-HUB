import { ClipboardCopy, Download, Eraser, Import } from "lucide-react";

interface Props {
  canExport: boolean;
  copied: boolean;
  generatingPdf: boolean;
  onCopy: () => void;
  onGeneratePdf: () => void;
  onImport: () => void;
  onClear: () => void;
}

export function ProSolutoActions({
  canExport,
  copied,
  generatingPdf,
  onCopy,
  onGeneratePdf,
  onImport,
  onClear
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onImport} className="btn-secondary">
        <Import className="h-4 w-4" />
        Importar Simulação
      </button>
      <button type="button" onClick={onCopy} disabled={!canExport} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50">
        <ClipboardCopy className="h-4 w-4" />
        {copied ? "Resumo copiado" : "Copiar Resumo"}
      </button>
      <button type="button" onClick={onGeneratePdf} disabled={!canExport || generatingPdf} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
        <Download className="h-4 w-4" />
        {generatingPdf ? "Gerando..." : "Gerar Relatório"}
      </button>
      <button type="button" onClick={onClear} className="btn-muted">
        <Eraser className="h-4 w-4" />
        Limpar Cálculo
      </button>
    </div>
  );
}


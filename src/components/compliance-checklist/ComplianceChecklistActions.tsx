import { CheckCheck, Download, Eraser, FilePlus2, X } from "lucide-react";
import { useState } from "react";

interface Props {
  generatingPdf: boolean;
  onMarkAllCompliant: () => void;
  onClearItems: () => void;
  onStartNew: () => void;
  onGeneratePdf: () => void;
}

export function ComplianceChecklistActions({
  generatingPdf,
  onMarkAllCompliant,
  onClearItems,
  onStartNew,
  onGeneratePdf
}: Props) {
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  return (
    <>
      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          As alterações são armazenadas somente neste navegador.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={onMarkAllCompliant} className="btn-secondary">
            <CheckCheck className="h-4 w-4" />
            Marcar todos como conformes
          </button>
          <button
            type="button"
            onClick={() => setClearDialogOpen(true)}
            className="btn-muted"
          >
            <Eraser className="h-4 w-4" />
            Limpar checklist
          </button>
          <button
            type="button"
            onClick={onGeneratePdf}
            disabled={generatingPdf}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {generatingPdf ? "Gerando..." : "Gerar PDF"}
          </button>
        </div>
      </section>

      {clearDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-compliance-title"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="clear-compliance-title" className="text-lg font-bold text-slate-950">
                  Limpar Checklist de Conformidade
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Escolha se deseja manter a identificação atual ou iniciar uma nova
                  conferência.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClearDialogOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-300"
                aria-label="Fechar opções de limpeza"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Deseja limpar todos os status e observações deste checklist?"
                    )
                  ) {
                    onClearItems();
                    setClearDialogOpen(false);
                  }
                }}
                className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                <Eraser className="h-5 w-5 text-slate-500" />
                Limpar somente verificações
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Deseja iniciar um novo checklist e limpar também a identificação?"
                    )
                  ) {
                    onStartNew();
                    setClearDialogOpen(false);
                  }
                }}
                className="flex min-h-12 items-center gap-3 rounded-lg border border-goodgreen-200 bg-goodgreen-50 px-4 py-3 text-left text-sm font-bold text-goodgreen-800 hover:bg-goodgreen-100"
              >
                <FilePlus2 className="h-5 w-5" />
                Iniciar novo checklist
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

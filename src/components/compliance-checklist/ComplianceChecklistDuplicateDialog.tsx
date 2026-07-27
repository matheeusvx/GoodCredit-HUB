import { Copy, X } from "lucide-react";
import { useState } from "react";
import type { ComplianceChecklistDuplicateOptions } from "../../types/complianceChecklist";

interface Props {
  clientName: string;
  onClose: () => void;
  onConfirm: (options: ComplianceChecklistDuplicateOptions) => void;
}

export function ComplianceChecklistDuplicateDialog({
  clientName,
  onClose,
  onConfirm
}: Props) {
  const [copyItems, setCopyItems] = useState(false);
  const [clearProcessReference, setClearProcessReference] = useState(true);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="duplicate-title" className="text-lg font-bold text-slate-950">
              Duplicar checklist
            </h2>
            <p className="mt-1 text-sm text-slate-600">{clientName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar diálogo"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
            <input
              type="radio"
              name="duplicate-mode"
              checked={!copyItems}
              onChange={() => setCopyItems(false)}
              className="mt-0.5"
            />
            <span>
              <strong className="block text-sm text-slate-900">
                Copiar somente a identificação
              </strong>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Os 15 itens serão criados como Pendente, sem observações.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
            <input
              type="radio"
              name="duplicate-mode"
              checked={copyItems}
              onChange={() => setCopyItems(true)}
              className="mt-0.5"
            />
            <span>
              <strong className="block text-sm text-slate-900">
                Copiar também status e observações
              </strong>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Cria uma cópia integral para uma nova conferência.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={clearProcessReference}
              onChange={(event) => setClearProcessReference(event.target.checked)}
            />
            Limpar a referência do processo na cópia
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ copyItems, clearProcessReference })}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-goodgreen-600 px-4 text-sm font-bold text-white"
          >
            <Copy className="h-4 w-4" />
            Criar cópia
          </button>
        </div>
      </div>
    </div>
  );
}

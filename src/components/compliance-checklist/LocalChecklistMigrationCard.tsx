import { CloudUpload, HardDrive, Trash2, X } from "lucide-react";
import type { ComplianceChecklistState } from "../../types/complianceChecklist";

interface Props {
  state: ComplianceChecklistState;
  importing: boolean;
  onImport: () => void;
  onIgnore: () => void;
  onRemove: () => void;
}

export function LocalChecklistMigrationCard({
  state,
  importing,
  onImport,
  onIgnore,
  onRemove
}: Props) {
  return (
    <section className="rounded-lg border border-goodblue-200 bg-goodblue-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-goodblue-700">
          <HardDrive className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-goodblue-950">Checklist local encontrado</h2>
          <p className="mt-1 text-sm leading-6 text-goodblue-900">
            Existe um checklist salvo neste navegador
            {state.clientName ? ` para ${state.clientName}` : ""}. Deseja importá-lo
            para o histórico centralizado?
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={importing}
              onClick={onImport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-goodblue-700 px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              <CloudUpload className="h-4 w-4" />
              {importing ? "Importando..." : "Importar checklist"}
            </button>
            <button
              type="button"
              onClick={onIgnore}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-goodblue-200 bg-white px-4 text-sm font-bold text-goodblue-800"
            >
              <X className="h-4 w-4" />
              Ignorar
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700"
            >
              <Trash2 className="h-4 w-4" />
              Remover dados locais
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

import { ClipboardCheck, FilterX, Plus } from "lucide-react";

interface Props {
  filtered: boolean;
  onNew: () => void;
  onClearFilters: () => void;
}

export function ComplianceChecklistEmptyState({
  filtered,
  onNew,
  onClearFilters
}: Props) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {filtered ? <FilterX className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">
        {filtered
          ? "Nenhum checklist encontrado com os filtros selecionados."
          : "Nenhum checklist criado"}
      </h2>
      {!filtered && (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Crie o primeiro Checklist de Conformidade para iniciar o controle digital
          dos processos.
        </p>
      )}
      <button
        type="button"
        onClick={filtered ? onClearFilters : onNew}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-goodgreen-600 px-4 text-sm font-bold text-white"
      >
        {filtered ? <FilterX className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {filtered ? "Limpar filtros" : "Criar primeiro checklist"}
      </button>
    </section>
  );
}

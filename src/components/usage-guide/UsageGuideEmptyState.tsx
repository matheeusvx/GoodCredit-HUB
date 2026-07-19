import { SearchX } from "lucide-react";

export function UsageGuideEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      <SearchX className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-bold text-slate-950">Nenhuma orientação encontrada</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Tente pesquisar usando outro termo ou selecione um módulo.</p>
      <button type="button" onClick={onClear} className="btn-secondary mt-5">Limpar pesquisa</button>
    </section>
  );
}

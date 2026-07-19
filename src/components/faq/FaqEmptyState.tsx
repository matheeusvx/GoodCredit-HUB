import { SearchX } from "lucide-react";

interface FaqEmptyStateProps {
  onClear: () => void;
}

export function FaqEmptyState({ onClear }: FaqEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <SearchX className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-bold text-slate-900">Nenhuma pergunta encontrada</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        Tente pesquisar com outras palavras ou selecione uma categoria diferente.
      </p>
      <button type="button" onClick={onClear} className="btn-muted mt-5">
        Limpar pesquisa
      </button>
    </div>
  );
}

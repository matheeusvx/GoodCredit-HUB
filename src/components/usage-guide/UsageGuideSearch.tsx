import { Search, X } from "lucide-react";

interface Props {
  value: string;
  resultCount: number;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function UsageGuideSearch({ value, resultCount, onChange, onClear }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Pesquisa no Guia de Uso">
      <label htmlFor="usage-guide-search" className="text-sm font-bold text-slate-800">
        Pesquisar no Guia de Uso
      </label>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="usage-guide-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Pesquisar uma funcionalidade ou instrução..."
          className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10"
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            title="Limpar pesquisa"
            aria-label="Limpar pesquisa"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500" aria-live="polite">
        {resultCount} {resultCount === 1 ? "módulo encontrado" : "módulos encontrados"}
      </p>
    </section>
  );
}

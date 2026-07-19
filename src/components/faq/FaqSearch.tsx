import { Search, X } from "lucide-react";

interface FaqSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function FaqSearch({ value, onChange }: FaqSearchProps) {
  return (
    <div>
      <label htmlFor="faq-search" className="mb-2 block text-sm font-bold text-slate-700">
        Pesquisar no FAQ
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="faq-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Pesquisar uma dúvida, assunto ou palavra-chave..."
          className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-12 pr-12 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-100"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-goodgreen-100"
            aria-label="Limpar pesquisa"
            title="Limpar pesquisa"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

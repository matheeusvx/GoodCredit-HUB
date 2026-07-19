import { BookOpenText } from "lucide-react";

export function FaqHeader() {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 xl:px-8">
      <div className="mx-auto flex max-w-[1280px] items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700 ring-1 ring-goodgreen-100">
          <BookOpenText className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-700">Material de apoio</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">FAQ de Atendimento</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 sm:text-base">
            Consulte respostas para as principais dúvidas sobre crédito imobiliário, FGTS, comprovação de renda,
            engenharia e construção.
          </p>
        </div>
      </div>
    </header>
  );
}

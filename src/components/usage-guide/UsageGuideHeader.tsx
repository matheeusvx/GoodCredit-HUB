import { BookOpen, Info } from "lucide-react";

export function UsageGuideHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 xl:px-8">
        <div className="flex items-start gap-4">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700 sm:flex">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-600">Central de Apoio</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Guia de Uso</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Aprenda a utilizar as ferramentas do GoodCredit Hub e entenda os resultados apresentados em cada etapa.
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-4xl text-sm leading-6 text-slate-600">
          Selecione um módulo para consultar sua finalidade, o passo a passo de utilização, os principais resultados e os cuidados necessários.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-goodblue-100 bg-goodblue-50 px-4 py-3 text-sm text-goodblue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>As orientações acompanham as funcionalidades disponíveis na versão atual do GoodCredit Hub.</p>
        </div>
      </div>
    </header>
  );
}

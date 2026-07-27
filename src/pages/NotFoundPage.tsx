import { ArrowLeft, FileQuestion } from "lucide-react";

export function NotFoundPage({ onBackHome }: { onBackHome: () => void }) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-panel">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-goodblue-50 text-goodblue-700">
          <FileQuestion className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-700">
          Erro 404
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          O endereço informado não corresponde a uma ferramenta disponível no
          GoodCredit Hub.
        </p>
        <button
          type="button"
          onClick={onBackHome}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-goodgreen-600 px-5 text-sm font-bold text-white transition hover:bg-goodgreen-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Início
        </button>
      </section>
    </main>
  );
}

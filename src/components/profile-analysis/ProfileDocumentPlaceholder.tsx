import { ArrowLeft, Clock3, FileUp } from "lucide-react";
import type { ProfileDocumentOption } from "../../types/profileAnalysis";

export function ProfileDocumentPlaceholder({
  option,
  onBack,
}: {
  option: ProfileDocumentOption;
  onBack: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-goodgreen-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para Análise de Perfil
      </button>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-600">Análise de Perfil</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">{option.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{option.description}.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              Em desenvolvimento
            </span>
          </div>
        </div>
        <div className="p-5 sm:p-7">
          <div
            aria-disabled="true"
            className="flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
              <FileUp className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-bold text-slate-800">Estrutura preparada para análise documental</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
              O envio e o processamento deste documento serão disponibilizados em uma próxima etapa.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

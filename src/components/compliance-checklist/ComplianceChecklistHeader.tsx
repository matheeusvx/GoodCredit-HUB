import { ShieldCheck } from "lucide-react";

export function ComplianceChecklistHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-4 px-4 py-5 sm:px-6 xl:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-goodgreen-600">
                Uso interno GoodCredit
              </p>
              <span className="rounded-md border border-goodblue-100 bg-goodblue-50 px-2 py-1 text-[11px] font-semibold text-goodblue-700">
                Salvo automaticamente
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Checklist de Conformidade
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Organize e registre as conferências internas do processo de financiamento
              imobiliário.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

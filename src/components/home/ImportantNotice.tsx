import { Info } from "lucide-react";

export function ImportantNotice() {
  return (
    <section className="rounded-lg border border-goodblue-100 bg-goodblue-50 p-5 sm:p-6">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-goodblue-700">
          <Info className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-goodblue-800">Importante</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            As informações geradas pelo GoodCredit Hub possuem caráter estimativo e servem como apoio inicial. A aprovação final do financiamento depende da análise do banco, validação documental, regras vigentes, avaliação do imóvel e perfil do cliente.
          </p>
        </div>
      </div>
    </section>
  );
}

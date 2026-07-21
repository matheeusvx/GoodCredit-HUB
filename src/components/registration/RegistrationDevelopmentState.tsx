import { Clock3, FileText } from "lucide-react";

interface Props {
  kind: "CITY" | "COSTS";
  cityLabel?: string;
}

export function RegistrationDevelopmentState({ kind, cityLabel }: Props) {
  const isCosts = kind === "COSTS";
  return (
    <section className="rounded-lg border border-slate-200 bg-white px-5 py-10 text-center shadow-sm sm:px-8 sm:py-14" aria-labelledby="registration-development-title">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
        {isCosts ? <FileText className="h-6 w-6" aria-hidden="true" /> : <Clock3 className="h-6 w-6" aria-hidden="true" />}
      </span>
      <span className="mt-5 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Em desenvolvimento</span>
      <h2 id="registration-development-title" className="mt-4 text-xl font-bold text-slate-950">
        {isCosts ? "Simulação de Custas" : "Simulação em desenvolvimento"}
      </h2>
      {isCosts ? (
        <>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">As regras para o cálculo das custas cartoriais ainda estão sendo estruturadas.</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">Esta ferramenta será disponibilizada em uma próxima versão do GoodCredit Hub.</p>
        </>
      ) : (
        <>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">As regras de ITBI deste município ainda não foram implementadas no GoodCredit Hub.</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">Essa cidade será disponibilizada em uma próxima versão do sistema.</p>
          {cityLabel && <p className="mt-3 text-xs font-semibold text-slate-500">Município selecionado: {cityLabel}</p>}
        </>
      )}
    </section>
  );
}

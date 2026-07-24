import { CheckCircle2 } from "lucide-react";
import { buildProSolutoExplanation } from "../../lib/pro-soluto/proSolutoExplanation";
import { ProSolutoCalculationResult, ProSolutoForm } from "../../types/proSoluto";

interface Props {
  form: ProSolutoForm;
  result: ProSolutoCalculationResult;
}

export function ProSolutoExplanation({ form, result }: Props) {
  const steps = buildProSolutoExplanation(form, result);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-goodblue-600">
          Memória de cálculo
        </p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">
          Como chegamos ao pró-soluto?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Quatro etapas mostram exatamente quais valores foram considerados.
        </p>
      </div>

      <ol className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <li key={step.number} className="min-w-0 border-l-2 border-goodblue-200 bg-slate-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-goodblue-600 text-xs font-bold text-white">
                {step.number}
              </span>
              <h3 className="pt-1 text-sm font-bold text-slate-900">{step.title}</h3>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">{step.description}</p>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-700">
              {step.calculation}
            </p>
            <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-sm font-bold text-goodgreen-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {step.result}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

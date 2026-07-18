import { BadgeDollarSign } from "lucide-react";
import { formatCurrencyBRL } from "../../lib/fgts/currency";
import { ProSolutoCalculationResult, ProSolutoForm } from "../../types/proSoluto";
import { ProSolutoAlerts } from "./ProSolutoAlerts";

interface Props {
  form: ProSolutoForm;
  result: ProSolutoCalculationResult;
}

const statusLabels = {
  HAS_PRO_SOLUTO: "Existe pró-soluto",
  FULLY_COVERED: "Operação integralmente coberta",
  SURPLUS_RESOURCES: "Recursos superiores ao valor da operação",
  INCOMPLETE: "Dados incompletos"
} as const;

function formatPercent(value: number | null): string {
  if (value === null) return "Não informado";
  return value.toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ProSolutoResult({ form, result }: Props) {
  const incomplete = result.status === "INCOMPLETE";
  const resultTone = incomplete
    ? "border-slate-200 bg-slate-50 text-slate-700"
    : result.proSoluto > 0
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-goodgreen-100 bg-goodgreen-50 text-goodgreen-900";

  const rows: Array<[string, string]> = [
    ["Valor de compra e venda", formatCurrencyBRL(form.purchasePrice)],
    ["Avaliação da engenharia", form.appraisalValue ? formatCurrencyBRL(form.appraisalValue) : "Não informada"],
    ["Base financiável", formatCurrencyBRL(result.financingBase)],
    ["Percentual financiável", formatPercent(form.financeablePercent)],
    ["Limite financiável", result.financingLimit === null ? "Não calculado" : formatCurrencyBRL(result.financingLimit)],
    ["Financiamento aprovado", form.approvedFinancing ? formatCurrencyBRL(form.approvedFinancing) : "Não informado"],
    ["Financiamento considerado", `${formatCurrencyBRL(result.financingConsidered)}${result.financingIsEstimated ? " • estimado" : ""}`],
    ["Recursos complementares", formatCurrencyBRL(result.complementaryResources)],
    ["Total coberto", formatCurrencyBRL(result.totalCovered)]
  ];

  return (
    <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel xl:sticky xl:top-6">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700">
          <BadgeDollarSign className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-950">Resultado do Pró-Soluto</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{statusLabels[result.status]}</p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className={`rounded-lg border p-5 ${resultTone}`}>
          <p className="text-xs font-bold uppercase tracking-[0.14em]">Pró-soluto estimado</p>
          <p className="mt-2 text-3xl font-bold">{formatCurrencyBRL(result.proSoluto)}</p>
          <p className="mt-2 text-sm font-semibold">{formatPercent(result.uncoveredPercent)} da operação ainda não coberto</p>
        </div>

        <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-xs font-semibold text-slate-500">{label}</dt>
              <dd className="text-sm font-bold text-slate-900 sm:text-right">{value}</dd>
            </div>
          ))}
          {result.approvedFinancingExcess > 0 && (
            <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-xs font-semibold text-red-600">Aprovado não considerado</dt>
              <dd className="text-sm font-bold text-red-700">{formatCurrencyBRL(result.approvedFinancingExcess)}</dd>
            </div>
          )}
          {result.surplusResources > 0 && (
            <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-xs font-semibold text-goodblue-700">Recursos excedentes</dt>
              <dd className="text-sm font-bold text-goodblue-800">{formatCurrencyBRL(result.surplusResources)}</dd>
            </div>
          )}
        </dl>

        <ProSolutoAlerts alerts={result.warnings} />
      </div>
    </aside>
  );
}


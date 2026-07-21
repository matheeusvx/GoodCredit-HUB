import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrencyBRL } from "../../lib/fgts/currency";
import { getRegistrationCity } from "../../lib/registration/registrationCities";
import type { SimplifiedItbiResult } from "../../types/registration";
import { ItbiCalculationExplanation } from "./ItbiCalculationExplanation";

function formatRate(rate: number): string {
  return `${(rate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function ItbiResult({ result }: { result: SimplifiedItbiResult }) {
  if (result.status === "RULE_NOT_APPLICABLE") {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6" aria-labelledby="itbi-not-applicable-title">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <h3 id="itbi-not-applicable-title" className="text-lg font-bold text-amber-950">Regra simplificada não aplicável</h3>
            <p className="mt-2 text-sm leading-6 text-amber-900">Esta regra simplificada de São Bernardo do Campo foi configurada somente para imóveis com valor de compra e venda superior a R$ 200.000,00.</p>
            <p className="mt-2 text-sm leading-6 text-amber-900">Para valores inferiores ou iguais a esse limite, é necessário conferir manualmente a regra aplicável antes da emissão da guia.</p>
          </div>
        </div>
      </section>
    );
  }

  if (result.status !== "CALCULATED" || result.rate === null || result.grossTax === null || result.estimatedItbi === null) return null;
  const city = getRegistrationCity(result.city);
  const isSbc = result.city === "SAO_BERNARDO_DO_CAMPO";
  const rows: Array<[string, string]> = [
    ["Cidade", city.label],
    ["Valor de compra e venda", formatCurrencyBRL(result.purchasePrice)],
    ["Faixa identificada", result.rangeLabel ?? "Não aplicável"],
    ["Alíquota aplicada", formatRate(result.rate)],
    ["Valor calculado pela alíquota", formatCurrencyBRL(result.grossTax)]
  ];
  if (isSbc) rows.push(["Dedução aplicada", formatCurrencyBRL(result.fixedDeduction)]);
  if (!isSbc) {
    rows.push([
      "Redução equivalente",
      result.equivalentReductionPercent
        ? `${(result.equivalentReductionPercent * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% em comparação com 2,5%`
        : "Sem redução"
    ]);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="itbi-result-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-600">Simulação simplificada</p>
          <h3 id="itbi-result-title" className="mt-1 text-lg font-bold text-slate-950">Resultado da simulação</h3>
        </div>
      </div>
      <dl className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <dt className="text-xs font-semibold text-slate-500">{label}</dt>
            <dd className="text-sm font-bold text-slate-900 sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 rounded-lg border border-goodgreen-200 bg-goodgreen-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-700">ITBI estimado</p>
        <p className="mt-2 text-3xl font-bold text-goodgreen-800">{formatCurrencyBRL(result.estimatedItbi)}</p>
      </div>
      <div className="mt-5"><ItbiCalculationExplanation result={result} /></div>
      <p className="mt-5 text-xs leading-5 text-slate-500">
        Esta é uma simulação simplificada baseada exclusivamente no valor de compra e venda informado. O valor definitivo pode variar conforme a base reconhecida pelo município, o enquadramento da operação e a emissão da guia oficial.
      </p>
    </section>
  );
}

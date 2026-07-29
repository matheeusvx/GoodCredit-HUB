import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { formatCurrencyBRL } from "../../lib/fgts/currency";
import {
  SAO_PAULO_ITBI_GENERAL_RATE,
  SAO_PAULO_ITBI_REDUCED_RATE,
} from "../../lib/registration/itbi/saoPauloItbi.constants";
import type {
  SaoPauloItbiResult as SaoPauloItbiResultType,
  SaoPauloOperationType,
} from "../../lib/registration/itbi/saoPauloItbi.types";

const OPERATION_LABELS: Record<SaoPauloOperationType, string> = {
  CASH_PURCHASE: "Compra sem financiamento",
  SFH: "Financiamento pelo SFH",
  PAR: "Programa de Arrendamento Residencial — PAR",
  HIS: "Habitação de Interesse Social — HIS",
  CONSORTIUM: "Consórcio",
  SFI: "Financiamento pelo SFI",
};

function formatRate(rate: number): string {
  return `${(rate * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function SaoPauloItbiResult({
  result,
}: {
  result: SaoPauloItbiResultType;
}) {
  if (result.status !== "CALCULATED" || result.totalTax === null) {
    const messages = [...result.errors, ...result.warnings];
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6" aria-labelledby="sp-itbi-review-title">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Revisão necessária</span>
            <h3 id="sp-itbi-review-title" className="mt-3 text-lg font-bold text-amber-950">Revise os dados da operação</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
              {messages.map((message) => <li key={message}>• {message}</li>)}
            </ul>
          </div>
        </div>
      </section>
    );
  }

  const isPotentialExemption = result.ruleApplied === "POTENTIAL_EXEMPTION";
  const rows: Array<[string, string]> = [
    ["Cidade", "São Paulo/SP"],
    ["Ano da regra", String(result.ruleYear)],
    ["Modalidade", OPERATION_LABELS[result.operationType]],
    ["Valor da transação", formatCurrencyBRL(result.purchasePrice)],
    ["Valor Venal de Referência", formatCurrencyBRL(result.referenceValue)],
    ["Base de cálculo utilizada", formatCurrencyBRL(result.baseCalculation)],
  ];
  if (result.financedAmount !== null) {
    rows.push(["Valor financiado ou crédito utilizado", formatCurrencyBRL(result.financedAmount)]);
  }
  if (!isPotentialExemption) {
    rows.push(
      ["Parcela beneficiada", formatCurrencyBRL(result.benefitedFinancing)],
      ["Alíquota da parcela beneficiada", result.benefitedFinancing > 0 ? formatRate(SAO_PAULO_ITBI_REDUCED_RATE) : "Não aplicável"],
      ["ITBI sobre a parcela beneficiada", formatCurrencyBRL(result.reducedTaxAmount)],
      ["Parcela sem benefício", formatCurrencyBRL(result.regularTaxBase)],
      ["Alíquota integral", formatRate(SAO_PAULO_ITBI_GENERAL_RATE)],
      ["ITBI sobre a parcela restante", formatCurrencyBRL(result.regularTaxAmount)]
    );
  }
  rows.push(["Possível isenção", result.exemptionMessage]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="sp-itbi-result-title">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isPotentialExemption ? "bg-amber-50 text-amber-700" : "bg-goodgreen-50 text-goodgreen-700"}`}>
          {isPotentialExemption ? <AlertTriangle className="h-5 w-5" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${isPotentialExemption ? "bg-amber-100 text-amber-800" : "bg-goodgreen-50 text-goodgreen-700"}`}>{result.badge}</span>
          <h3 id="sp-itbi-result-title" className="mt-2 text-lg font-bold text-slate-950">Resultado da simulação</h3>
        </div>
      </div>

      <dl className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <dt className="text-xs font-semibold text-slate-500">{label}</dt>
            <dd className="text-sm font-bold text-slate-900 sm:max-w-[65%] sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>

      <div className={`mt-5 rounded-lg border p-5 ${isPotentialExemption ? "border-amber-200 bg-amber-50" : "border-goodgreen-200 bg-goodgreen-50"}`}>
        <p className={`text-xs font-bold uppercase tracking-[0.14em] ${isPotentialExemption ? "text-amber-800" : "text-goodgreen-700"}`}>
          {isPotentialExemption ? "Estimativa com possível isenção" : "ITBI estimado"}
        </p>
        <p className={`mt-2 text-3xl font-bold ${isPotentialExemption ? "text-amber-950" : "text-goodgreen-800"}`}>{formatCurrencyBRL(result.totalTax)}</p>
      </div>

      <div className="mt-5 rounded-lg border border-goodblue-100 bg-goodblue-50 p-4">
        <h4 className="flex items-center gap-2 text-sm font-bold text-goodblue-900">
          <Info className="h-4 w-4" aria-hidden="true" /> Como chegamos a este resultado
        </h4>
        <p className="mt-3 text-sm leading-6 text-goodblue-900">A base de cálculo corresponde ao maior valor entre o valor da transação e o Valor Venal de Referência.</p>
        <p className="mt-2 text-sm leading-6 text-goodblue-900">{result.explanation}</p>
      </div>

      {result.warnings.map((warning) => (
        <p key={warning} className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">{warning}</p>
      ))}
      <p className="mt-5 text-xs leading-5 text-slate-500">
        Esta é uma estimativa para contratos celebrados em 2026. O valor definitivo depende da regra municipal vigente, do enquadramento da operação e da emissão oficial.
      </p>
    </section>
  );
}

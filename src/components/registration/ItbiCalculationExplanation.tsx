import { Info } from "lucide-react";
import type { SimplifiedItbiResult } from "../../types/registration";
import { formatCurrencyBRL } from "../../lib/fgts/currency";

function formatRate(rate: number): string {
  return `${(rate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function ItbiCalculationExplanation({ result }: { result: SimplifiedItbiResult }) {
  if (result.status !== "CALCULATED" || result.rate === null || result.grossTax === null || result.estimatedItbi === null) return null;
  const isSbc = result.city === "SAO_BERNARDO_DO_CAMPO";

  return (
    <details className="rounded-lg border border-goodblue-100 bg-goodblue-50 p-4 open:pb-5">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-goodblue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodblue-400">
        <Info className="h-4 w-4" aria-hidden="true" /> Como esse cálculo foi feito?
      </summary>
      <ol className="mt-4 space-y-3 text-sm leading-6 text-goodblue-900">
        {isSbc ? (
          <>
            <li><strong>1.</strong> Aplicamos a alíquota de 2,5% sobre o valor de compra e venda.</li>
            <li className="rounded-md bg-white/70 px-3 py-2">{formatCurrencyBRL(result.purchasePrice)} × {formatRate(result.rate)} = <strong>{formatCurrencyBRL(result.grossTax)}</strong></li>
            <li><strong>2.</strong> Depois, subtraímos a dedução fixa de {formatCurrencyBRL(result.fixedDeduction)}.</li>
            <li className="rounded-md bg-white/70 px-3 py-2">{formatCurrencyBRL(result.grossTax)} − {formatCurrencyBRL(result.fixedDeduction)} = <strong>{formatCurrencyBRL(result.estimatedItbi)}</strong></li>
            <li><strong>3.</strong> O resultado é o ITBI estimado.</li>
          </>
        ) : (
          <>
            <li><strong>1.</strong> Identificamos a faixa correspondente ao valor de compra e venda.</li>
            <li><strong>2.</strong> Aplicamos a alíquota da faixa sobre todo o valor informado.</li>
            <li className="rounded-md bg-white/70 px-3 py-2">{formatCurrencyBRL(result.purchasePrice)} × {formatRate(result.rate)} = <strong>{formatCurrencyBRL(result.estimatedItbi)}</strong></li>
            <li><strong>3.</strong> O resultado é o ITBI estimado.</li>
          </>
        )}
      </ol>
    </details>
  );
}

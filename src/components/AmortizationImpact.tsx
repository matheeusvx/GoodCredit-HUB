import { CheckCircle2, Info, Trash2, TriangleAlert } from "lucide-react";
import { formatCurrencyBR, formatPercentBR } from "../lib/financial";
import { AmortizationImpactSummary } from "../types/amortization";

interface AmortizationImpactProps {
  impact: AmortizationImpactSummary;
  hasManual: boolean;
  hasFgts: boolean;
  onClearManual: () => void;
  onClearFgts: () => void;
  onClearAll: () => void;
}

const explanations = [
  ["Total amortizado", "Soma dos aportes manuais e dos valores de FGTS efetivamente utilizados para reduzir o saldo devedor."],
  ["Aportes manuais", "Soma dos valores manuais efetivamente aplicados. Valores excedentes ou posteriores à quitação não são contabilizados."],
  ["Total de FGTS utilizado", "Soma dos aportes de FGTS efetivamente aplicados. Valores excedentes ou posteriores à quitação não são contabilizados."],
  ["Economia em juros", "Diferença entre os juros projetados no contrato original e os juros projetados após as amortizações."],
  ["Prazo após as amortizações", "Quantidade de parcelas necessárias até o saldo devedor corrigido chegar a zero."],
  ["Parcelas eliminadas", "Diferença entre o prazo original e o mês efetivo de quitação."],
  ["Redução do custo total", "Diferença entre o total projetado no contrato original e o total projetado após as amortizações efetivamente aplicadas."]
] as const;

export function AmortizationImpact({
  impact,
  hasManual,
  hasFgts,
  onClearManual,
  onClearFgts,
  onClearAll
}: AmortizationImpactProps) {
  const hasUnused = impact.unusedManualAmount > 0 || impact.unusedFgtsAmount > 0;

  return (
    <section id="amortization-impact" className="rounded-lg border border-slate-200 bg-white shadow-panel">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-goodgreen-600">Cenário corrigido</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Impacto das Amortizações</h2>
          <p className="mt-1 text-sm text-slate-500">Somente valores efetivamente aplicados ao saldo entram nos indicadores.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasManual && (
            <button type="button" onClick={onClearManual} className="btn-muted text-amber-700">
              <Trash2 className="h-4 w-4" /> Limpar Aportes Manuais
            </button>
          )}
          {hasFgts && (
            <button type="button" onClick={onClearFgts} className="btn-muted text-goodgreen-700">
              <Trash2 className="h-4 w-4" /> Limpar FGTS
            </button>
          )}
          {hasManual && hasFgts && (
            <button type="button" onClick={onClearAll} className="btn-muted text-red-700">
              <Trash2 className="h-4 w-4" /> Limpar Tudo
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
        <ImpactMetric
          label="Total amortizado"
          value={formatCurrencyBR(impact.totalAmortizationApplied)}
          detail={`Manual ${formatCurrencyBR(impact.manualAmortizationApplied)} · FGTS ${formatCurrencyBR(impact.fgtsAmortizationApplied)}`}
          tone="green"
        />
        <ImpactMetric
          label="Aportes manuais"
          value={formatCurrencyBR(impact.manualAmortizationApplied)}
          detail={`${formatPercentBR(impact.manualSharePercent)} do total amortizado`}
          tone="amber"
        />
        <ImpactMetric
          label="FGTS utilizado"
          value={formatCurrencyBR(impact.fgtsAmortizationApplied)}
          detail={`${formatPercentBR(impact.fgtsSharePercent)} do total amortizado`}
          tone="green"
        />
        <ImpactMetric
          label="Economia em juros"
          value={formatCurrencyBR(impact.interestSavings)}
          detail={`${formatPercentBR(impact.interestSavingsPercent)} dos juros originais`}
          tone="green"
        />
        <ImpactMetric
          label="Prazo após as amortizações"
          value={`${impact.correctedTermMonths} ${impact.correctedTermMonths === 1 ? "mês" : "meses"}`}
          detail={`${formatPercentBR(impact.termReductionPercent)} de redução no prazo`}
          tone="blue"
        />
        <ImpactMetric
          label="Parcelas eliminadas"
          value={impact.eliminatedInstallments > 0 ? String(impact.eliminatedInstallments) : "Nenhuma"}
          detail={`Prazo original: ${impact.originalTermMonths} meses`}
          tone="blue"
        />
        <ImpactMetric
          label="Redução do custo total"
          value={formatCurrencyBR(impact.totalCostReduction)}
          detail={`${formatPercentBR(impact.totalCostReductionPercent)} de redução`}
          tone="green"
        />
        <ImpactMetric
          label="Novo total projetado"
          value={formatCurrencyBR(impact.correctedProjectedTotal)}
          detail={`Original: ${formatCurrencyBR(impact.originalProjectedTotal)}`}
          tone="slate"
        />
      </div>

      {impact.paidOff && impact.payoffMonth && (
        <div className="m-5 rounded-lg border border-goodgreen-200 bg-goodgreen-50 p-4 text-sm text-goodgreen-800">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Financiamento quitado na parcela {impact.payoffMonth}.</p>
              <p className="mt-1">Foram eliminadas {impact.eliminatedInstallments} parcelas. Todo o saldo devedor foi abatido.</p>
              {hasUnused && <p className="mt-1">Aportes excedentes ou posteriores à quitação não foram utilizados.</p>}
            </div>
          </div>
        </div>
      )}

      {hasUnused && (
        <div className="mx-5 mb-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            O último aporte foi limitado ao saldo restante ou estava programado após a quitação. Não utilizado: manual {formatCurrencyBR(impact.unusedManualAmount)} e FGTS {formatCurrencyBR(impact.unusedFgtsAmount)}.
          </p>
        </div>
      )}

      <details className="border-t border-slate-200 p-5">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-slate-800">
          <Info className="h-5 w-5 text-goodblue-600" /> Como esses valores são calculados?
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {explanations.map(([title, text]) => (
            <div key={title}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 rounded-lg bg-goodblue-50 px-4 py-3 text-sm text-goodblue-800">
          Esta é uma projeção matemática. Os valores reais podem variar conforme atualização do saldo, seguros, encargos, indexadores e regras do contrato.
        </p>
      </details>
    </section>
  );
}

function ImpactMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "green" | "amber" | "blue" | "slate" }) {
  const valueClass = {
    green: "text-goodgreen-700",
    amber: "text-amber-700",
    blue: "text-goodblue-700",
    slate: "text-slate-950"
  }[tone];

  return (
    <article className="min-w-0 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 break-words text-xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

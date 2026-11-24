import { ChevronDown, X } from "lucide-react";
import { formatCurrencyBR, formatPercentBR } from "../lib/financial";
import { AmortizationImpactSummary } from "../types/amortization";
import { Roll, useMounted } from "./ui/Roll";

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
  ["Aportes manuais e FGTS", "Somente valores efetivamente aplicados. Excedentes ou valores posteriores à quitação não são contabilizados."],
  ["Economia em juros", "Diferença entre os juros projetados no contrato original e os juros projetados após as amortizações."],
  ["Prazo e parcelas eliminadas", "Parcelas necessárias até o saldo corrigido chegar a zero, comparadas ao prazo original."],
  ["Redução do custo total", "Diferença entre o total projetado no contrato original e o total projetado após as amortizações."],
  ["Ordem de aplicação", "No mesmo mês, o aporte manual é aplicado antes do FGTS, sem dupla contagem nas parcelas corrigidas."]
] as const;

export function AmortizationImpact({ impact, hasManual, hasFgts, onClearManual, onClearFgts, onClearAll }: AmortizationImpactProps) {
  const mounted = useMounted();
  const total = impact.totalAmortizationApplied;
  const manualShare = total > 0 ? impact.manualAmortizationApplied / total : 0;
  const hasUnused = impact.unusedManualAmount > 0 || impact.unusedFgtsAmount > 0;

  return (
    <section id="amortization-impact" className="surface overflow-hidden">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-base font-bold text-ink">Aportes aplicados</h2>
            <p className="text-sm text-ink-muted">
              Custo total <span className="font-semibold text-goodgreen-700">−{formatPercentBR(impact.totalCostReductionPercent)}</span>
            </p>
          </div>
          <p className="mt-3 text-[30px] font-semibold leading-9 tracking-tight text-ink">
            <Roll value={formatCurrencyBR(total)} />
          </p>

          {/* One bar, two sources: the split is the information, so it is the picture. */}
          <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full bg-amber-400 transition-[width] duration-700 ease-out" style={{ width: mounted ? `${manualShare * 100}%` : "0%" }} />
            <div className="h-full bg-goodgreen-500 transition-[width] duration-700 ease-out" style={{ width: mounted && total > 0 ? `${(1 - manualShare) * 100}%` : "0%" }} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <Source
              swatch="bg-amber-400"
              label="Manual"
              value={formatCurrencyBR(impact.manualAmortizationApplied)}
              share={formatPercentBR(impact.manualSharePercent)}
              onClear={hasManual ? onClearManual : undefined}
            />
            <Source
              swatch="bg-goodgreen-500"
              label="FGTS"
              value={formatCurrencyBR(impact.fgtsAmortizationApplied)}
              share={formatPercentBR(impact.fgtsSharePercent)}
              onClear={hasFgts ? onClearFgts : undefined}
            />
          </dl>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200/80 bg-slate-200/80">
          <Fact label="Redução do custo" value={formatCurrencyBR(impact.totalCostReduction)} />
          <Fact label="Novo total projetado" value={formatCurrencyBR(impact.correctedProjectedTotal)} />
          <Fact label="Prazo corrigido" value={`${impact.correctedTermMonths} ${impact.correctedTermMonths === 1 ? "mês" : "meses"}`} />
          <Fact label="Parcelas eliminadas" value={impact.eliminatedInstallments > 0 ? String(impact.eliminatedInstallments) : "0"} />
        </dl>
      </div>

      {(impact.paidOff && impact.payoffMonth) || hasUnused ? (
        <div className="space-y-2 px-5 pb-5 sm:px-6">
          {impact.paidOff && impact.payoffMonth && (
            <p className="rounded-lg bg-goodgreen-50 px-4 py-3 text-sm text-goodgreen-800 animate-rise">
              <strong className="font-semibold">Quitado na parcela {impact.payoffMonth}</strong>, {impact.eliminatedInstallments} parcelas antes do prazo.
            </p>
          )}
          {hasUnused && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 animate-rise">
              Parte dos aportes não foi usada (limitada ao saldo ou após a quitação): manual {formatCurrencyBR(impact.unusedManualAmount)}, FGTS {formatCurrencyBR(impact.unusedFgtsAmount)}.
            </p>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:px-6">
        <details className="group min-w-0 flex-1">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink">
            Como os valores são calculados
            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid gap-x-8 gap-y-4 pb-2 md:grid-cols-2 xl:grid-cols-3">
            {explanations.map(([title, text]) => (
              <div key={title}>
                <h3 className="font-sans text-[13px] font-semibold tracking-normal text-ink-soft">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{text}</p>
              </div>
            ))}
          </div>
        </details>
        {hasManual && hasFgts && (
          <button type="button" onClick={onClearAll} className="shrink-0 self-start text-sm font-medium text-rose-600 transition hover:text-rose-700">
            Limpar todos
          </button>
        )}
      </div>
    </section>
  );
}

function Source({ swatch, label, value, share, onClear }: { swatch: string; label: string; value: string; share: string; onClear?: () => void }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-2 text-[13px] text-ink-muted">
        <span className={`h-2 w-2 rounded-sm ${swatch}`} aria-hidden="true" />
        {label} <span className="text-slate-400">· {share}</span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
            title={`Limpar aportes ${label === "Manual" ? "manuais" : "de FGTS"}`}
            aria-label={`Limpar aportes ${label === "Manual" ? "manuais" : "de FGTS"}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </dt>
      <dd className="mt-0.5 text-[15px] font-semibold text-ink">
        <Roll value={value} />
      </dd>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold text-ink">
        <Roll value={value} />
      </dd>
    </div>
  );
}

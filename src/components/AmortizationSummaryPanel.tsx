import { ArrowRight } from "lucide-react";
import { formatCurrencyBR, formatPercentBR } from "../lib/financial";
import { AmortizationSummary } from "../types/amortization";
import { Roll, useMounted } from "./ui/Roll";

/**
 * The contract read left to right: what was signed, what it becomes with aportes,
 * and what that saves. The saving is the one tinted column — it is the result.
 */
export function AmortizationSummaryPanel({ summary }: { summary: AmortizationSummary }) {
  const mounted = useMounted();
  const hasSavings = summary.economiaJuros > 0.005 || summary.reducaoParcelas > 0;
  const totalRatio = summary.totalOriginal > 0 ? summary.totalPago / summary.totalOriginal : 1;
  const months = (value: number) => `${value} ${value === 1 ? "mês" : "meses"}`;

  return (
    <section className="surface overflow-hidden" aria-label="Resumo do financiamento">
      <div className="grid lg:grid-cols-[1fr_auto_1fr_1.05fr]">
        <Column
          title="Contrato original"
          headline={formatCurrencyBR(summary.totalOriginal)}
          headlineLabel="Total a pagar"
          rows={[
            ["Valor financiado", formatCurrencyBR(summary.valorFinanciado)],
            ["Juros", formatCurrencyBR(summary.jurosContrato)],
            ["Prazo", `${months(summary.prazoOriginal)} · ${summary.sistema}`]
          ]}
        />

        <div className="hidden items-center justify-center lg:flex" aria-hidden="true">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>

        <Column
          title="Com amortizações"
          headline={formatCurrencyBR(summary.totalPago)}
          headlineLabel="Total a pagar"
          rows={[
            ["Aportes aplicados", formatCurrencyBR(summary.totalAportes)],
            ["Juros", formatCurrencyBR(summary.jurosPago)],
            ["Prazo", months(summary.prazoAtual)]
          ]}
          className="border-t border-slate-100 lg:border-t-0"
        >
          <div className="mt-4" aria-hidden="true">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="meter absolute inset-y-0 left-0 w-full rounded-full bg-goodblue-500"
                style={{ transform: `scaleX(${mounted ? Math.min(1, totalRatio) : 0})` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">
              {formatPercentBR(Math.min(1, totalRatio))} do custo original
            </p>
          </div>
        </Column>

        <div className="border-t border-goodgreen-100 bg-gradient-to-br from-goodgreen-50 to-goodgreen-50/30 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <p className="text-[13px] font-semibold text-goodgreen-800">Economia</p>
          <p className="mt-3 text-[13px] text-goodgreen-700/80">Juros economizados</p>
          <p className="text-[30px] font-semibold leading-9 tracking-tight text-goodgreen-700">
            <Roll value={formatCurrencyBR(summary.economiaJuros)} />
          </p>
          {hasSavings ? (
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <Fact label="Redução de juros" value={formatPercentBR(summary.percentualReducaoJuros)} tone="text-goodgreen-800" />
              <Fact
                label="Parcelas a menos"
                value={`${summary.reducaoParcelas}`}
                detail={formatPercentBR(summary.percentualReducaoParcelas)}
                tone="text-goodgreen-800"
              />
            </dl>
          ) : (
            <p className="mt-4 max-w-[30ch] text-sm leading-6 text-goodgreen-800/80">
              Adicione aportes manuais ou de FGTS para ver quanto o cliente economiza.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Column({
  title,
  headline,
  headlineLabel,
  rows,
  children,
  className = ""
}: {
  title: string;
  headline: string;
  headlineLabel: string;
  rows: Array<[string, string]>;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-5 sm:p-6 ${className}`}>
      <p className="text-[13px] font-semibold text-ink-soft">{title}</p>
      <p className="mt-3 text-[13px] text-ink-muted">{headlineLabel}</p>
      <p className="text-[30px] font-semibold leading-9 tracking-tight text-ink">
        <Roll value={headline} />
      </p>
      <dl className="mt-4 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 text-sm">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="tabular font-medium text-ink-soft">
              <Roll value={value} />
            </dd>
          </div>
        ))}
      </dl>
      {children}
    </div>
  );
}

function Fact({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone: string }) {
  return (
    <div>
      <dt className="text-xs text-goodgreen-700/80">{label}</dt>
      <dd className={`mt-0.5 text-lg font-semibold ${tone}`}>
        <Roll value={value} />
        {detail && <span className="ml-1.5 text-xs font-medium text-goodgreen-700/80">{detail}</span>}
      </dd>
    </div>
  );
}

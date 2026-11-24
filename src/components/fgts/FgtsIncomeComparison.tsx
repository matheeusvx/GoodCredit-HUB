import { formatCurrencyBR, formatPercentBR } from "../../lib/financial";
import type { FgtsIncomeForm, FgtsIncomeResult } from "../../types/fgts";
import { Roll, useMounted } from "../ui/Roll";

function formatCompetence(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return "—";
  const [year, month] = value.split("-");
  return `${month}/${year}`;
}

/**
 * The rule "the higher valid value is used" is shown, not written: holerite and FGTS sit side by side,
 * each bar is its share of the higher one, and the winner carries the "Considerado" tag.
 */
export function FgtsIncomeComparison({ form, result }: { form: FgtsIncomeForm; result: FgtsIncomeResult }) {
  const mounted = useMounted();
  const confirmed = result.status === "COMPETENCES_CONFIRMED";
  const max = Math.max(form.payslipGross, result.estimatedIncome, 1);
  const winner = result.provisionalOption; // FGTS | PAYSLIP | EQUIVALENT
  const hasValues = form.payslipGross > 0 || result.estimatedIncome > 0;

  const statusTone =
    result.status === "COMPETENCES_CONFIRMED"
      ? "bg-goodgreen-50 text-goodgreen-800 ring-goodgreen-200"
      : result.status === "COMPETENCES_DIVERGENT"
        ? "bg-rose-50 text-rose-800 ring-rose-200"
        : "bg-amber-50 text-amber-800 ring-amber-200";

  const instruction =
    result.status === "COMPETENCES_DIVERGENT"
      ? "Corrija as competências antes de escolher a opção."
      : result.status === "REVIEW_REQUIRED"
        ? "Revise o depósito antes de usar esta recomendação."
        : !confirmed
          ? "Conclua as validações para confirmar a opção."
          : result.recommendedOption === "EQUIVALENT"
            ? "Valores equivalentes: siga a orientação operacional do processo."
            : "É o maior valor entre holerite e FGTS.";

  const sides = [
    { key: "PAYSLIP", label: "Holerite", sub: `Bruto · ${formatCompetence(form.payslipCompetence)}`, value: form.payslipGross },
    {
      key: "FGTS",
      label: "FGTS",
      sub: `${formatCurrencyBR(form.monthlyDeposit)} ÷ ${form.contributionRate > 0 ? formatPercentBR(form.contributionRate) : "?"} · ${formatCompetence(form.depositCompetence)}`,
      value: result.estimatedIncome
    }
  ] as const;

  return (
    <section className="mt-6 border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-ink">Comparação de renda</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusTone}`}>{result.statusLabel}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {sides.map((side) => {
          const isWinner = hasValues && (winner === side.key || winner === "EQUIVALENT");
          return (
            <div
              key={side.key}
              className={`rounded-xl border p-4 transition-colors duration-300 ${
                isWinner ? "border-goodgreen-300 bg-goodgreen-50/50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-soft">{side.label}</p>
                {isWinner && (
                  <span className="animate-fade rounded-full bg-goodgreen-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Considerado
                  </span>
                )}
              </div>
              <p className={`mt-2 text-2xl font-semibold tracking-tight ${isWinner ? "text-goodgreen-800" : "text-ink"}`}>
                <Roll value={formatCurrencyBR(side.value)} />
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div
                  className={`meter h-full w-full rounded-full ${isWinner ? "bg-goodgreen-500" : "bg-slate-300"}`}
                  style={{ transform: `scaleX(${mounted ? side.value / max : 0})` }}
                />
              </div>
              <p className="mt-2 truncate text-xs text-ink-muted">{side.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-ink-muted">Selecionar no Caixa Aqui</p>
          <p className="text-base font-semibold text-ink">{result.recommendedOptionLabel}</p>
          <p className="text-[13px] text-ink-muted">{instruction}</p>
        </div>
        <dl className="flex gap-6 text-right">
          <div>
            <dt className="text-xs text-ink-muted">Diferença</dt>
            <dd className="tabular text-sm font-semibold text-ink-soft">{formatCurrencyBR(Math.abs(result.differenceAmount))}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Em %</dt>
            <dd className="tabular text-sm font-semibold text-ink-soft">
              {result.differencePercent === null ? "—" : formatPercentBR(Math.abs(result.differencePercent))}
            </dd>
          </div>
        </dl>
      </div>

      {result.warnings.map((warning) => (
        <p key={warning} className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {warning}
        </p>
      ))}
    </section>
  );
}

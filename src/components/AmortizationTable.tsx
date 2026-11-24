import { useMemo, useState } from "react";
import { formatCurrencyBR } from "../lib/financial";
import { AmortizationRow } from "../types/amortization";
import { SegmentedControl } from "./ui/SegmentedControl";

interface AmortizationTableProps {
  rows: AmortizationRow[];
  onManualContributionChange: (month: number, value: number) => void;
  onFgtsContributionChange: (month: number, value: number) => void;
}

type View = "summary" | "full";
type Filter = "all" | "contributions";

type Column = {
  key: string;
  label: string;
  value: (row: AmortizationRow) => number;
  strong?: boolean;
  full?: boolean;
};

const money = (value: number) => (value > 0.004 ? formatCurrencyBR(value) : "–");

// Same four questions for both scenarios: what you pay, how much is interest,
// how much goes to principal, what is left. The full view adds the intermediate balances.
const CORRECTED: Column[] = [
  { key: "s-initial", label: "Saldo inicial", value: (r) => r.simulatedInitialBalance, full: true },
  { key: "s-installment", label: "Parcela", value: (r) => r.simulatedInstallment, strong: true },
  { key: "s-interest", label: "Juros", value: (r) => r.simulatedInterest },
  { key: "s-current", label: "Saldo atual", value: (r) => r.simulatedCurrentBalance, full: true },
  { key: "s-amortization", label: "Amortização", value: (r) => r.simulatedAmortization },
  { key: "s-final", label: "Saldo devedor", value: (r) => r.simulatedFinalBalance }
];

const CONTRACT: Column[] = [
  { key: "c-initial", label: "Saldo inicial", value: (r) => r.contractInitialBalance, full: true },
  { key: "c-installment", label: "Parcela", value: (r) => r.contractInstallment, strong: true },
  { key: "c-interest", label: "Juros", value: (r) => r.contractInterest },
  { key: "c-current", label: "Saldo atual", value: (r) => r.contractCurrentBalance, full: true },
  { key: "c-amortization", label: "Amortização", value: (r) => r.contractAmortization },
  { key: "c-final", label: "Saldo devedor", value: (r) => r.contractFinalBalance }
];

export function AmortizationTable({ rows, onManualContributionChange, onFgtsContributionChange }: AmortizationTableProps) {
  const [view, setView] = useState<View>("summary");
  const [filter, setFilter] = useState<Filter>("all");

  const corrected = CORRECTED.filter((column) => view === "full" || !column.full);
  const contract = CONTRACT.filter((column) => view === "full" || !column.full);

  const contributionCount = useMemo(
    () => rows.filter((row) => row.manualContribution > 0 || row.fgtsContribution > 0).length,
    [rows]
  );
  const visibleRows = filter === "contributions"
    ? rows.filter((row) => row.manualContribution > 0 || row.fgtsContribution > 0 || row.payoff)
    : rows;

  return (
    <section className="surface overflow-hidden" aria-labelledby="schedule-title">
      <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="schedule-title" className="text-base font-bold text-ink">Cronograma de amortização</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {rows.length} parcelas · digite um aporte direto na linha para recalcular.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            size="sm"
            label="Linhas exibidas"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Todas", badge: rows.length },
              { value: "contributions", label: "Com aporte", badge: contributionCount }
            ]}
          />
          <SegmentedControl
            size="sm"
            label="Colunas exibidas"
            value={view}
            onChange={setView}
            options={[
              { value: "summary", label: "Resumida" },
              { value: "full", label: "Completa" }
            ]}
          />
        </div>
      </div>

      <div className="max-h-[680px] overflow-auto border-t border-slate-200/80">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="table-group sticky left-0 z-10 text-ink-muted" rowSpan={1}>&nbsp;</th>
              <GroupHeader label="Aportes" span={2} accent="bg-amber-400" className="bg-amber-50/40" />
              <GroupHeader label="Com amortizações" span={corrected.length} accent="bg-goodgreen-500" />
              <GroupHeader label="Contrato original" span={contract.length} accent="bg-slate-300" divider />
            </tr>
            <tr>
              <th className="table-head sticky left-0 z-10 bg-slate-50 text-left">Parcela</th>
              <th className="table-head bg-amber-50/95">Manual</th>
              <th className="table-head bg-amber-50/95">FGTS</th>
              {corrected.map((column) => (
                <th key={column.key} className="table-head">{column.label}</th>
              ))}
              {contract.map((column, index) => (
                <th key={column.key} className={`table-head ${index === 0 ? "border-l border-l-slate-200" : ""}`}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const hasContribution = row.manualContribution > 0 || row.fgtsContribution > 0;
              const muted = row.afterPayoff;
              return (
                <tr
                  key={row.month}
                  className={`group ${muted ? "text-slate-400" : ""} ${row.payoff ? "bg-goodgreen-50/70" : "hover:bg-slate-50/80"}`}
                >
                  <td
                    className={`table-cell sticky left-0 z-[1] text-left ${
                      row.payoff ? "bg-goodgreen-50" : "bg-white group-hover:bg-slate-50"
                    } ${hasContribution ? "shadow-[inset_3px_0_0_theme(colors.amber.400)]" : ""}`}
                  >
                    <span className="font-semibold text-ink">{row.month}</span>
                    <span className="ml-2 text-xs text-ink-muted">faltam {row.remainingMonths}</span>
                    {row.payoff && (
                      <span className="ml-2 rounded-full bg-goodgreen-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Quitado
                      </span>
                    )}
                  </td>
                  <td className="table-cell bg-amber-50/30 py-1.5">
                    <ContributionInput
                      label={`Amortização manual da parcela ${row.month}`}
                      value={row.manualContribution}
                      applied={row.manualContributionApplied}
                      onChange={(value) => onManualContributionChange(row.month, value)}
                    />
                  </td>
                  <td className="table-cell bg-amber-50/30 py-1.5">
                    <ContributionInput
                      label={`Amortização FGTS da parcela ${row.month}`}
                      value={row.fgtsContribution}
                      applied={row.fgtsContributionApplied}
                      onChange={(value) => onFgtsContributionChange(row.month, value)}
                    />
                  </td>
                  {corrected.map((column) => (
                    <td key={column.key} className={`table-cell ${column.strong && !muted ? "font-semibold text-goodgreen-700" : ""}`}>
                      {muted ? "–" : money(column.value(row))}
                    </td>
                  ))}
                  {contract.map((column, index) => (
                    <td
                      key={column.key}
                      className={`table-cell ${index === 0 ? "border-l border-l-slate-200" : ""} ${column.strong ? "font-medium text-ink-soft" : "text-ink-muted"}`}
                    >
                      {money(column.value(row))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleRows.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-ink-muted">Nenhuma parcela com aporte ainda.</p>
        )}
      </div>
    </section>
  );
}

function GroupHeader({ label, span, accent, divider = false, className = "" }: { label: string; span: number; accent: string; divider?: boolean; className?: string }) {
  return (
    <th colSpan={span} className={`table-group text-ink-soft ${divider ? "border-l border-l-slate-200" : ""} ${className}`}>
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-sm ${accent}`} aria-hidden="true" />
        {label}
      </span>
    </th>
  );
}

function ContributionInput({ label, value, applied, onChange }: { label: string; value: number; applied: number; onChange: (value: number) => void }) {
  const partial = value > 0 && applied + 0.005 < value;
  return (
    <div className="flex flex-col items-end">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-slate-400">R$</span>
        <input
          type="number"
          min={0}
          step="100"
          value={value || ""}
          placeholder="0"
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
          className={`h-8 w-32 rounded-md border pl-7 pr-2 text-right text-sm font-medium outline-none transition [appearance:textfield] placeholder:text-slate-300 focus:border-goodgreen-500 focus:bg-white focus:ring-4 focus:ring-goodgreen-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            value > 0
              ? "border-amber-200 bg-white text-ink"
              : "border-transparent bg-transparent text-ink-soft hover:border-slate-200 hover:bg-white"
          }`}
          aria-label={label}
        />
      </div>
      {partial && (
        <p className="mt-0.5 text-[10px] font-medium text-amber-700">Aplicado {formatCurrencyBR(applied)}</p>
      )}
    </div>
  );
}

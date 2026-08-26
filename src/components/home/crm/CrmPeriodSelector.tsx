import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CrmAnalyticsPeriodKey } from "../../../types/crmDashboard";
import {
  formatCrmPeriodLabel,
  resolveCrmPeriodDateRange,
  validateCustomDateRange,
} from "./crmDashboardUtils";

const periods: Array<{ key: Exclude<CrmAnalyticsPeriodKey, "custom">; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "month", label: "Este mês" },
];

export function CrmPeriodSelector({
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustom,
  now,
}: {
  period: CrmAnalyticsPeriodKey;
  onPeriodChange: (period: CrmAnalyticsPeriodKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onApplyCustom: () => void;
  now: Date;
}) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const customError = validateCustomDateRange(customFrom, customTo);
  const range = resolveCrmPeriodDateRange(period, customFrom, customTo, now);
  const rangeLabel = formatCrmPeriodLabel(range.from, range.to);

  useEffect(() => {
    if (!open) return;
    const closeWhenOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !containerRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function selectPreset(next: Exclude<CrmAnalyticsPeriodKey, "custom">) {
    onPeriodChange(next);
    setCustomMode(false);
    setOpen(false);
  }

  function applyCustomPeriod() {
    if (customError) return;
    onApplyCustom();
    setCustomMode(false);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative inline-flex max-w-full">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Selecionar período. Período atual: ${rangeLabel}`}
        onClick={() => {
          setOpen((current) => {
            const next = !current;
            if (next) setCustomMode(period === "custom");
            return next;
          });
        }}
        className="inline-flex h-10 max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <span className="truncate">{rangeLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Escolher período dos indicadores"
          className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 sm:left-auto sm:right-0"
        >
          <div className="space-y-0.5">
            {periods.map((item) => {
              const selected = period === item.key && !customMode;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectPreset(item.key)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${selected ? "bg-goodgreen-50 font-semibold text-goodgreen-700" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  {item.label}
                  {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={period === "custom" || customMode}
              onClick={() => setCustomMode(true)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${period === "custom" || customMode ? "bg-goodgreen-50 font-semibold text-goodgreen-700" : "text-slate-700 hover:bg-slate-50"}`}
            >
              Personalizado
              {(period === "custom" || customMode) && <Check className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>

          {customMode && (
            <div className="mt-2 space-y-3 border-t border-slate-100 px-2 pb-1 pt-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Data inicial
                  <input
                    aria-label="Data inicial"
                    type="date"
                    value={customFrom}
                    onChange={(event) => onCustomFromChange(event.target.value)}
                    className="mt-1 h-10 w-full min-w-0 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 outline-none transition focus:border-goodgreen-500 focus:ring-2 focus:ring-goodgreen-100"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Data final
                  <input
                    aria-label="Data final"
                    type="date"
                    value={customTo}
                    onChange={(event) => onCustomToChange(event.target.value)}
                    className="mt-1 h-10 w-full min-w-0 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 outline-none transition focus:border-goodgreen-500 focus:ring-2 focus:ring-goodgreen-100"
                  />
                </label>
              </div>
              {customError && customFrom && customTo && (
                <p className="text-xs font-medium text-red-600">{customError}</p>
              )}
              <button
                type="button"
                disabled={Boolean(customError)}
                onClick={applyCustomPeriod}
                className="h-9 w-full rounded-lg bg-goodgreen-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-goodgreen-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Aplicar período
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

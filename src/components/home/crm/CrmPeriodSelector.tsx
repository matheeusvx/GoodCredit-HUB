import type { CrmAnalyticsPeriodKey } from "../../../types/crmDashboard";
import { validateCustomDateRange } from "./crmDashboardUtils";

const periods: Array<{ key: CrmAnalyticsPeriodKey; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Este mês" },
  { key: "custom", label: "Personalizado" },
];

export function CrmPeriodSelector({ period, onPeriodChange, customFrom, customTo, onCustomFromChange, onCustomToChange, onApplyCustom }: {
  period: CrmAnalyticsPeriodKey;
  onPeriodChange: (period: CrmAnalyticsPeriodKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onApplyCustom: () => void;
}) {
  const customError = period === "custom" ? validateCustomDateRange(customFrom, customTo) : null;
  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" aria-label="Período dos indicadores">
        {periods.map((item) => (
          <button key={item.key} type="button" onClick={() => onPeriodChange(item.key)} aria-pressed={period === item.key} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500 ${period === item.key ? "bg-white text-goodgreen-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
            {item.label}
          </button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-bold text-slate-600">De<input aria-label="Data inicial" type="date" value={customFrom} onChange={(event) => onCustomFromChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-goodgreen-500 focus:ring-2 focus:ring-goodgreen-100" /></label>
          <label className="flex-1 text-xs font-bold text-slate-600">Até<input aria-label="Data final" type="date" value={customTo} onChange={(event) => onCustomToChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-goodgreen-500 focus:ring-2 focus:ring-goodgreen-100" /></label>
          <button type="button" className="btn-primary h-10" disabled={Boolean(customError)} onClick={onApplyCustom}>Aplicar período</button>
          {customError && customFrom && customTo && <p className="text-xs font-medium text-red-600 sm:max-w-48">{customError}</p>}
        </div>
      )}
    </div>
  );
}

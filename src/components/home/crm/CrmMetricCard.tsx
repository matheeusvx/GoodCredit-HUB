import type { LucideIcon } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import type { CrmAnalyticsMetricComparison } from "../../../types/crmDashboard";
import { Roll } from "../../ui/Roll";
import { MetricDelta } from "./MetricDelta";
import { normalizeSparklineValues } from "./crmDashboardUtils";

export function CrmMetricCard({ label, value, comparison, lowerIsBetter, sparkline, note }: {
  label: string;
  value: string;
  icon?: LucideIcon;
  comparison: CrmAnalyticsMetricComparison | null;
  lowerIsBetter?: boolean;
  sparkline?: Array<number | null | undefined>;
  note?: string;
}) {
  const points = normalizeSparklineValues(sparkline || []);
  return (
    <article className="group min-w-0 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:shadow-panel">
      <p className="text-[13px] font-medium text-ink-muted">{label}</p>
      <div className="mt-3 flex min-h-12 items-end justify-between gap-3">
        <p className="truncate text-3xl font-semibold tracking-tight text-ink"><Roll value={value} /></p>
        {points.length >= 2 && (
          <div className="h-8 w-[88px] shrink-0 overflow-hidden rounded" aria-hidden="true" data-testid="crm-metric-sparkline">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 3, right: 2, bottom: 3, left: 2 }}>
                <Line type="monotone" dataKey="metric" stroke="#1f7c4e" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="mt-3 min-h-7">
        {note ? <p className="text-xs leading-5 text-slate-500">{note}</p> : <MetricDelta comparison={comparison} lowerIsBetter={lowerIsBetter} />}
      </div>
    </article>
  );
}

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { CrmAnalyticsMetricComparison } from "../../../types/crmDashboard";
import { metricDeltaPresentation } from "./crmDashboardUtils";

export function MetricDelta({ comparison, lowerIsBetter = false }: {
  comparison: CrmAnalyticsMetricComparison | null;
  lowerIsBetter?: boolean;
}) {
  const result = metricDeltaPresentation(comparison, lowerIsBetter);
  const styles = {
    positive: "bg-goodgreen-50 text-goodgreen-700",
    negative: "bg-red-50 text-red-700",
    neutral: "bg-slate-100 text-slate-600",
    unavailable: "bg-slate-50 text-slate-500",
  };
  const Icon = comparison?.available && (comparison.absoluteChange || 0) > 0
    ? ArrowUpRight
    : comparison?.available && (comparison.absoluteChange || 0) < 0
      ? ArrowDownRight
      : Minus;
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${styles[result.tone]}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {result.label}
    </span>
  );
}

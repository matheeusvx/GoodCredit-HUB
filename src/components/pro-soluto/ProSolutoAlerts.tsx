import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { ProSolutoAlert } from "../../types/proSoluto";

interface Props {
  alerts: ProSolutoAlert[];
}

const tones = {
  info: "border-goodblue-100 bg-goodblue-50 text-goodblue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
  success: "border-goodgreen-100 bg-goodgreen-50 text-goodgreen-800"
} as const;

const icons = {
  info: Info,
  warning: TriangleAlert,
  danger: AlertCircle,
  success: CheckCircle2
} as const;

export function ProSolutoAlerts({ alerts }: Props) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const Icon = icons[alert.level];
        return (
          <div key={alert.code} className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-sm leading-5 ${tones[alert.level]}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{alert.message}</span>
          </div>
        );
      })}
    </div>
  );
}


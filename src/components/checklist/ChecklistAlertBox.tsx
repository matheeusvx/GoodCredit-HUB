import { AlertTriangle, Info } from "lucide-react";
import { ChecklistAlert } from "../../types/checklist";

interface Props {
  alerts: ChecklistAlert[];
}

export function ChecklistAlertBox({ alerts }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const isDanger = alert.tone === "danger";
        const isInfo = alert.tone === "info";
        return (
          <div
            key={alert.id}
            className={`flex gap-3 rounded-lg border px-3 py-2 text-sm ${
              isDanger
                ? "border-red-200 bg-red-50 text-red-800"
                : isInfo
                  ? "border-goodblue-100 bg-goodblue-50 text-goodblue-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {isInfo ? <Info className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{alert.label}</span>
          </div>
        );
      })}
    </div>
  );
}

import { AlertTriangle, Check, CloudUpload, LoaderCircle, RefreshCw } from "lucide-react";
import {
  COMPLIANCE_SAVE_STATUS_LABELS,
  formatComplianceDateTime
} from "../../lib/compliance-checklist/complianceChecklistPresentation";
import type { ComplianceChecklistSaveStatus } from "../../types/complianceChecklist";

interface Props {
  status: ComplianceChecklistSaveStatus;
  message: string;
  savedAt: string | null;
  onRetry: () => void;
  onReload: () => void;
}

export function ComplianceChecklistSaveStatus({
  status,
  message,
  savedAt,
  onRetry,
  onReload
}: Props) {
  const Icon =
    status === "SAVING"
      ? LoaderCircle
      : status === "SAVED"
        ? Check
        : status === "ERROR" || status === "CONFLICT"
          ? AlertTriangle
          : CloudUpload;

  return (
    <div aria-live="polite" className="space-y-2">
      <div
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
          status === "ERROR" || status === "CONFLICT"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : status === "SAVED"
              ? "border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800"
              : "border-slate-200 bg-white text-slate-600"
        }`}
      >
        <Icon className={`h-4 w-4 ${status === "SAVING" ? "animate-spin" : ""}`} />
        <span>{COMPLIANCE_SAVE_STATUS_LABELS[status]}</span>
        {status === "SAVED" && savedAt && (
          <span className="font-normal text-slate-500">
            às {formatComplianceDateTime(savedAt).split(" ")[1]}
          </span>
        )}
      </div>
      {message && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="min-w-0 flex-1">{message}</span>
          {status === "CONFLICT" ? (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recarregar checklist
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
    </div>
  );
}

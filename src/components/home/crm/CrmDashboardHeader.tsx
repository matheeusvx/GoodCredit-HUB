import { RefreshCw } from "lucide-react";
import type { CrmIntegrationStatus } from "../../../types/crmDashboard";
import {
  formatFullDateTime,
  formatUpdatedLabel,
  getCrmConnectionVisualStatus,
} from "./crmDashboardUtils";

export function CrmDashboardHeader(props: {
  name: string;
  greeting: string;
  status: CrmIntegrationStatus | null;
  lastSyncAt: string | null;
  refreshing: boolean;
  busy: boolean;
  now: Date;
  onRefresh: () => void;
}) {
  const visualStatus = getCrmConnectionVisualStatus({
    integrationStatus: props.status,
    lastSyncAt: props.lastSyncAt,
    refreshing: props.refreshing,
    now: props.now,
  });
  const visuals = {
    connected: { dot: "bg-goodgreen-500", text: "text-slate-600" },
    updating: { dot: "bg-goodblue-500", text: "text-goodblue-700" },
    stale: { dot: "bg-amber-500", text: "text-amber-700" },
    unavailable: { dot: "bg-red-500", text: "text-red-700" },
    unlinked: { dot: "bg-slate-400", text: "text-slate-600" },
    not_configured: { dot: "bg-slate-400", text: "text-slate-600" },
  };
  const visual = visuals[visualStatus.key];
  return (
    <header className="min-w-0 py-1">
      <h1 id="crm-dashboard-title" className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
        Olá, {props.name}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{props.greeting}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium">
        <span className={`inline-flex items-center gap-1.5 ${visual.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${visual.dot}`} aria-hidden="true" />
          {visualStatus.label}
        </span>
        <span className="text-slate-300" aria-hidden="true">·</span>
        <span className="text-slate-500" title={formatFullDateTime(props.lastSyncAt)}>
          {formatUpdatedLabel(props.lastSyncAt, props.now)}
        </span>
        <button
          type="button"
          onClick={props.onRefresh}
          disabled={props.busy}
          className="ml-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-goodgreen-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${props.refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          {props.refreshing ? "Atualizando" : "Atualizar"}
        </button>
      </div>
    </header>
  );
}

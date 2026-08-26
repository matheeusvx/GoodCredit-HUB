import { AlertTriangle, CheckCircle2, Link2Off, RefreshCw, XCircle } from "lucide-react";
import type { CrmAnalyticsPeriodKey, CrmIntegrationStatus } from "../../../types/crmDashboard";
import { CrmPeriodSelector } from "./CrmPeriodSelector";
import {
  formatFullDateTime,
  formatUpdatedLabel,
  getCrmConnectionVisualStatus,
} from "./crmDashboardUtils";

export function CrmDashboardHeader(props: {
  name: string;
  status: CrmIntegrationStatus | null;
  lastSyncAt: string | null;
  refreshing: boolean;
  busy: boolean;
  now: Date;
  onRefresh: () => void;
  period: CrmAnalyticsPeriodKey;
  onPeriodChange: (period: CrmAnalyticsPeriodKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onApplyCustom: () => void;
}) {
  const visualStatus = getCrmConnectionVisualStatus({
    integrationStatus: props.status,
    lastSyncAt: props.lastSyncAt,
    refreshing: props.refreshing,
    now: props.now,
  });
  const visuals = {
    connected: { className: "bg-goodgreen-50 text-goodgreen-700", icon: CheckCircle2 },
    updating: { className: "bg-goodblue-50 text-goodblue-700", icon: RefreshCw },
    stale: { className: "bg-amber-50 text-amber-800", icon: AlertTriangle },
    unavailable: { className: "bg-red-50 text-red-700", icon: XCircle },
    unlinked: { className: "bg-slate-100 text-slate-700", icon: Link2Off },
    not_configured: { className: "bg-slate-100 text-slate-700", icon: Link2Off },
  };
  const visual = visuals[visualStatus.key];
  const StatusIcon = visual.icon;
  return (
    <header className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-panel sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 id="crm-dashboard-title" className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Olá, {props.name} <span aria-hidden="true">👋</span></h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${visual.className}`}>
              <StatusIcon className={`h-3.5 w-3.5 ${visualStatus.key === "updating" ? "animate-spin" : ""}`} aria-hidden="true" />{visualStatus.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">Visão geral da sua operação e dos atendimentos que pedem atenção.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
            <span title={formatFullDateTime(props.lastSyncAt)}>{formatUpdatedLabel(props.lastSyncAt, props.now)}</span>
            <button type="button" onClick={props.onRefresh} disabled={props.busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 transition hover:border-goodgreen-200 hover:text-goodgreen-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500 disabled:opacity-60">
              <RefreshCw className={`h-3.5 w-3.5 ${props.refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              {props.refreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
        <div className="w-full xl:max-w-2xl">
          <CrmPeriodSelector {...props} />
        </div>
      </div>
    </header>
  );
}

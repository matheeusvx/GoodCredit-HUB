import { CheckCircle2, RefreshCw } from "lucide-react";
import type { CrmAnalyticsPeriodKey, CrmIntegrationStatus } from "../../../types/crmDashboard";
import { CrmPeriodSelector } from "./CrmPeriodSelector";
import { formatFullDateTime, formatRelativeTime } from "./crmDashboardUtils";

export function CrmDashboardHeader(props: {
  name: string;
  status: CrmIntegrationStatus | null;
  lastSyncAt: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  period: CrmAnalyticsPeriodKey;
  onPeriodChange: (period: CrmAnalyticsPeriodKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onApplyCustom: () => void;
}) {
  const connected = props.status === "READY" || props.status === "SYNC_ERROR";
  return (
    <header className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-panel sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 id="crm-dashboard-title" className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Olá, {props.name} <span aria-hidden="true">👋</span></h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${connected ? "bg-goodgreen-50 text-goodgreen-700" : "bg-slate-100 text-slate-600"}`}>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{connected ? "CRM conectado" : "CRM indisponível"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">Visão geral da sua operação e dos atendimentos que pedem atenção.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
            <span title={formatFullDateTime(props.lastSyncAt)}>{formatRelativeTime(props.lastSyncAt).replace("há", "Atualizado há")}</span>
            <button type="button" onClick={props.onRefresh} disabled={props.refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 transition hover:border-goodgreen-200 hover:text-goodgreen-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500 disabled:opacity-60">
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

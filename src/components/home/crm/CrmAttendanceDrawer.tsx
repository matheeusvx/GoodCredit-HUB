import { AlertCircle, Clock3, MailCheck, MailOpen, MessageSquareText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCrmAttendanceDetail } from "../../../services/crmDashboardService";
import type {
  CrmAnalyticsPeriodKey,
  CrmAttendanceDetail,
  CrmSessionStatus,
} from "../../../types/crmDashboard";
import { formatDuration, formatFullDateTime } from "./crmDashboardUtils";

const STATUS_LABELS: Record<CrmSessionStatus, string> = {
  UNDEFINED: "Não definido",
  STARTED: "Iniciado",
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  HIDDEN: "Oculto",
};

const MOVEMENT_LABELS: Record<CrmAttendanceDetail["assignmentEvents"][number]["relation"], string> = {
  RECEIVED: "Recebido",
  TRANSFERRED: "Transferido",
  UNASSIGNED: "Responsável removido",
  COMPLETED: "Concluído",
  REOPENED: "Reaberto",
};

type DrawerState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: CrmAttendanceDetail }
  | { status: "error"; message: string };

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function CrmAttendanceDrawer({
  sessionId,
  fallbackName,
  accessToken,
  period,
  from,
  to,
  onClose,
}: {
  sessionId: string;
  fallbackName: string;
  accessToken: string;
  period: CrmAnalyticsPeriodKey;
  from?: string;
  to?: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<DrawerState>({ status: "idle" });
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    void getCrmAttendanceDetail(accessToken, sessionId, {
      period,
      from,
      to,
      signal: controller.signal,
    }).then((data) => {
      if (!controller.signal.aborted) setState({ status: "success", data });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Não foi possível carregar o atendimento.",
      });
    });
    return () => controller.abort();
  }, [accessToken, from, period, sessionId, to]);

  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const detail = state.status === "success" ? state.data : null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-[1px]" role="presentation" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-attendance-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-700">Atendimento</p>
            <h2 id="crm-attendance-drawer-title" className="mt-1 truncate text-xl font-bold text-slate-950">
              {detail?.contactName || fallbackName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {detail ? STATUS_LABELS[detail.status] : "Carregando dados do período..."}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do atendimento"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {state.status === "loading" || state.status === "idle" ? (
          <div className="space-y-4 p-5 sm:p-6" aria-live="polite">
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
            <p className="text-sm text-slate-500">Carregando detalhes do atendimento...</p>
          </div>
        ) : state.status === "error" ? (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:m-6" role="alert">
            <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{state.message}</span>
          </div>
        ) : detail ? (
          <div className="space-y-7 p-5 sm:p-6">
            <section aria-labelledby="attendance-summary-title">
              <h3 id="attendance-summary-title" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Resumo do período</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <SummaryItem label="Mensagens enviadas por você" value={detail.agentMessageCount} />
                <SummaryItem label="Mensagens recebidas" value={detail.customerMessageCount} />
                <SummaryItem label="Total de interações" value={detail.totalRelevantMessages} />
                <SummaryItem label="Tempo médio de resposta" value={formatDuration(detail.averageResponseSeconds)} />
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Primeira interação</dt><dd className="mt-0.5 font-semibold text-slate-800">{formatFullDateTime(detail.firstInteractionAt)}</dd></div>
                <div><dt className="text-slate-500">Última interação</dt><dd className="mt-0.5 font-semibold text-slate-800">{formatFullDateTime(detail.lastInteractionAt)}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="attendance-current-title">
              <h3 id="attendance-current-title" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Situação atual</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <SummaryItem label="Responsável" value={detail.isCurrentlyAssignedToUser ? "Em sua carteira" : "Fora da sua carteira"} />
                <SummaryItem label="Não lidas" value={detail.unreadCount} />
                <SummaryItem label="Aguardando resposta" value={detail.awaitingResponse ? "Sim" : "Não"} />
              </div>
            </section>

            <section aria-labelledby="attendance-movements-title">
              <h3 id="attendance-movements-title" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Movimentações</h3>
              {detail.assignmentCoverage !== "FULL" && (
                <p className="mt-2 text-xs text-slate-500">
                  {detail.assignmentCoverage === "NONE" ? "Histórico de movimentações indisponível neste período." : "Movimentações disponíveis somente após o início do monitoramento."}
                </p>
              )}
              {!detail.assignmentEvents.length ? (
                <p className="mt-3 text-sm text-slate-500">Nenhuma movimentação confiável disponível.</p>
              ) : (
                <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4">
                  {detail.assignmentEvents.map((event, index) => (
                    <li key={`${event.occurredAt}-${event.eventType}-${index}`} className="relative text-sm">
                      <span className="absolute -left-[1.22rem] top-1.5 h-2 w-2 rounded-full bg-goodgreen-500" />
                      <p className="font-semibold text-slate-800">{MOVEMENT_LABELS[event.relation]}</p>
                      <p className="text-xs text-slate-500">{formatFullDateTime(event.occurredAt)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section aria-labelledby="attendance-activity-title">
              <h3 id="attendance-activity-title" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Atividade do período</h3>
              {!detail.activityTimeline.length ? (
                <p className="mt-3 text-sm text-slate-500">Nenhuma interação disponível no período.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {detail.activityTimeline.map((activity, index) => (
                    <li key={`${activity.timestamp}-${activity.actorType}-${index}`} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                      {activity.actorType === "AGENT" ? <MailCheck className="h-4 w-4 shrink-0 text-goodgreen-700" /> : <MailOpen className="h-4 w-4 shrink-0 text-goodblue-700" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{activity.actorType === "AGENT" ? "Você → resposta" : "Cliente → interação"}</p>
                        <p className="truncate text-xs text-slate-500">{formatFullDateTime(activity.timestamp)}{activity.messageType ? ` · ${activity.messageType}` : ""}</p>
                      </div>
                      {activity.actorType === "AGENT" ? <Clock3 className="h-3.5 w-3.5 text-slate-300" /> : <MessageSquareText className="h-3.5 w-3.5 text-slate-300" />}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

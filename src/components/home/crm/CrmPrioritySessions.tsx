import { Search } from "lucide-react";
import type { ReactNode } from "react";
import type {
  CrmAttendedClient,
  CrmDashboardSession,
  CrmSessionStatus,
} from "../../../types/crmDashboard";
import type { SessionFilter } from "./crmDashboardUtils";
import {
  attendedClientSituation,
  filterAndSortAttendedClients,
  filterAndSortSessions,
  formatFullDateTime,
  formatRelativeTime,
} from "./crmDashboardUtils";

const STATUS_LABELS: Record<CrmSessionStatus, string> = {
  UNDEFINED: "Não definido",
  STARTED: "Iniciado",
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  HIDDEN: "Oculto",
};

const filters: Array<{ key: SessionFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "awaiting", label: "Aguardando você" },
  { key: "unread", label: "Não lidos" },
  { key: "inactive", label: "Sem interação >24h" },
  { key: "attended", label: "Clientes atendidos no período" },
];

function pills(session: CrmDashboardSession) {
  const result: Array<{ label: string; className: string }> = [];
  if (session.awaitingResponse) result.push({ label: "Aguardando você", className: "bg-amber-50 text-amber-800" });
  if (session.unreadCount > 0) result.push({ label: `${session.unreadCount} não lida${session.unreadCount === 1 ? "" : "s"}`, className: "bg-goodblue-50 text-goodblue-700" });
  if (session.inactiveOver24h) result.push({ label: "Sem interação >24h", className: "bg-slate-100 text-slate-700" });
  if (!result.length) result.push({ label: "Respondido", className: "bg-goodgreen-50 text-goodgreen-700" });
  return result;
}

function openWithKeyboard(
  event: React.KeyboardEvent<HTMLTableRowElement>,
  open: () => void,
) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  open();
}

export function CrmPrioritySessions({
  sessions,
  attendedClients,
  currentBlessUserId,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onSelectSession,
  exportControl,
}: {
  sessions: CrmDashboardSession[];
  attendedClients: CrmAttendedClient[];
  currentBlessUserId: string;
  filter: SessionFilter;
  search: string;
  onFilterChange: (filter: SessionFilter) => void;
  onSearchChange: (search: string) => void;
  onSelectSession: (session: { sessionId: string; contactName: string }) => void;
  exportControl?: ReactNode;
}) {
  const historical = filter === "attended";
  const currentRows = historical ? [] : filterAndSortSessions(sessions, filter, search);
  const historicalRows = historical ? filterAndSortAttendedClients(attendedClients, search) : [];
  const empty = historical ? historicalRows.length === 0 : currentRows.length === 0;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-panel">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Atendimentos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Acompanhe sua carteira, prioridades e histórico de atendimentos.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:items-center">
            <label className="relative block w-full lg:w-72">
              <span className="sr-only">Buscar cliente</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar cliente..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-goodgreen-500 focus:ring-2 focus:ring-goodgreen-100"
              />
            </label>
            {exportControl}
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => onFilterChange(item.key)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500 ${filter === item.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <p className="p-6 text-sm text-slate-500">
          Nenhum atendimento corresponde aos filtros selecionados.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Última interação</th>
                <th className="px-5 py-3">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historicalRows.map((item) => {
                const situation = attendedClientSituation(item, currentBlessUserId);
                const open = () => onSelectSession({ sessionId: item.sessionId, contactName: item.contactName });
                return (
                  <tr
                    key={item.sessionId}
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir detalhes de ${item.contactName}`}
                    onClick={open}
                    onKeyDown={(event) => openWithKeyboard(event, open)}
                    className="cursor-pointer transition hover:bg-slate-50/90 focus-visible:bg-goodgreen-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-goodgreen-500"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900">{item.contactName}</td>
                    <td className="px-5 py-4 text-slate-600">{STATUS_LABELS[item.currentStatus]}</td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-700" title={formatFullDateTime(item.lastAgentInteractionAt)}>
                        {formatRelativeTime(item.lastAgentInteractionAt)}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">{formatFullDateTime(item.lastAgentInteractionAt)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        {situation}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {currentRows.map((item) => {
                const open = () => onSelectSession({ sessionId: item.sessionId, contactName: item.contactName });
                return (
                  <tr
                    key={item.sessionId}
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir detalhes de ${item.contactName}`}
                    onClick={open}
                    onKeyDown={(event) => openWithKeyboard(event, open)}
                    className="cursor-pointer transition hover:bg-slate-50/90 focus-visible:bg-goodgreen-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-goodgreen-500"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900">{item.contactName}</td>
                    <td className="px-5 py-4 text-slate-600">{STATUS_LABELS[item.status]}</td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-700" title={formatFullDateTime(item.lastInteractionAt)}>
                        {formatRelativeTime(item.lastInteractionAt)}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">{formatFullDateTime(item.lastInteractionAt)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {pills(item).map((pill) => (
                          <span key={pill.label} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${pill.className}`}>
                            {pill.label}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

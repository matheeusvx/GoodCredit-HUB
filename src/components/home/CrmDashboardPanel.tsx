import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BriefcaseBusiness,
  Clock3,
  MessageCircleMore,
  MessageSquareWarning,
  RefreshCw,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getCrmDashboard } from "../../services/crmDashboardService";
import type {
  CrmDashboardResponse,
  CrmDashboardSession,
  CrmSessionStatus,
} from "../../types/crmDashboard";

const STATUS_LABELS: Record<CrmSessionStatus, string> = {
  UNDEFINED: "Não definido",
  STARTED: "Iniciado",
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  HIDDEN: "Oculto",
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (!minutes) return `${remainingSeconds}s`;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatLastInteraction(value: string | null): string {
  if (!value) return "Sem data disponível";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function updatedLabel(value: string | null): string {
  if (!value) return "Ainda não sincronizado";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Atualizado agora";
  if (minutes === 1) return "Atualizado há 1 min";
  if (minutes < 60) return `Atualizado há ${minutes} min`;
  return `Atualizado em ${formatLastInteraction(value)}`;
}

function situation(session: CrmDashboardSession): string {
  if (session.awaitingResponse) return "Aguardando você";
  if (session.inactiveOver24h) return "Sem interação > 24h";
  return "Respondido";
}

function StateNotice({ children, tone = "slate" }: {
  children: React.ReactNode;
  tone?: "slate" | "amber" | "red";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return <div className={`rounded-lg border p-5 text-sm ${tones[tone]}`}>{children}</div>;
}

export function CrmDashboardPanel() {
  const { session, user } = useAuth();
  const [dashboard, setDashboard] = useState<CrmDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh: boolean, signal?: AbortSignal) => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      setDashboard(await getCrmDashboard(session.access_token, { refresh, signal }));
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Não foi possível atualizar os indicadores.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    const controller = new AbortController();
    void load(true, controller.signal);
    return () => controller.abort();
  }, [load]);

  const displayName = useMemo(() =>
    dashboard?.user?.name
    || String(user?.user_metadata?.name || "").trim()
    || user?.email?.split("@")[0]
    || "usuário",
  [dashboard?.user?.name, user?.email, user?.user_metadata?.name]);

  const primaryCards = dashboard ? [
    { label: "Carteira atual", value: String(dashboard.metrics.currentPortfolio), icon: BriefcaseBusiness },
    { label: "Recebidos hoje", value: String(dashboard.metrics.receivedToday), icon: ArrowDownToLine },
    { label: "Transferidos hoje", value: String(dashboard.metrics.transferredToday), icon: ArrowUpFromLine },
    { label: "Tempo médio de resposta", value: formatDuration(dashboard.metrics.averageResponseSecondsToday), icon: Clock3 },
  ] : [];
  const secondaryCards = dashboard ? [
    { label: "Clientes atendidos", value: String(dashboard.metrics.clientsServedToday), icon: UserRoundCheck },
    { label: "Aguardando minha resposta", value: String(dashboard.metrics.awaitingResponse), icon: MessageSquareWarning },
    { label: "Conversas com não lidas", value: String(dashboard.metrics.conversationsWithUnread), icon: MessageCircleMore },
    { label: "Sem interação > 24h", value: String(dashboard.metrics.inactiveOver24h), icon: UsersRound },
  ] : [];

  return (
    <section className="space-y-5" aria-labelledby="crm-dashboard-title">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-700">Olá, {displayName}</p>
          <h1 id="crm-dashboard-title" className="mt-2 text-2xl font-bold text-slate-950">Indicadores operacionais do CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Dados de performance desde agosto/2026.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">{updatedLabel(dashboard?.meta.lastSyncAt || null)}</span>
          <button type="button" className="btn-secondary" disabled={loading} onClick={() => void load(true)}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {loading && !dashboard && <StateNotice>Carregando indicadores...</StateNotice>}
      {error && !dashboard && <StateNotice tone="red"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span></StateNotice>}
      {dashboard?.meta.integrationStatus === "NOT_CONFIGURED" && <StateNotice tone="amber">Integração CRM não configurada.</StateNotice>}
      {dashboard?.meta.integrationStatus === "UNLINKED" && <StateNotice tone="amber">Seu usuário do CRM ainda não está vinculado ao GoodCredit Hub.</StateNotice>}
      {dashboard?.meta.integrationStatus === "SYNC_ERROR" && <StateNotice tone="amber">Não foi possível atualizar os indicadores. Exibindo o último estado sincronizado.</StateNotice>}

      {dashboard?.user && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {primaryCards.map(({ label, value, icon: Icon }) => (
              <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><Icon className="h-5 w-5 text-goodgreen-600" /></div>
                <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
              </article>
            ))}
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Hoje</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {secondaryCards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-lg bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-xs font-semibold">{label}</span></div>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-950">Meus atendimentos</h2>
              <p className="mt-1 text-sm text-slate-500">Conversas atualmente atribuídas a você.</p>
            </div>
            {!dashboard.sessions.length ? (
              <p className="p-5 text-sm text-slate-500">Nenhum atendimento em sua carteira.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Última interação</th><th className="px-5 py-3">Situação</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboard.sessions.map((item) => (
                      <tr key={item.sessionId} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-semibold text-slate-900">{item.contactName}{item.unreadCount > 0 && <span className="ml-2 inline-flex rounded-full bg-goodblue-100 px-2 py-0.5 text-[11px] font-bold text-goodblue-700">{item.unreadCount} não lida{item.unreadCount === 1 ? "" : "s"}</span>}</td>
                        <td className="px-5 py-4 text-slate-600">{STATUS_LABELS[item.status]}</td>
                        <td className="px-5 py-4 text-slate-600">{formatLastInteraction(item.lastInteractionAt)}</td>
                        <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.awaitingResponse ? "bg-amber-100 text-amber-800" : item.inactiveOver24h ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"}`}>{situation(item)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

import type {
  CrmAnalyticsMetricComparison,
  CrmDashboardResponse,
  CrmDashboardSession,
  CrmIntegrationStatus,
} from "../../../types/crmDashboard";
import { CRM_STALE_AFTER_MS, isSyncOlderThan } from "./crmRefresh";

export type SessionFilter = "all" | "awaiting" | "unread" | "inactive";
export type CrmConnectionVisualStatus =
  | "connected"
  | "updating"
  | "stale"
  | "unavailable"
  | "unlinked"
  | "not_configured";

export function getCrmConnectionVisualStatus(options: {
  integrationStatus: CrmIntegrationStatus | null;
  lastSyncAt: string | null;
  refreshing: boolean;
  now?: Date;
}): { key: CrmConnectionVisualStatus; label: string } {
  if (options.integrationStatus === "NOT_CONFIGURED") {
    return { key: "not_configured", label: "CRM não configurado" };
  }
  if (options.integrationStatus === "UNLINKED") {
    return { key: "unlinked", label: "CRM não vinculado" };
  }
  if (options.refreshing) return { key: "updating", label: "Atualizando CRM" };
  if (options.integrationStatus === "SYNC_ERROR") {
    return { key: "unavailable", label: "CRM indisponível" };
  }
  if (
    options.integrationStatus === "READY"
    && !isSyncOlderThan(options.lastSyncAt, CRM_STALE_AFTER_MS, options.now)
  ) {
    return { key: "connected", label: "CRM conectado" };
  }
  if (options.integrationStatus === "READY") {
    return { key: "stale", label: "CRM desatualizado" };
  }
  return { key: "unavailable", label: "CRM indisponível" };
}

export function formatUpdatedLabel(value: string | null, now = new Date()): string {
  if (!value) return "Ainda não sincronizado";
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Atualizado agora";
  if (minutes < 60) return `Atualizado há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Atualizado há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Atualizado há ${days} dia${days === 1 ? "" : "s"}`;
}

export function normalizeSparklineValues(
  values: Array<number | null | undefined>
): Array<{ index: number; metric: number }> {
  const valid = values
    .map((metric, index) => ({ index, metric }))
    .filter((point): point is { index: number; metric: number } =>
      typeof point.metric === "number" && Number.isFinite(point.metric)
    );
  return valid.length >= 2 ? valid : [];
}

export function retainDashboardAfterRefreshError<T>(current: T): T {
  return current;
}

export function formatMetricNumber(value: number | null): string {
  return value === null ? "—" : new Intl.NumberFormat("pt-BR").format(value);
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  return `${remainingSeconds}s`;
}

export function formatPercentage(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Math.abs(value))}%`;
}

export function formatChartDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`)).replace(".", "");
}

export function formatFullDateTime(value: string | null): string {
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

export function formatRelativeTime(value: string | null, now = new Date()): string {
  if (!value) return "sem histórico";
  const milliseconds = Math.max(0, now.getTime() - new Date(value).getTime());
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days === 1 ? "" : "s"}`;
}

export function validateCustomDateRange(from: string, to: string): string | null {
  if (!from || !to) return "Informe as datas inicial e final.";
  if (from > to) return "A data inicial não pode ser posterior à final.";
  const days = Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  return days > 366 ? "O período personalizado deve ter no máximo 366 dias." : null;
}

export function filterAndSortSessions(
  sessions: CrmDashboardSession[],
  filter: SessionFilter,
  search: string
): CrmDashboardSession[] {
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  return sessions
    .filter((session) => {
      if (normalizedSearch && !session.contactName.toLocaleLowerCase("pt-BR").includes(normalizedSearch)) return false;
      if (filter === "awaiting") return session.awaitingResponse;
      if (filter === "unread") return session.unreadCount > 0;
      if (filter === "inactive") return session.inactiveOver24h;
      return true;
    })
    .sort((left, right) => {
      const priority = (session: CrmDashboardSession) => {
        if (session.awaitingResponse) return 0;
        if (session.unreadCount > 0) return 1;
        if (session.inactiveOver24h) return 2;
        return 3;
      };
      return priority(left) - priority(right)
        || new Date(left.lastInteractionAt || 0).getTime() - new Date(right.lastInteractionAt || 0).getTime();
    });
}

export type DeltaTone = "positive" | "negative" | "neutral" | "unavailable";

export function metricDeltaPresentation(
  comparison: CrmAnalyticsMetricComparison | null,
  lowerIsBetter = false
): { tone: DeltaTone; label: string } {
  if (!comparison?.available || comparison.current === null || comparison.previous === null) {
    return { tone: "unavailable", label: "Sem comparação disponível" };
  }
  if (comparison.percentChange === null && comparison.previous === 0 && comparison.current > 0) {
    return { tone: "positive", label: "Novo neste período" };
  }
  const change = comparison.absoluteChange || 0;
  if (change === 0) return { tone: "neutral", label: "Sem variação" };
  const improved = lowerIsBetter ? change < 0 : change > 0;
  return {
    tone: improved ? "positive" : "negative",
    label: `${change > 0 ? "Aumento" : "Redução"} de ${formatPercentage(comparison.percentChange)} vs. período anterior`,
  };
}

export function generateCrmInsights(dashboard: CrmDashboardResponse): string[] {
  const insights: string[] = [];
  const response = dashboard.analytics.comparison.averageResponseSeconds;
  if (response.available && response.percentChange !== null && response.percentChange < 0) {
    insights.push(`Seu tempo médio de resposta caiu ${formatPercentage(response.percentChange)} em relação ao período anterior.`);
  }
  const clients = dashboard.analytics.comparison.clientsServed;
  if (clients.available && clients.percentChange !== null && clients.percentChange > 0) {
    insights.push(`Você atendeu ${formatPercentage(clients.percentChange)} mais clientes neste período.`);
  }
  const health = dashboard.analytics.portfolioHealth;
  if (health.awaitingResponse > 0) {
    insights.push(`Você possui ${health.awaitingResponse} conversa${health.awaitingResponse === 1 ? "" : "s"} aguardando resposta.`);
  }
  if (health.inactiveOver24h > 0) {
    insights.push(`${health.inactiveOver24h} processo${health.inactiveOver24h === 1 ? " está" : "s estão"} sem interação há mais de 24 horas.`);
  }
  return insights.slice(0, 3);
}

import { describe, expect, it } from "vitest";
import type { CrmAttendedClient, CrmDashboardResponse, CrmDashboardSession } from "../../../types/crmDashboard";
import {
  assignmentHistoryNote,
  attendedClientSituation,
  filterAndSortAttendedClients,
  filterAndSortSessions,
  formatChartDate,
  formatCrmPeriodLabel,
  formatDuration,
  formatMetricNumber,
  formatRelativeTime,
  formatUpdatedLabel,
  generateCrmInsights,
  getCrmConnectionVisualStatus,
  metricDeltaPresentation,
  normalizeSparklineValues,
  resolveCrmPeriodDateRange,
  retainDashboardAfterRefreshError,
  selectCrmGreeting,
  validateCustomDateRange,
} from "./crmDashboardUtils";

function session(overrides: Partial<CrmDashboardSession>): CrmDashboardSession {
  return {
    sessionId: "session",
    contactName: "Cliente Teste",
    status: "IN_PROGRESS",
    lastInteractionAt: "2026-08-25T12:00:00Z",
    unreadCount: 0,
    awaitingResponse: false,
    inactiveOver24h: false,
    ...overrides,
  };
}

describe("lógica visual do dashboard CRM", () => {
  it("formata números, duração, datas e tempo relativo", () => {
    expect(formatMetricNumber(1250)).toBe("1.250");
    expect(formatDuration(1266)).toBe("21m 6s");
    expect(formatDuration(null)).toBe("—");
    expect(formatChartDate("2026-08-25")).toContain("25");
    expect(formatRelativeTime("2026-08-23T15:00:00Z", new Date("2026-08-25T15:00:00Z"))).toBe("há 2 dias");
    expect(formatUpdatedLabel("2026-08-25T14:00:00Z", new Date("2026-08-25T15:00:00Z"))).toBe("Atualizado há 1 h");
  });

  it("explica discretamente cobertura parcial ou ausente de assignments", () => {
    const availableFrom = "2026-08-25T21:38:00Z";
    expect(assignmentHistoryNote("FULL", availableFrom)).toBeUndefined();
    expect(assignmentHistoryNote("PARTIAL", availableFrom)).toBe(
      "Dados disponíveis desde 25/08 às 18:38",
    );
    expect(assignmentHistoryNote("NONE", availableFrom)).toBe(
      "Histórico disponível somente desde 25/08 às 18:38",
    );
  });

  it("distingue CRM conectado, desatualizado e indisponível", () => {
    const now = new Date("2026-08-25T15:00:00Z");
    expect(getCrmConnectionVisualStatus({
      integrationStatus: "READY",
      lastSyncAt: "2026-08-25T14:45:00Z",
      refreshing: false,
      now,
    })).toEqual({ key: "connected", label: "CRM conectado" });
    expect(getCrmConnectionVisualStatus({
      integrationStatus: "READY",
      lastSyncAt: "2026-08-25T14:39:59Z",
      refreshing: false,
      now,
    })).toEqual({ key: "stale", label: "CRM desatualizado" });
    expect(getCrmConnectionVisualStatus({
      integrationStatus: "SYNC_ERROR",
      lastSyncAt: "2026-08-25T14:59:00Z",
      refreshing: false,
      now,
    })).toEqual({ key: "unavailable", label: "CRM indisponível" });
  });

  it("só prepara sparkline com pelo menos dois números válidos", () => {
    expect(normalizeSparklineValues([13])).toEqual([]);
    expect(normalizeSparklineValues([null, 13, undefined, Number.NaN])).toEqual([]);
    expect(normalizeSparklineValues([null, 13, Number.NaN, 25])).toEqual([
      { index: 1, metric: 13 },
      { index: 3, metric: 25 },
    ]);
    expect(normalizeSparklineValues([null, 13, 25]).some((point) => point.metric === 0)).toBe(false);
  });

  it("preserva o dashboard anterior quando o refresh falha", () => {
    const previous = { metrics: { currentPortfolio: 7 }, meta: { integrationStatus: "READY" } };
    expect(retainDashboardAfterRefreshError(previous)).toBe(previous);
  });

  it("valida período custom sem requisitar intervalos incompletos", () => {
    expect(validateCustomDateRange("", "2026-08-20")).toBeTruthy();
    expect(validateCustomDateRange("2026-08-20", "2026-08-05")).toBeTruthy();
    expect(validateCustomDateRange("2026-08-05", "2026-08-20")).toBeNull();
  });

  it("resolve e exibe os intervalos reais dos períodos em São Paulo", () => {
    const now = new Date("2026-08-26T15:00:00Z");
    expect(resolveCrmPeriodDateRange("today", "", "", now)).toEqual({ from: "2026-08-26", to: "2026-08-26" });
    expect(resolveCrmPeriodDateRange("7d", "", "", now)).toEqual({ from: "2026-08-20", to: "2026-08-26" });
    expect(resolveCrmPeriodDateRange("30d", "", "", now)).toEqual({ from: "2026-07-28", to: "2026-08-26" });
    expect(resolveCrmPeriodDateRange("month", "", "", now)).toEqual({ from: "2026-08-01", to: "2026-08-26" });
    expect(resolveCrmPeriodDateRange("custom", "2026-08-25", "2026-12-12", now)).toEqual({ from: "2026-08-25", to: "2026-12-12" });
    expect(formatCrmPeriodLabel("2026-08-26", "2026-08-26")).toBe("26 ago");
    expect(formatCrmPeriodLabel("2026-08-20", "2026-08-26")).toBe("20 ago - 26 ago");
    expect(formatCrmPeriodLabel("2026-07-28", "2026-08-26")).toBe("28 jul - 26 ago");
    expect(formatCrmPeriodLabel("2026-08-01", "2026-08-26")).toBe("01 ago - 26 ago");
    expect(formatCrmPeriodLabel("2026-08-25", "2026-12-12")).toBe("25 ago - 12 dez");
    expect(formatCrmPeriodLabel("2026-12-25", "2027-01-10")).toBe("25 dez 2026 - 10 jan 2027");
  });

  it("seleciona uma saudação natural de forma determinística para a montagem", () => {
    const greeting = selectCrmGreeting(0.42);
    expect(greeting).toBe(selectCrmGreeting(0.42));
    expect(greeting).not.toContain("👋");
  });

  it("filtra por nome e ordena awaiting, unread, inactive e demais", () => {
    const rows = [
      session({ sessionId: "ok", contactName: "Cliente Alfa" }),
      session({ sessionId: "inactive", contactName: "Cliente Beta", inactiveOver24h: true }),
      session({ sessionId: "unread", contactName: "Cliente Beta", unreadCount: 2 }),
      session({ sessionId: "awaiting", contactName: "Cliente Beta", awaitingResponse: true }),
    ];
    expect(filterAndSortSessions(rows, "all", "").map((item) => item.sessionId)).toEqual([
      "awaiting", "unread", "inactive", "ok",
    ]);
    expect(filterAndSortSessions(rows, "unread", "beta").map((item) => item.sessionId)).toEqual(["unread"]);
    expect(filterAndSortSessions(rows, "awaiting", "beta").map((item) => item.sessionId)).toEqual(["awaiting"]);
    expect(filterAndSortSessions(rows, "inactive", "beta").map((item) => item.sessionId)).toEqual(["inactive"]);
  });

  it("busca e ordena clientes atendidos pela última interação DESC", () => {
    const base: Omit<CrmAttendedClient, "sessionId" | "contactName" | "lastAgentInteractionAt"> = {
      currentStatus: "IN_PROGRESS",
      firstAgentInteractionAt: "2026-08-25T10:00:00Z",
      agentMessageCount: 1,
      customerMessageCount: 1,
      totalRelevantMessages: 2,
      currentAssignmentScope: "VALID",
      currentBlessUserId: "user-a",
      receivedInPeriod: false,
      transferredInPeriod: false,
    };
    const clients: CrmAttendedClient[] = [
      { ...base, sessionId: "older", contactName: "Cliente Alfa", lastAgentInteractionAt: "2026-08-25T11:00:00Z" },
      { ...base, sessionId: "newer", contactName: "CLIENTE BETA", lastAgentInteractionAt: "2026-08-26T11:00:00Z" },
    ];
    expect(filterAndSortAttendedClients(clients, "cliente").map((item) => item.sessionId)).toEqual(["newer", "older"]);
    expect(filterAndSortAttendedClients(clients, "beta").map((item) => item.sessionId)).toEqual(["newer"]);
  });

  it("deriva situação histórica somente do snapshot e eventos reais", () => {
    const client: CrmAttendedClient = {
      sessionId: "session",
      contactName: "Cliente",
      currentStatus: "IN_PROGRESS",
      firstAgentInteractionAt: "2026-08-25T10:00:00Z",
      lastAgentInteractionAt: "2026-08-25T11:00:00Z",
      agentMessageCount: 1,
      customerMessageCount: 1,
      totalRelevantMessages: 2,
      currentAssignmentScope: "VALID",
      currentBlessUserId: "user-a",
      receivedInPeriod: false,
      transferredInPeriod: false,
    };
    expect(attendedClientSituation(client, "user-a")).toBe("Em sua carteira");
    expect(attendedClientSituation({ ...client, currentBlessUserId: "user-b", transferredInPeriod: true }, "user-a")).toBe("Transferido");
    expect(attendedClientSituation({ ...client, currentStatus: "COMPLETED" }, "user-a")).toBe("Concluído");
  });

  it("trata comparação indisponível e considera redução de resposta como melhoria", () => {
    expect(metricDeltaPresentation(null, false).tone).toBe("unavailable");
    expect(metricDeltaPresentation({
      current: 600,
      previous: 900,
      absoluteChange: -300,
      percentChange: -33.33,
      available: true,
    }, true)).toMatchObject({ tone: "positive" });
    expect(metricDeltaPresentation({
      current: 4,
      previous: 0,
      absoluteChange: 4,
      percentChange: null,
      available: true,
    }).label).toBe("Novo neste período");
  });

  it("gera somente insights sustentados pelos dados", () => {
    const dashboard = {
      analytics: {
        comparison: {
          averageResponseSeconds: { current: 600, previous: 900, absoluteChange: -300, percentChange: -33.3, available: true },
          clientsServed: { current: 12, previous: 10, absoluteChange: 2, percentChange: 20, available: true },
        },
        portfolioHealth: { awaitingResponse: 2, inactiveOver24h: 1 },
      },
    } as CrmDashboardResponse;
    expect(generateCrmInsights(dashboard)).toEqual([
      "Seu tempo médio de resposta caiu 33,3% em relação ao período anterior.",
      "Você atendeu 20% mais clientes neste período.",
      "Você possui 2 conversas aguardando resposta.",
    ]);
  });
});

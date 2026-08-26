import { describe, expect, it } from "vitest";
import type { CrmDashboardResponse, CrmDashboardSession } from "../../../types/crmDashboard";
import {
  filterAndSortSessions,
  formatChartDate,
  formatDuration,
  formatMetricNumber,
  formatRelativeTime,
  formatUpdatedLabel,
  generateCrmInsights,
  getCrmConnectionVisualStatus,
  metricDeltaPresentation,
  normalizeSparklineValues,
  retainDashboardAfterRefreshError,
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

import { describe, expect, it } from "vitest";
import type {
  CrmAssignmentEvent,
  CrmMessageActivity,
  CrmResponseEvent,
} from "./domain.js";
import { calculateCrmAnalytics, calculatePercentChange } from "./analytics.js";
import { resolveCrmAnalyticsPeriod } from "./time.js";

const AGENT = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const METRICS_START = "2026-08-01T03:00:00Z";
const NOW = new Date("2026-08-25T15:00:00Z");

function message(
  id: string,
  sessionId: string,
  timestamp: string,
  blessUserId = AGENT
): CrmMessageActivity {
  return {
    messageId: id,
    sessionId,
    actorType: "AGENT",
    blessUserId,
    timestamp,
    direction: "TO_HUB",
    origin: "DEFAULT",
    messageType: "TEXT",
  };
}

function response(
  sessionId: string,
  respondedAt: string,
  responseSeconds: number,
  agentBlessUserId = AGENT
): CrmResponseEvent {
  return {
    sessionId,
    agentBlessUserId,
    waitStartedAt: new Date(new Date(respondedAt).getTime() - responseSeconds * 1000).toISOString(),
    respondedAt,
    responseSeconds,
  };
}

function assignment(
  id: string,
  detectedAt: string,
  fromBlessUserId: string | null,
  toBlessUserId: string | null
): CrmAssignmentEvent {
  return {
    eventKey: id,
    sessionId: `session-${id}`,
    eventType: fromBlessUserId ? "TRANSFERRED" : "ASSIGNED",
    fromBlessUserId,
    toBlessUserId,
    fromScope: fromBlessUserId ? "VALID" : "UNASSIGNED",
    toScope: toBlessUserId ? "VALID" : "EXCLUDED",
    detectedAt,
    source: "SNAPSHOT",
  };
}

function analytics(overrides: Partial<Parameters<typeof calculateCrmAnalytics>[0]> = {}) {
  return calculateCrmAnalytics({
    blessUserId: AGENT,
    excludedUserIds: new Set(),
    metricsStartAt: METRICS_START,
    assignmentHistoryStartAt: METRICS_START,
    period: resolveCrmAnalyticsPeriod({ key: "7d" }, METRICS_START, NOW),
    sessions: [],
    assignmentEvents: [],
    messageActivity: [],
    responseEvents: [],
    ...overrides,
  });
}

describe("analytics históricos do CRM", () => {
  it("evita Infinity quando o período anterior é zero", () => {
    expect(calculatePercentChange(0, 0)).toBe(0);
    expect(calculatePercentChange(3, 0)).toBeNull();
    expect(calculatePercentChange(15, 10)).toBe(50);
  });

  it("conta clientes distintos por dia e uma única vez no período", () => {
    const result = analytics({
      messageActivity: [
        message("a", "same-session", "2026-08-20T13:00:00Z"),
        message("b", "same-session", "2026-08-20T14:00:00Z"),
        message("c", "same-session", "2026-08-21T13:00:00Z"),
      ],
    });
    expect(result.dailySeries.find((day) => day.date === "2026-08-20")?.clientsServed).toBe(1);
    expect(result.dailySeries.find((day) => day.date === "2026-08-21")?.clientsServed).toBe(1);
    expect(result.periodSummary.clientsServed).toBe(1);
  });

  it("calcula a média ponderada do período e retorna null em dia sem resposta", () => {
    const responseEvents = [
      response("single", "2026-08-20T13:00:00Z", 10),
      ...Array.from({ length: 9 }, (_, index) =>
        response(`many-${index}`, `2026-08-21T${String(13 + index).padStart(2, "0")}:00:00Z`, 100)
      ),
    ];
    const result = analytics({ responseEvents });
    expect(result.periodSummary.responseCount).toBe(10);
    expect(result.periodSummary.averageResponseSeconds).toBe(91);
    expect(result.dailySeries.find((day) => day.date === "2026-08-20")?.averageResponseSeconds).toBe(10);
    expect(result.dailySeries.find((day) => day.date === "2026-08-21")?.averageResponseSeconds).toBe(100);
    expect(result.dailySeries.find((day) => day.date === "2026-08-22")).toMatchObject({
      responseCount: 0,
      averageResponseSeconds: null,
    });
  });

  it("retorna FULL quando todo o período possui histórico de assignments", () => {
    const result = analytics({
      assignmentHistoryStartAt: "2026-08-19T03:00:00Z",
      assignmentEvents: [
        assignment("received", "2026-08-20T13:00:00Z", null, AGENT),
        assignment("transferred", "2026-08-21T13:00:00Z", AGENT, OTHER),
      ],
    });
    expect(result.availability.assignmentCoverage).toBe("FULL");
    expect(result.periodSummary).toMatchObject({ received: 1, transferred: 1 });
  });

  it("retorna PARTIAL e agrega somente assignments posteriores ao início do monitor", () => {
    const assignmentHistoryStartAt = "2026-08-25T21:38:00Z";
    const result = analytics({
      assignmentHistoryStartAt,
      assignmentEvents: [
        assignment("before-received", "2026-08-25T20:00:00Z", null, AGENT),
        assignment("after-received", "2026-08-25T22:00:00Z", null, AGENT),
        assignment("before-transfer", "2026-08-25T21:37:59Z", AGENT, OTHER),
        assignment("after-transfer", "2026-08-25T22:30:00Z", AGENT, OTHER),
      ],
    });

    expect(result.availability.assignmentCoverage).toBe("PARTIAL");
    expect(result.periodSummary).toMatchObject({ received: 1, transferred: 1 });
    expect(result.dailySeries.find((day) => day.date === "2026-08-25")).toMatchObject({
      received: 1,
      transferred: 1,
      availability: {
        assignments: true,
        assignmentCoverage: "PARTIAL",
      },
    });
    const receivedFromSeries = result.dailySeries.reduce(
      (sum, day) => sum + (day.received ?? 0),
      0,
    );
    const transferredFromSeries = result.dailySeries.reduce(
      (sum, day) => sum + (day.transferred ?? 0),
      0,
    );
    expect(receivedFromSeries).toBe(result.periodSummary.received);
    expect(transferredFromSeries).toBe(result.periodSummary.transferred);
  });

  it("retorna NONE quando o período termina antes do histórico de assignments", () => {
    const result = analytics({
      assignmentHistoryStartAt: "2026-08-26T03:00:00Z",
      assignmentEvents: [
        assignment("outside", "2026-08-20T13:00:00Z", null, AGENT),
      ],
    });

    expect(result.availability.assignmentCoverage).toBe("NONE");
    expect(result.periodSummary).toMatchObject({ received: null, transferred: null });
    expect(result.dailySeries.every((day) =>
      day.received === null
      && day.transferred === null
      && day.availability.assignmentCoverage === "NONE"
    )).toBe(true);
  });

  it("preserva zero como valor real quando a cobertura é PARTIAL", () => {
    const result = analytics({
      assignmentHistoryStartAt: "2026-08-25T21:38:00Z",
      assignmentEvents: [],
    });

    expect(result.availability.assignmentCoverage).toBe("PARTIAL");
    expect(result.periodSummary).toMatchObject({ received: 0, transferred: 0 });
    expect(result.dailySeries.find((day) => day.date === "2026-08-25")).toMatchObject({
      received: 0,
      transferred: 0,
    });
  });

  it("não compara assignments quando algum período possui cobertura incompleta", () => {
    const result = analytics({
      assignmentHistoryStartAt: "2026-08-25T21:38:00Z",
      assignmentEvents: [
        assignment("current", "2026-08-25T22:00:00Z", null, AGENT),
      ],
    });

    expect(result.periodSummary.received).toBe(1);
    expect(result.comparison.received).toEqual({
      current: 1,
      previous: null,
      absoluteChange: null,
      percentChange: null,
      available: false,
    });
    expect(result.comparison.transferred.available).toBe(false);
  });

  it("não altera clientes atendidos nem tempo de resposta com cobertura parcial", () => {
    const result = analytics({
      assignmentHistoryStartAt: "2026-08-25T21:38:00Z",
      messageActivity: [
        message("message-a", "same-client", "2026-08-20T13:00:00Z"),
        message("message-b", "same-client", "2026-08-21T13:00:00Z"),
      ],
      responseEvents: [
        response("response-a", "2026-08-20T14:00:00Z", 30),
        response("response-b", "2026-08-21T14:00:00Z", 90),
      ],
    });

    expect(result.periodSummary).toMatchObject({
      clientsServed: 1,
      responseCount: 2,
      averageResponseSeconds: 60,
    });
  });

  it("calcula comparação somente quando os dois períodos estão disponíveis", () => {
    const result = analytics({
      assignmentEvents: [
        assignment("previous", "2026-08-13T13:00:00Z", null, AGENT),
        assignment("current-a", "2026-08-20T13:00:00Z", null, AGENT),
        assignment("current-b", "2026-08-21T13:00:00Z", null, AGENT),
      ],
    });
    expect(result.comparison.previousPeriod).toMatchObject({
      startAt: "2026-08-12T03:00:00.000Z",
      endAt: "2026-08-19T03:00:00.000Z",
      limitedByMetricsStartAt: false,
    });
    expect(result.comparison.received).toEqual({
      current: 2,
      previous: 1,
      absoluteChange: 1,
      percentChange: 100,
      available: true,
    });
  });

  it("não inventa comparação quando o período anterior precede o corte", () => {
    const result = analytics({
      period: resolveCrmAnalyticsPeriod({ key: "30d" }, METRICS_START, NOW),
      messageActivity: [message("current", "current", "2026-08-20T13:00:00Z")],
    });
    expect(result.comparison.previousPeriod.limitedByMetricsStartAt).toBe(true);
    expect(result.comparison.clientsServed).toEqual({
      current: 1,
      previous: null,
      absoluteChange: null,
      percentChange: null,
      available: false,
    });
  });

  it("produz distribuição exclusiva respeitando awaiting, unread, inactive e ok", () => {
    const base = {
      status: "IN_PROGRESS" as const,
      lastInteractionAt: "2026-08-25T12:00:00Z",
      currentBlessUserId: AGENT,
    };
    const result = analytics({
      sessions: [
        { ...base, sessionId: "awaiting", contactName: "A", unreadCount: 2, awaitingResponse: true, inactiveOver24h: true },
        { ...base, sessionId: "unread", contactName: "B", unreadCount: 1, awaitingResponse: false, inactiveOver24h: true },
        { ...base, sessionId: "inactive", contactName: "C", unreadCount: 0, awaitingResponse: false, inactiveOver24h: true },
        { ...base, sessionId: "ok", contactName: "D", unreadCount: 0, awaitingResponse: false, inactiveOver24h: false },
      ],
    });
    expect(result.portfolioDistribution).toEqual({
      awaitingResponse: 1,
      unread: 1,
      inactive: 1,
      ok: 1,
      total: 4,
    });
    expect(result.portfolioHealth).toEqual({
      total: 4,
      responded: 3,
      awaitingResponse: 1,
      conversationsWithUnread: 2,
      inactiveOver24h: 3,
    });
  });

  it("isola o usuário autenticado e mantém o excluído fora dos analytics", () => {
    const mixed = analytics({
      messageActivity: [
        message("mine", "mine", "2026-08-20T13:00:00Z", AGENT),
        message("other", "other", "2026-08-20T13:00:00Z", OTHER),
      ],
      responseEvents: [
        response("mine", "2026-08-20T14:00:00Z", 30, AGENT),
        response("other", "2026-08-20T14:00:00Z", 900, OTHER),
      ],
    });
    expect(mixed.periodSummary).toMatchObject({
      clientsServed: 1,
      responseCount: 1,
      averageResponseSeconds: 30,
    });

    const excluded = analytics({
      excludedUserIds: new Set([AGENT]),
      messageActivity: [message("excluded", "excluded", "2026-08-20T13:00:00Z")],
      responseEvents: [response("excluded", "2026-08-20T14:00:00Z", 30)],
    });
    expect(excluded.periodSummary.clientsServed).toBe(0);
    expect(excluded.periodSummary.responseCount).toBe(0);
    expect(excluded.portfolioHealth.total).toBe(0);
  });
});

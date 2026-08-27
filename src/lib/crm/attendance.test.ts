import { describe, expect, it } from "vitest";
import {
  buildCrmAttendanceDetail,
  buildCrmAttendanceMovements,
  buildCrmAttendedClients,
  canAccessCrmAttendanceDetail,
  type CrmAttendanceSessionSnapshot,
} from "./attendance.js";
import type { CrmAssignmentEvent, CrmMessageActivity, CrmResponseEvent } from "./domain.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const START = new Date("2026-08-20T03:00:00Z");
const END = new Date("2026-08-28T03:00:00Z");

function activity(overrides: Partial<CrmMessageActivity>): CrmMessageActivity {
  return {
    messageId: "message-1",
    sessionId: "session-1",
    actorType: "AGENT",
    blessUserId: USER_ID,
    timestamp: "2026-08-21T12:00:00Z",
    direction: "TO_HUB",
    origin: "AGENT",
    messageType: "TEXT",
    ...overrides,
  };
}

function session(overrides: Partial<CrmAttendanceSessionSnapshot> = {}): CrmAttendanceSessionSnapshot {
  return {
    sessionId: "session-1",
    contactName: "Cliente Teste",
    status: "IN_PROGRESS",
    assignmentScope: "VALID",
    currentBlessUserId: USER_ID,
    unreadCount: 0,
    lastActorType: "AGENT",
    ...overrides,
  };
}

function assignment(overrides: Partial<CrmAssignmentEvent>): CrmAssignmentEvent {
  return {
    eventKey: "event-1",
    sessionId: "session-1",
    eventType: "ASSIGNED",
    fromBlessUserId: null,
    toBlessUserId: USER_ID,
    fromScope: "UNASSIGNED",
    toScope: "VALID",
    detectedAt: "2026-08-21T10:00:00Z",
    source: "SNAPSHOT",
    ...overrides,
  };
}

describe("histórico de clientes atendidos", () => {
  it("inclui somente sessões com mensagem AGENT do usuário no período e agrega uma vez", () => {
    const clients = buildCrmAttendedClients({
      blessUserId: USER_ID,
      excludedUserIds: new Set(),
      start: START,
      end: END,
      assignmentHistoryStartAt: START.toISOString(),
      sessions: [session()],
      assignmentEvents: [],
      messageActivity: [
        activity({ messageId: "first", timestamp: "2026-08-21T10:00:00Z" }),
        activity({ messageId: "last", timestamp: "2026-08-23T10:00:00Z" }),
        activity({ messageId: "customer-same-session", actorType: "CUSTOMER", blessUserId: null }),
        activity({ messageId: "customer", sessionId: "customer-only", actorType: "CUSTOMER", blessUserId: null }),
        activity({ messageId: "other-agent", sessionId: "other-agent", blessUserId: OTHER_USER_ID }),
        activity({ messageId: "outside", sessionId: "outside", timestamp: "2026-08-29T10:00:00Z" }),
      ],
    });

    expect(clients).toHaveLength(1);
    expect(clients[0]).toMatchObject({
      sessionId: "session-1",
      agentMessageCount: 2,
      customerMessageCount: 1,
      totalRelevantMessages: 3,
      firstAgentInteractionAt: "2026-08-21T10:00:00Z",
      lastAgentInteractionAt: "2026-08-23T10:00:00Z",
    });
  });

  it("mantém clientes transferidos, concluídos e fora da carteira atual", () => {
    const messages = [
      activity({ messageId: "transfer", sessionId: "transferred" }),
      activity({ messageId: "complete", sessionId: "completed" }),
      activity({ messageId: "outside", sessionId: "outside" }),
    ];
    const clients = buildCrmAttendedClients({
      blessUserId: USER_ID,
      excludedUserIds: new Set(),
      start: START,
      end: END,
      assignmentHistoryStartAt: START.toISOString(),
      messageActivity: messages,
      sessions: [
        session({ sessionId: "transferred", currentBlessUserId: OTHER_USER_ID }),
        session({ sessionId: "completed", status: "COMPLETED", currentBlessUserId: null, assignmentScope: "UNASSIGNED" }),
        session({ sessionId: "outside", currentBlessUserId: OTHER_USER_ID }),
      ],
      assignmentEvents: [assignment({
        sessionId: "transferred",
        eventType: "TRANSFERRED",
        fromBlessUserId: USER_ID,
        toBlessUserId: OTHER_USER_ID,
      })],
    });

    expect(clients.map((client) => client.sessionId).sort()).toEqual(["completed", "outside", "transferred"]);
    expect(clients.find((client) => client.sessionId === "transferred")?.transferredInPeriod).toBe(true);
    expect(clients.find((client) => client.sessionId === "completed")?.currentStatus).toBe("COMPLETED");
  });

  it("marca recebimento e transferência somente com eventos confiáveis do período", () => {
    const clients = buildCrmAttendedClients({
      blessUserId: USER_ID,
      excludedUserIds: new Set(),
      start: START,
      end: END,
      assignmentHistoryStartAt: "2026-08-22T03:00:00Z",
      messageActivity: [activity({ timestamp: "2026-08-23T12:00:00Z" })],
      sessions: [session()],
      assignmentEvents: [
        assignment({ eventKey: "before-monitor", detectedAt: "2026-08-21T10:00:00Z" }),
        assignment({ eventKey: "received", detectedAt: "2026-08-22T10:00:00Z" }),
        assignment({ eventKey: "transferred", eventType: "TRANSFERRED", fromBlessUserId: USER_ID, toBlessUserId: OTHER_USER_ID, detectedAt: "2026-08-24T10:00:00Z" }),
      ],
    });

    expect(clients[0]).toMatchObject({ receivedInPeriod: true, transferredInPeriod: true });
  });

  it("ordena pela última interação mais recente e respeita intervalo customizado", () => {
    const clients = buildCrmAttendedClients({
      blessUserId: USER_ID,
      excludedUserIds: new Set(),
      start: new Date("2026-08-25T03:00:00Z"),
      end: new Date("2026-08-27T03:00:00Z"),
      assignmentHistoryStartAt: START.toISOString(),
      sessions: [session({ sessionId: "older" }), session({ sessionId: "newer" })],
      assignmentEvents: [],
      messageActivity: [
        activity({ messageId: "older", sessionId: "older", timestamp: "2026-08-25T10:00:00Z" }),
        activity({ messageId: "newer", sessionId: "newer", timestamp: "2026-08-26T10:00:00Z" }),
        activity({ messageId: "excluded-by-custom", sessionId: "outside", timestamp: "2026-08-24T10:00:00Z" }),
      ],
    });
    expect(clients.map((client) => client.sessionId)).toEqual(["newer", "older"]);
  });

  it("não retorna dados para usuário explicitamente excluído", () => {
    expect(buildCrmAttendedClients({
      blessUserId: USER_ID,
      excludedUserIds: new Set([USER_ID]),
      start: START,
      end: END,
      assignmentHistoryStartAt: START.toISOString(),
      sessions: [session()],
      assignmentEvents: [],
      messageActivity: [activity({})],
    })).toEqual([]);
  });

  it("expõe somente movimentações confiáveis dos clientes atendidos", () => {
    const clients = buildCrmAttendedClients({
      blessUserId: USER_ID,
      excludedUserIds: new Set(),
      start: START,
      end: END,
      assignmentHistoryStartAt: "2026-08-22T03:00:00Z",
      sessions: [session()],
      messageActivity: [activity({ timestamp: "2026-08-23T12:00:00Z" })],
      assignmentEvents: [],
    });
    const movements = buildCrmAttendanceMovements({
      blessUserId: USER_ID,
      excludedUserIds: new Set(),
      start: START,
      end: END,
      assignmentHistoryStartAt: "2026-08-22T03:00:00Z",
      attendedClients: clients,
      assignmentEvents: [
        assignment({ eventKey: "before-monitor", detectedAt: "2026-08-21T10:00:00Z" }),
        assignment({ eventKey: "received", detectedAt: "2026-08-22T10:00:00Z" }),
        assignment({ eventKey: "other-session", sessionId: "other-session", detectedAt: "2026-08-23T10:00:00Z" }),
        assignment({
          eventKey: "transferred",
          eventType: "TRANSFERRED",
          fromBlessUserId: USER_ID,
          toBlessUserId: OTHER_USER_ID,
          detectedAt: "2026-08-24T10:00:00Z",
        }),
      ],
    });
    expect(movements).toEqual([
      { contactName: "Cliente Teste", type: "RECEIVED", occurredAt: "2026-08-22T10:00:00Z" },
      { contactName: "Cliente Teste", type: "TRANSFERRED", occurredAt: "2026-08-24T10:00:00Z" },
    ]);
  });
});

describe("detalhe de atendimento", () => {
  it("conta somente AGENT do usuário atual, CUSTOMER e respostas da sessão/usuário", () => {
    const detail = buildCrmAttendanceDetail({
      blessUserId: USER_ID,
      excludedUserIds: new Set(),
      start: START,
      end: END,
      assignmentHistoryStartAt: START.toISOString(),
      session: session({ lastActorType: "CUSTOMER", unreadCount: 2 }),
      messageActivity: [
        activity({ messageId: "agent-1", timestamp: "2026-08-21T10:00:00Z" }),
        activity({ messageId: "agent-2", timestamp: "2026-08-21T11:00:00Z" }),
        activity({ messageId: "other-agent", blessUserId: OTHER_USER_ID, timestamp: "2026-08-21T12:00:00Z" }),
        activity({ messageId: "customer", actorType: "CUSTOMER", blessUserId: null, timestamp: "2026-08-21T09:00:00Z" }),
      ],
      assignmentEvents: [],
      responseEvents: [
        { sessionId: "session-1", agentBlessUserId: USER_ID, waitStartedAt: "2026-08-21T09:00:00Z", respondedAt: "2026-08-21T10:00:00Z", responseSeconds: 60 },
        { sessionId: "session-1", agentBlessUserId: USER_ID, waitStartedAt: "2026-08-21T10:00:00Z", respondedAt: "2026-08-21T11:00:00Z", responseSeconds: 120 },
        { sessionId: "session-1", agentBlessUserId: OTHER_USER_ID, waitStartedAt: "2026-08-21T10:00:00Z", respondedAt: "2026-08-21T12:00:00Z", responseSeconds: 999 },
        { sessionId: "other-session", agentBlessUserId: USER_ID, waitStartedAt: "2026-08-21T10:00:00Z", respondedAt: "2026-08-21T12:00:00Z", responseSeconds: 999 },
      ] satisfies CrmResponseEvent[],
    });

    expect(detail).toMatchObject({
      agentMessageCount: 2,
      customerMessageCount: 1,
      totalRelevantMessages: 3,
      averageResponseSeconds: 90,
      responseCount: 2,
      firstInteractionAt: "2026-08-21T09:00:00Z",
      lastInteractionAt: "2026-08-21T11:00:00Z",
      unreadCount: 2,
      awaitingResponse: true,
    });
    expect(detail.activityTimeline).toHaveLength(3);
    expect(detail.activityTimeline.some((item) => "content" in item || "text" in item)).toBe(false);
  });

  it("retorna média nula quando não existem response_events", () => {
    const detail = buildCrmAttendanceDetail({
      blessUserId: USER_ID,
      excludedUserIds: new Set(),
      start: START,
      end: END,
      assignmentHistoryStartAt: null,
      session: session(),
      messageActivity: [],
      assignmentEvents: [],
      responseEvents: [],
    });
    expect(detail.averageResponseSeconds).toBeNull();
    expect(detail.responseCount).toBe(0);
  });

  it("bloqueia sessão sem atividade do usuário e fora da carteira atual", () => {
    expect(canAccessCrmAttendanceDetail({
      blessUserId: USER_ID,
      excludedUserIds: new Set(),
      session: session({ currentBlessUserId: OTHER_USER_ID }),
      messageActivity: [activity({ blessUserId: OTHER_USER_ID })],
      start: START,
      end: END,
    })).toBe(false);
    expect(canAccessCrmAttendanceDetail({
      blessUserId: USER_ID,
      excludedUserIds: new Set(),
      session: session(),
      messageActivity: [],
      start: START,
      end: END,
    })).toBe(true);
  });
});

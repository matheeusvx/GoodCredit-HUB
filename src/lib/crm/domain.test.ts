import { describe, expect, it } from "vitest";
import {
  buildCrmResponseEvents,
  calculateCrmDashboardMetrics,
  classifyCrmMessage,
  detectCrmSnapshotEvents,
  sanitizeCrmOwner,
  type CrmMessageActivity,
  type CrmSessionSnapshot,
} from "./domain.js";
import { getSaoPauloDayRange } from "./time.js";

const AGENT_A = "11111111-1111-4111-8111-111111111111";
const AGENT_B = "22222222-2222-4222-8222-222222222222";
const EXCLUDED = "99999999-9999-4999-8999-999999999999";
const excludedIds = new Set([EXCLUDED]);

function activity(
  messageId: string,
  actorType: CrmMessageActivity["actorType"],
  timestamp: string,
  blessUserId: string | null = null,
  sessionId = "session-a"
): CrmMessageActivity {
  return {
    messageId,
    sessionId,
    actorType,
    blessUserId,
    timestamp,
    direction: actorType === "CUSTOMER" ? "FROM_HUB" : "TO_HUB",
    origin: actorType === "CUSTOMER" ? "GATEWAY" : "DEFAULT",
    messageType: "TEXT",
  };
}

describe("domínio operacional do CRM Bless", () => {
  it("usa message.userId como identidade estável e ignora senderId", () => {
    const first = classifyCrmMessage({
      messageId: "m1",
      sessionId: "session-a",
      userId: AGENT_A,
      senderId: "sender-variable-1",
      timestamp: "2026-08-25T13:00:00Z",
      direction: "TO_HUB",
      origin: "DEFAULT",
      messageType: "TEXT",
    }, excludedIds);
    const second = classifyCrmMessage({
      messageId: "m2",
      sessionId: "session-a",
      userId: AGENT_A,
      senderId: "sender-variable-2",
      timestamp: "2026-08-25T13:01:00Z",
      direction: "TO_HUB",
      origin: "DEFAULT",
      messageType: "TEXT",
    }, excludedIds);

    expect(first.blessUserId).toBe(AGENT_A);
    expect(second.blessUserId).toBe(AGENT_A);
    expect(first.actorType).toBe("AGENT");
  });

  it("consolida mensagens consecutivas do cliente em uma espera de 480 segundos", () => {
    const events = buildCrmResponseEvents([
      activity("m1", "CUSTOMER", "2026-08-25T13:00:00Z"),
      activity("m2", "CUSTOMER", "2026-08-25T13:02:00Z"),
      activity("m3", "AGENT", "2026-08-25T13:08:00Z", AGENT_A),
    ], "2026-08-01T03:00:00Z");

    expect(events).toEqual([{
      sessionId: "session-a",
      agentBlessUserId: AGENT_A,
      waitStartedAt: "2026-08-25T13:00:00Z",
      respondedAt: "2026-08-25T13:08:00Z",
      responseSeconds: 480,
    }]);
  });

  it("encerra a espera respondida pelo usuário excluído sem atribuí-la ao próximo agente", () => {
    const excluded = classifyCrmMessage({
      messageId: "m2",
      sessionId: "session-a",
      userId: EXCLUDED,
      senderId: "ignored",
      timestamp: "2026-08-25T13:05:00Z",
      direction: "TO_HUB",
      origin: "DEFAULT",
      messageType: "TEXT",
    }, excludedIds);
    const events = buildCrmResponseEvents([
      activity("m1", "CUSTOMER", "2026-08-25T13:00:00Z"),
      excluded,
      activity("m3", "AGENT", "2026-08-25T13:08:00Z", AGENT_A),
    ], "2026-08-01T03:00:00Z");

    expect(excluded).toMatchObject({ actorType: "EXCLUDED", blessUserId: null });
    expect(events).toHaveLength(0);
  });

  it("não gera recebidos no baseline e detecta uma transferência apenas uma vez", () => {
    const initial: CrmSessionSnapshot = {
      sessionId: "session-a",
      status: "IN_PROGRESS",
      updatedAt: "2026-08-25T13:00:00Z",
      scope: "VALID",
      blessUserId: AGENT_A,
    };
    const transferred: CrmSessionSnapshot = {
      ...initial,
      updatedAt: "2026-08-25T14:00:00Z",
      blessUserId: AGENT_B,
    };

    expect(detectCrmSnapshotEvents(null, initial, true, "2026-08-25T13:00:00Z")).toEqual([]);
    expect(detectCrmSnapshotEvents(initial, transferred, false, "2026-08-25T14:01:00Z")).toMatchObject([{
      eventType: "TRANSFERRED",
      fromBlessUserId: AGENT_A,
      toBlessUserId: AGENT_B,
    }]);
    expect(detectCrmSnapshotEvents(transferred, transferred, false, "2026-08-25T14:02:00Z")).toEqual([]);
  });

  it("mantém apenas a semântica em transferências envolvendo usuário excluído", () => {
    const valid: CrmSessionSnapshot = {
      sessionId: "session-a",
      status: "IN_PROGRESS",
      updatedAt: null,
      scope: "VALID",
      blessUserId: AGENT_A,
    };
    const excludedOwner: CrmSessionSnapshot = {
      ...valid,
      ...sanitizeCrmOwner(EXCLUDED, excludedIds),
    };
    const out = detectCrmSnapshotEvents(valid, excludedOwner, false, "2026-08-25T13:00:00Z")[0];
    const incoming = detectCrmSnapshotEvents(excludedOwner, valid, false, "2026-08-25T14:00:00Z")[0];

    expect(out).toMatchObject({
      eventType: "TRANSFERRED",
      fromBlessUserId: AGENT_A,
      toBlessUserId: null,
      toScope: "EXCLUDED",
    });
    expect(incoming).toMatchObject({
      eventType: "TRANSFERRED",
      fromBlessUserId: null,
      fromScope: "EXCLUDED",
      toBlessUserId: AGENT_A,
    });

    const validMetrics = calculateCrmDashboardMetrics({
      blessUserId: AGENT_A,
      sessions: [],
      assignmentEvents: [out, incoming],
      messageActivity: [],
      responseEvents: [],
      now: new Date("2026-08-25T15:00:00Z"),
    });
    expect(validMetrics.transferredToday).toBe(1);
    expect(validMetrics.receivedToday).toBe(1);
  });

  it("atribui recebidos, transferidos e média de resposta ao agente correto", () => {
    const first: CrmSessionSnapshot = {
      sessionId: "session-a",
      status: "IN_PROGRESS",
      updatedAt: null,
      scope: "VALID",
      blessUserId: AGENT_A,
    };
    const second = { ...first, blessUserId: AGENT_B };
    const transfer = detectCrmSnapshotEvents(
      first,
      second,
      false,
      "2026-08-25T13:00:00Z"
    );
    const responseEvents = [
      { sessionId: "session-a", agentBlessUserId: AGENT_A, waitStartedAt: "2026-08-25T12:00:00Z", respondedAt: "2026-08-25T12:08:00Z", responseSeconds: 480 },
      { sessionId: "session-b", agentBlessUserId: AGENT_A, waitStartedAt: "2026-08-25T13:00:00Z", respondedAt: "2026-08-25T13:04:00Z", responseSeconds: 240 },
    ];
    const base = {
      sessions: [],
      assignmentEvents: transfer,
      messageActivity: [],
      responseEvents,
      now: new Date("2026-08-25T15:00:00Z"),
    };
    const agentA = calculateCrmDashboardMetrics({ ...base, blessUserId: AGENT_A });
    const agentB = calculateCrmDashboardMetrics({ ...base, blessUserId: AGENT_B });

    expect(agentA.transferredToday).toBe(1);
    expect(agentA.receivedToday).toBe(0);
    expect(agentA.averageResponseSecondsToday).toBe(360);
    expect(agentB.receivedToday).toBe(1);
    expect(agentB.transferredToday).toBe(0);
    expect(agentB.averageResponseSecondsToday).toBeNull();
  });

  it("aplica o corte histórico sem remover sessões antigas da carteira atual", () => {
    const beforeCutoff = activity("old", "AGENT", "2026-08-01T02:59:59Z", AGENT_A);
    const afterCutoff = activity("new", "AGENT", "2026-08-01T03:00:01Z", AGENT_A);
    expect(buildCrmResponseEvents([
      activity("customer-old", "CUSTOMER", "2026-08-01T02:50:00Z"),
      beforeCutoff,
    ], "2026-08-01T03:00:00Z")).toHaveLength(0);

    const metrics = calculateCrmDashboardMetrics({
      blessUserId: AGENT_A,
      sessions: [{
        sessionId: "created-in-may",
        contactName: "CLIENTE TESTE",
        status: "IN_PROGRESS",
        lastInteractionAt: "2026-08-25T12:00:00Z",
        unreadCount: 0,
        awaitingResponse: false,
        inactiveOver24h: false,
        currentBlessUserId: AGENT_A,
      }],
      assignmentEvents: [],
      messageActivity: [afterCutoff],
      responseEvents: [],
      now: new Date("2026-08-25T15:00:00Z"),
    });
    expect(metrics.currentPortfolio).toBe(1);
  });

  it("conta clientes distintos e somente sessões da carteira do agente", () => {
    const now = new Date("2026-08-25T15:00:00Z");
    const messages = [
      ...Array.from({ length: 10 }, (_, index) => activity(`a-${index}`, "AGENT", "2026-08-25T13:00:00Z", AGENT_A, "session-1")),
      ...Array.from({ length: 5 }, (_, index) => activity(`b-${index}`, "AGENT", "2026-08-25T14:00:00Z", AGENT_A, "session-2")),
      activity("c-1", "AGENT", "2026-08-25T14:30:00Z", AGENT_A, "session-3"),
    ];
    const sessions = [
      { sessionId: "session-1", contactName: "A", status: "IN_PROGRESS" as const, lastInteractionAt: "2026-08-25T14:00:00Z", unreadCount: 2, awaitingResponse: true, inactiveOver24h: false, currentBlessUserId: AGENT_A },
      { sessionId: "session-2", contactName: "B", status: "PENDING" as const, lastInteractionAt: "2026-08-23T14:00:00Z", unreadCount: 0, awaitingResponse: false, inactiveOver24h: true, currentBlessUserId: AGENT_A },
      { sessionId: "session-other", contactName: "C", status: "STARTED" as const, lastInteractionAt: "2026-08-25T14:00:00Z", unreadCount: 9, awaitingResponse: true, inactiveOver24h: false, currentBlessUserId: AGENT_B },
    ];
    const metrics = calculateCrmDashboardMetrics({
      blessUserId: AGENT_A,
      sessions,
      assignmentEvents: [],
      messageActivity: messages,
      responseEvents: [],
      now,
    });

    expect(metrics.clientsServedToday).toBe(3);
    expect(metrics.awaitingResponse).toBe(1);
    expect(metrics.conversationsWithUnread).toBe(1);
    expect(metrics.totalUnreadMessages).toBe(2);
    expect(metrics.inactiveOver24h).toBe(1);
    expect(metrics.averageResponseSecondsToday).toBeNull();
  });

  it("calcula hoje em America/Sao_Paulo sem depender do navegador", () => {
    const range = getSaoPauloDayRange(new Date("2026-08-25T15:00:00Z"));
    expect(range.start.toISOString()).toBe("2026-08-25T03:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-26T03:00:00.000Z");
  });
});

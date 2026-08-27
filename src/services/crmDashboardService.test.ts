import { afterEach, describe, expect, it, vi } from "vitest";
import { getCrmAttendanceDetail, getCrmDashboard } from "./crmDashboardService";

afterEach(() => vi.unstubAllGlobals());

describe("crmDashboardService", () => {
  it("mapeia período, custom e refresh sem alterar a identidade", async () => {
    let requestedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ metrics: {}, sessions: [], analytics: {}, meta: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }));

    await getCrmDashboard("token-sintetico", {
      period: "custom",
      from: "2026-08-05",
      to: "2026-08-20",
      refresh: true,
    });

    const url = new URL(requestedUrl, "https://hub.example");
    expect(url.pathname).toBe("/api/crm/dashboard");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      period: "custom",
      from: "2026-08-05",
      to: "2026-08-20",
      refresh: "1",
    });
    expect(url.searchParams.has("userId")).toBe(false);
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: { Authorization: "Bearer token-sintetico" },
    }));
  });

  it("preserva chamadas existentes sem opções", async () => {
    let requestedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ metrics: {}, sessions: [], analytics: {}, meta: {} }));
    }));
    await getCrmDashboard("token-sintetico");
    expect(requestedUrl).toBe("/api/crm/dashboard");
  });

  it("busca detalhes sob demanda sem enviar identidade do usuário", async () => {
    let requestedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({
        sessionId: "session-1",
        contactName: "Cliente Teste",
        status: "IN_PROGRESS",
        currentAssignmentScope: "VALID",
        isCurrentlyAssignedToUser: true,
        agentMessageCount: 2,
        customerMessageCount: 1,
        totalRelevantMessages: 3,
        firstInteractionAt: "2026-08-05T12:00:00.000Z",
        lastInteractionAt: "2026-08-05T13:00:00.000Z",
        averageResponseSeconds: 120,
        responseCount: 1,
        unreadCount: 0,
        awaitingResponse: false,
        assignmentCoverage: "FULL",
        assignmentEvents: [],
        activityTimeline: [],
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }));

    const detail = await getCrmAttendanceDetail("token-sintetico", "session-1", {
      period: "custom",
      from: "2026-08-05",
      to: "2026-08-20",
    });

    const url = new URL(requestedUrl, "https://hub.example");
    expect(url.pathname).toBe("/api/crm/attendance-detail");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      sessionId: "session-1",
      period: "custom",
      from: "2026-08-05",
      to: "2026-08-20",
    });
    expect(url.searchParams.has("userId")).toBe(false);
    expect(url.searchParams.has("hubUserId")).toBe(false);
    expect(url.searchParams.has("blessUserId")).toBe(false);
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: { Authorization: "Bearer token-sintetico" },
    }));
    expect(detail.contactName).toBe("Cliente Teste");
  });
});

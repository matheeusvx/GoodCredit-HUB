import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlessClient } from "./blessClient.js";
import {
  AGENT_DIRECTORY_REFRESH_INTERVAL_MS,
  MESSAGE_CONCURRENCY,
  MESSAGE_SESSION_BATCH_SIZE,
  needsMessageSync,
  runCrmSync,
  selectMessageSyncBatch,
  shouldRefreshAgentDirectory,
} from "./sync.js";

interface FakeSupabaseOptions {
  mappings?: Array<{
    id: string;
    agent_name: string | null;
    agent_email: string | null;
    last_seen_at: string | null;
  }>;
  mappingReadError?: { message: string } | null;
  storedSessions?: Array<Record<string, unknown>>;
}

function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const mappingWrites: Array<{ operation: string; values: Record<string, unknown> }> = [];
  const sessionUpdates: Array<{ sessionId: string; values: Record<string, unknown> }> = [];
  const tableWrites: string[] = [];
  const syncState = {
    initialized_at: "2026-08-01T03:00:00.000Z",
    last_success_at: null as string | null,
    last_error_at: null as string | null,
    status: "SUCCEEDED",
  };

  const supabase = {
    from(table: string) {
      let pendingUpdate: Record<string, unknown> | null = null;
      let selectedIds: string[] | null = null;
      const builder = {
        select() {
          return builder;
        },
        eq(_column: string, value: unknown) {
          if (
            table === "crm_sessions"
            && pendingUpdate
            && typeof value === "string"
          ) {
            const sessionId = value;
            sessionUpdates.push({ sessionId, values: pendingUpdate });
            const stored = options.storedSessions?.find(
              (row) => row.session_id === sessionId,
            );
            if (stored) Object.assign(stored, pendingUpdate);
          }
          return builder;
        },
        single() {
          if (table === "crm_sync_state") {
            return Promise.resolve({
              data: { ...syncState },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
        in(column: string, values: string[]) {
          if (table === "crm_sessions" && column === "session_id") {
            selectedIds = values;
          }
          if (table === "crm_user_mappings" && pendingUpdate && column === "id") {
            options.mappings?.forEach((mapping) => {
              if (values.includes(mapping.id) && typeof pendingUpdate?.last_seen_at === "string") {
                mapping.last_seen_at = pendingUpdate.last_seen_at;
              }
            });
          }
          return builder;
        },
        upsert(values: Record<string, unknown>) {
          tableWrites.push(`upsert:${table}`);
          if (table === "crm_user_mappings") {
            mappingWrites.push({ operation: `upsert:${table}`, values });
          }
          return Promise.resolve({ data: null, error: null });
        },
        update(values: Record<string, unknown>) {
          pendingUpdate = values;
          if (table === "crm_user_mappings") {
            mappingWrites.push({ operation: `update:${table}`, values });
          }
          if (table === "crm_sync_state" && typeof values.last_error_at === "string") {
            syncState.last_error_at = values.last_error_at;
          }
          return builder;
        },
        then<TResult1 = unknown, TResult2 = never>(
          onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          const result = table === "crm_user_mappings"
            ? {
                data: options.mappings || [],
                error: options.mappingReadError || null,
              }
            : table === "crm_sessions" && !pendingUpdate
              ? {
                  data: (options.storedSessions || []).filter(
                    (row) => !selectedIds || selectedIds.includes(String(row.session_id)),
                  ),
                  error: null,
                }
            : { data: [], error: null };
          return Promise.resolve(result).then(onfulfilled, onrejected);
        },
      };
      return builder;
    },
    async rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      if (name === "crm_try_start_sync") {
        return { data: "11111111-1111-4111-8111-111111111111", error: null };
      }
      if (name === "crm_apply_session_snapshots") {
        const snapshots = args.p_sessions as Array<Record<string, unknown>>;
        snapshots.forEach((snapshot) => {
          const existing = options.storedSessions?.find(
            (row) => row.session_id === snapshot.session_id,
          );
          if (existing) Object.assign(existing, snapshot);
        });
      }
      return { data: true, error: null };
    },
  };

  return {
    supabase: supabase as unknown as SupabaseClient,
    rpcCalls,
    mappingWrites,
    sessionUpdates,
    tableWrites,
  };
}

function createBlessClient(options: {
  listAgents?: () => Promise<unknown[]>;
  listSessions?: () => Promise<unknown[]>;
  listMessages?: (
    sessionId: string,
    query?: { createdAfter?: string },
  ) => Promise<unknown[]>;
} = {}) {
  return {
    listAgents: vi.fn(options.listAgents || (async () => [])),
    listSessions: vi.fn(options.listSessions || (async () => [])),
    listMessages: vi.fn(options.listMessages || (async () => [])),
  } as unknown as BlessClient & {
    listAgents: ReturnType<typeof vi.fn>;
    listSessions: ReturnType<typeof vi.fn>;
    listMessages: ReturnType<typeof vi.fn>;
  };
}

function session(id: string, activityMinute: number, userId = "22222222-2222-4222-8222-222222222222") {
  const timestamp = `2026-08-25T15:${String(activityMinute).padStart(2, "0")}:00.000Z`;
  return {
    sessionId: id,
    contactId: `contact-${id}`,
    contactName: `CLIENTE ${id}`,
    currentUserId: userId,
    departmentId: "department-a",
    status: "IN_PROGRESS" as const,
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: timestamp,
    lastInteractionAt: timestamp,
    unreadCount: 0,
    agentDetails: null,
  };
}

function storedSession(
  id: string,
  watermark: string | null,
  userId = "22222222-2222-4222-8222-222222222222",
) {
  return {
    session_id: id,
    current_bless_user_id: userId,
    assignment_scope: "VALID",
    status: "IN_PROGRESS",
    updated_at: "2026-08-25T14:00:00.000Z",
    last_interaction_at: "2026-08-25T14:00:00.000Z",
    department_id: "department-a",
    unread_count: 0,
    last_message_synced_at: watermark,
    last_actor_type: "CONTACT",
  };
}

function finishCalls(rpcCalls: Array<{ name: string; args: Record<string, unknown> }>) {
  return rpcCalls.filter((call) => call.name === "crm_finish_sync");
}

describe("refresh best-effort do diretório Bless", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://supabase.example.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service-role-key");
    vi.stubEnv("BLESS_API_TOKEN", "synthetic-bless-token");
    vi.stubEnv("CRM_SYNC_SECRET", "synthetic-sync-secret");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each([429, 503])(
    "/core/v1/agent retorna %s e o sync operacional conclui",
    async (status) => {
      const { supabase, rpcCalls } = createFakeSupabase();
      const blessClient = createBlessClient({
        listAgents: async () => {
          throw new Error(
            `Bless API request failed after 3 attempts: GET /core/v1/agent returned ${status}.`,
          );
        },
      });

      const result = await runCrmSync({
        supabase,
        blessClient,
        now: new Date("2026-08-25T15:00:00.000Z"),
      });

      expect(result).toMatchObject({
        status: "COMPLETED",
        agentDirectoryRefreshed: false,
        agentDirectoryWarning: true,
      });
      expect(finishCalls(rpcCalls).at(-1)?.args.p_success).toBe(true);
    },
  );

  it("não consulta agentes quando o diretório foi atualizado há menos de 6 horas", async () => {
    const now = new Date("2026-08-25T15:00:00.000Z");
    const { supabase } = createFakeSupabase({
      mappings: [{
        id: "mapping-recent",
        agent_name: "AGENTE TESTE",
        agent_email: "agent@example.test",
        last_seen_at: "2026-08-25T12:00:00.000Z",
      }],
    });
    const blessClient = createBlessClient();

    const result = await runCrmSync({ supabase, blessClient, now });

    expect(blessClient.listAgents).not.toHaveBeenCalled();
    expect(result.agentDirectoryRefreshed).toBe(false);
    expect(result.agentDirectoryWarning).toBe(false);
  });

  it("consulta agentes quando o diretório está desatualizado", async () => {
    const now = new Date("2026-08-25T15:00:00.000Z");
    const { supabase } = createFakeSupabase({
      mappings: [{
        id: "mapping-stale",
        agent_name: null,
        agent_email: null,
        last_seen_at: "2026-08-25T08:59:59.000Z",
      }],
    });
    const blessClient = createBlessClient();

    const result = await runCrmSync({ supabase, blessClient, now });

    expect(blessClient.listAgents).toHaveBeenCalledTimes(1);
    expect(result.agentDirectoryRefreshed).toBe(true);
  });

  it("mantém listSessions como dependência crítica e finaliza o sync como FAILED", async () => {
    const { supabase, rpcCalls } = createFakeSupabase();
    const blessClient = createBlessClient({
      listSessions: async () => {
        throw new Error("Bless sessions unavailable");
      },
    });

    await expect(runCrmSync({ supabase, blessClient })).rejects.toThrow(
      "Bless sessions unavailable",
    );
    expect(blessClient.listAgents).not.toHaveBeenCalled();
    expect(finishCalls(rpcCalls).at(-1)?.args.p_success).toBe(false);
  });

  it("mantém falha crítica do Supabase como FAILED", async () => {
    const { supabase, rpcCalls } = createFakeSupabase({
      mappingReadError: { message: "database unavailable" },
    });
    const blessClient = createBlessClient();

    await expect(runCrmSync({ supabase, blessClient })).rejects.toThrow(
      "Unable to load CRM agent directory freshness: database unavailable",
    );
    expect(finishCalls(rpcCalls).at(-1)?.args.p_success).toBe(false);
  });

  it("não apaga nem sobrescreve mapping existente quando o diretório falha", async () => {
    const existingMapping = {
      agent_name: "AGENTE EXISTENTE",
      id: "mapping-existing",
      agent_email: "existing@example.test",
      last_seen_at: "2026-08-24T08:00:00.000Z",
    };
    const { supabase, mappingWrites } = createFakeSupabase({
      mappings: [existingMapping],
    });
    const blessClient = createBlessClient({
      listAgents: async () => {
        throw new Error(
          "Bless API request failed after 3 attempts: GET /core/v1/agent returned 429.",
        );
      },
    });

    const result = await runCrmSync({ supabase, blessClient });

    expect(result.status).toBe("COMPLETED");
    expect(mappingWrites).toEqual([{
      operation: "update:crm_user_mappings",
      values: { last_seen_at: expect.any(String) },
    }]);
    expect(existingMapping).toMatchObject({
      id: "mapping-existing",
      agent_name: "AGENTE EXISTENTE",
      agent_email: "existing@example.test",
    });
  });

  it("não repete diretório rate-limited durante o cooldown persistido", async () => {
    const mappings = [{
      id: "mapping-rate-limited",
      agent_name: "AGENTE EXISTENTE",
      agent_email: "existing@example.test",
      last_seen_at: "2026-08-24T08:00:00.000Z",
    }];
    const { supabase } = createFakeSupabase({ mappings });
    const blessClient = createBlessClient({
      listAgents: async () => {
        throw new Error(
          "Bless API request failed after 3 attempts: GET /core/v1/agent returned 429.",
        );
      },
    });

    await runCrmSync({
      supabase,
      blessClient,
      now: new Date("2026-08-25T15:00:00.000Z"),
    });
    await runCrmSync({
      supabase,
      blessClient,
      now: new Date("2026-08-25T15:15:00.000Z"),
    });

    expect(blessClient.listAgents).toHaveBeenCalledTimes(1);
    expect(mappings[0].last_seen_at).toBe("2026-08-25T15:00:00.000Z");
  });

  it("mantém cooldown de 6 horas após 429 mesmo quando ainda não há mappings", async () => {
    const { supabase } = createFakeSupabase();
    const blessClient = createBlessClient({
      listAgents: async () => {
        throw new Error(
          "Bless API request failed after 3 attempts: GET /core/v1/agent returned 429.",
        );
      },
    });

    await runCrmSync({
      supabase,
      blessClient,
      now: new Date("2026-08-25T15:00:00.000Z"),
    });
    await runCrmSync({
      supabase,
      blessClient,
      now: new Date("2026-08-25T15:15:00.000Z"),
    });

    expect(blessClient.listAgents).toHaveBeenCalledTimes(1);
  });

  it("considera o diretório elegível novamente após exatamente 6 horas", () => {
    const now = new Date("2026-08-25T15:00:00.000Z");
    const recent = [{
      id: "mapping-recent",
      agent_name: "AGENTE",
      agent_email: null,
      last_seen_at: new Date(now.getTime() - AGENT_DIRECTORY_REFRESH_INTERVAL_MS + 1).toISOString(),
    }];
    const due = [{
      ...recent[0],
      last_seen_at: new Date(now.getTime() - AGENT_DIRECTORY_REFRESH_INTERVAL_MS).toISOString(),
    }];

    expect(shouldRefreshAgentDirectory(recent, now)).toBe(false);
    expect(shouldRefreshAgentDirectory(due, now)).toBe(true);
  });
});

describe("sincronização resiliente de mensagens Bless", () => {
  const recentDirectory = [{
    id: "mapping-recent-messages",
    agent_name: "AGENTE TESTE",
    agent_email: "agent@example.test",
    last_seen_at: "2026-08-25T14:00:00.000Z",
  }];

  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://supabase.example.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service-role-key");
    vi.stubEnv("BLESS_API_TOKEN", "synthetic-bless-token");
    vi.stubEnv("CRM_SYNC_SECRET", "synthetic-sync-secret");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("429 em mensagens preserva dados e watermark, abre o circuito e conclui o sync", async () => {
    const currentSessions = [
      session("session-1", 30, "33333333-3333-4333-8333-333333333333"),
      session("session-2", 20),
      session("session-3", 10),
    ];
    const previousWatermark = "2026-08-25T14:30:00.000Z";
    const stored = currentSessions.map((item) => storedSession(
      item.sessionId,
      previousWatermark,
    ));
    const { supabase, rpcCalls, sessionUpdates, tableWrites } = createFakeSupabase({
      mappings: recentDirectory.map((mapping) => ({ ...mapping })),
      storedSessions: stored,
    });
    const blessClient = createBlessClient({
      listSessions: async () => currentSessions,
      listMessages: async () => {
        throw new Error(
          "Bless API request failed after 3 attempts: GET /chat/v1/session/[session]/message returned 429.",
        );
      },
    });

    const result = await runCrmSync({
      supabase,
      blessClient,
      now: new Date("2026-08-25T16:00:00.000Z"),
    });

    expect(result).toMatchObject({
      status: "COMPLETED",
      messageSessionsProcessed: 0,
      messageSessionsPending: 3,
      messageSyncWarning: true,
    });
    expect(blessClient.listMessages).toHaveBeenCalledTimes(1);
    expect(sessionUpdates).toEqual([]);
    expect(stored[0].last_message_synced_at).toBe(previousWatermark);
    expect(stored[0].last_actor_type).toBe("CONTACT");
    expect(tableWrites).not.toContain("upsert:crm_message_activity");
    expect(tableWrites).not.toContain("upsert:crm_response_events");
    expect(finishCalls(rpcCalls).at(-1)?.args.p_success).toBe(true);

    const snapshotCall = rpcCalls.find((call) => call.name === "crm_apply_session_snapshots");
    const events = snapshotCall?.args.p_events as Array<Record<string, unknown>>;
    expect(events.some((event) => event.event_type === "TRANSFERRED")).toBe(true);
  });

  it("sessão com mensagem falha permanece elegível no próximo ciclo", () => {
    const current = session("session-retry", 30);
    const previous = storedSession(
      current.sessionId,
      "2026-08-25T14:30:00.000Z",
    );

    expect(needsMessageSync(previous as never, current)).toBe(true);
    expect(previous.last_message_synced_at).toBe("2026-08-25T14:30:00.000Z");
  });

  it("limita o incremental a 20 sessões e informa o backlog", async () => {
    const currentSessions = Array.from(
      { length: 25 },
      (_, index) => session(`session-${index + 1}`, index),
    );
    const stored = currentSessions.map((item) => storedSession(item.sessionId, null));
    const { supabase, sessionUpdates } = createFakeSupabase({
      mappings: recentDirectory.map((mapping) => ({ ...mapping })),
      storedSessions: stored,
    });
    const blessClient = createBlessClient({
      listSessions: async () => currentSessions,
    });

    const result = await runCrmSync({
      supabase,
      blessClient,
      mode: "incremental",
      now: new Date("2026-08-25T16:00:00.000Z"),
    });

    expect(MESSAGE_SESSION_BATCH_SIZE).toBe(20);
    expect(blessClient.listMessages).toHaveBeenCalledTimes(20);
    expect(sessionUpdates).toHaveLength(20);
    expect(result).toMatchObject({
      messageSessionsProcessed: 20,
      messageSessionsPending: 5,
      messageSyncWarning: false,
    });
  });

  it("sucesso atualiza o watermark e usa o filtro incremental oficial", async () => {
    const current = session("session-success", 30);
    const previousWatermark = "2026-08-25T14:30:00.000Z";
    const stored = [storedSession(current.sessionId, previousWatermark)];
    const { supabase, sessionUpdates } = createFakeSupabase({
      mappings: recentDirectory.map((mapping) => ({ ...mapping })),
      storedSessions: stored,
    });
    const blessClient = createBlessClient({
      listSessions: async () => [current],
    });

    const result = await runCrmSync({
      supabase,
      blessClient,
      now: new Date("2026-08-25T16:00:00.000Z"),
    });

    expect(blessClient.listMessages).toHaveBeenCalledWith(current.sessionId, {
      createdAfter: previousWatermark,
    });
    expect(sessionUpdates).toEqual([{
      sessionId: current.sessionId,
      values: {
        last_actor_type: "CONTACT",
        last_message_synced_at: "2026-08-25T16:00:00.000Z",
      },
    }]);
    expect(result.messageSessionsProcessed).toBe(1);
    expect(result.messageSessionsPending).toBe(0);
  });

  it("429 em listSessions continua crítico e finaliza o sync como FAILED", async () => {
    const { supabase, rpcCalls } = createFakeSupabase({
      mappings: recentDirectory.map((mapping) => ({ ...mapping })),
    });
    const blessClient = createBlessClient({
      listSessions: async () => {
        throw new Error(
          "Bless API request failed after 3 attempts: GET /chat/v2/session returned 429.",
        );
      },
    });

    await expect(runCrmSync({ supabase, blessClient })).rejects.toThrow(
      "GET /chat/v2/session returned 429",
    );
    expect(finishCalls(rpcCalls).at(-1)?.args.p_success).toBe(false);
  });

  it("mantém concorrência unitária e reserva vagas para drenar backlog", () => {
    const sessions = Array.from(
      { length: 25 },
      (_, index) => session(`priority-${index}`, index),
    );
    const previous = new Map(sessions.map((item, index) => [
      item.sessionId,
      storedSession(
        item.sessionId,
        new Date(Date.UTC(2026, 7, 25, 10, index)).toISOString(),
      ),
    ]));

    const selected = selectMessageSyncBatch(sessions, previous as never);

    expect(MESSAGE_CONCURRENCY).toBe(1);
    expect(selected).toHaveLength(20);
    expect(selected.some((item) => item.sessionId === "priority-0")).toBe(true);
    expect(selected.some((item) => item.sessionId === "priority-24")).toBe(true);
  });
});

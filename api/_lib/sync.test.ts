import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlessClient } from "./blessClient.js";
import {
  AGENT_DIRECTORY_REFRESH_INTERVAL_MS,
  runCrmSync,
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
}

function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const mappingWrites: Array<{ operation: string; values: Record<string, unknown> }> = [];
  let pendingUpdate: Record<string, unknown> | null = null;
  const syncState = {
    initialized_at: "2026-08-01T03:00:00.000Z",
    last_success_at: null as string | null,
    last_error_at: null as string | null,
    status: "SUCCEEDED",
  };

  const supabase = {
    from(table: string) {
      const builder = {
        select() {
          return builder;
        },
        eq() {
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
          mappingWrites.push({ operation: `upsert:${table}`, values });
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
      return { data: true, error: null };
    },
  };

  return {
    supabase: supabase as unknown as SupabaseClient,
    rpcCalls,
    mappingWrites,
  };
}

function createBlessClient(options: {
  listAgents?: () => Promise<unknown[]>;
  listSessions?: () => Promise<unknown[]>;
} = {}) {
  return {
    listAgents: vi.fn(options.listAgents || (async () => [])),
    listSessions: vi.fn(options.listSessions || (async () => [])),
    listMessages: vi.fn(async () => []),
  } as unknown as BlessClient & {
    listAgents: ReturnType<typeof vi.fn>;
    listSessions: ReturnType<typeof vi.fn>;
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

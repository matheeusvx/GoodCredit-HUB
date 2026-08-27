import { describe, expect, it } from "vitest";
import {
  BlessClient,
  DEFAULT_BLESS_TIMEOUT_MS,
  DEFAULT_MESSAGE_REQUEST_INTERVAL_MS,
  normalizeBlessSession,
} from "./blessClient.js";

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("BlessClient", () => {
  it("lista o diretório oficial usando userId, sem substituir por id/agentId", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (calls.length === 1) {
        return jsonResponse({ items: [{
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          userId: "11111111-1111-4111-8111-111111111111",
          name: "AGENTE DIRETÓRIO",
          email: "AGENTE@EXAMPLE.COM",
          phoneNumber: "+5500000000000",
          profile: "ADMIN",
        }, {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          name: "SEM USER ID",
          email: "invalid@example.com",
        }] }, 200, {
          link: '<https://api.example.test/core/v1/agent?cursor=next>; rel="next"',
        });
      }
      return jsonResponse([{
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        userId: "22222222-2222-4222-8222-222222222222",
        name: "SEGUNDO AGENTE",
        email: "second@example.com",
        profile: "AGENT",
      }]);
    }) as typeof fetch;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl,
      messageRequestIntervalMs: 0,
    });

    const agents = await client.listAgents();

    expect(agents).toEqual([{
      userId: "11111111-1111-4111-8111-111111111111",
      agentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "AGENTE DIRETÓRIO",
      email: "agente@example.com",
      profile: "ADMIN",
    }, {
      userId: "22222222-2222-4222-8222-222222222222",
      agentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      name: "SEGUNDO AGENTE",
      email: "second@example.com",
      profile: "AGENT",
    }]);
    expect(agents[0]).not.toHaveProperty("phoneNumber");
    expect(new URL(calls[0]).search).toBe("");
    expect(calls[1]).toBe("https://api.example.test/core/v1/agent?cursor=next");
  });

  it("pagina sessões com PageSize 100 e não filtra a carteira por CreatedAt", async () => {
    const calls: Array<{ url: string; authorization: string | null }> = [];
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `session-${index}`,
      userId: "11111111-1111-4111-8111-111111111111",
      status: "IN_PROGRESS",
      createdAt: "2026-05-01T12:00:00Z",
      updatedAt: "2026-08-25T12:00:00Z",
      lastInteractionDate: "2026-08-25T12:00:00Z",
      agentDetails: { userId: "11111111-1111-4111-8111-111111111111", name: "AGENTE TESTE", email: "agente@example.com" },
      contactDetails: { id: `contact-${index}`, name: `CLIENTE ${index}` },
    }));
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      calls.push({ url, authorization: headers.get("Authorization") });
      const page = new URL(url).searchParams.get("PageNumber");
      return page === "1"
        ? jsonResponse({ items: firstPage, totalItems: 101, hasMorePages: true })
        : jsonResponse({ items: [{ ...firstPage[0], id: "session-100" }], totalItems: 101, hasMorePages: false });
    }) as typeof fetch;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl,
    });
    const sessions = await client.listSessions({
      statuses: ["STARTED", "PENDING", "IN_PROGRESS"],
    });

    expect(sessions).toHaveLength(101);
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => call.authorization === "synthetic-api-credential")).toBe(true);
    expect(calls.every((call) => call.url.includes("PageSize=100"))).toBe(true);
    expect(calls.every((call) => !call.url.includes("CreatedAt"))).toBe(true);
    calls.forEach((call) => {
      const params = new URL(call.url).searchParams;
      expect(params.getAll("Status")).toEqual(["STARTED", "PENDING", "IN_PROGRESS"]);
      expect(params.getAll("IncludeDetails")).toEqual(["AgentDetails", "ContactDetails"]);
      expect(params.has("Status[]")).toBe(false);
      expect(params.has("IncludeDetails[]")).toBe(false);
    });
  });

  it("prioriza o nome sanitizado retornado em contactDetails", () => {
    const session = normalizeBlessSession({
      id: "SESSION_1",
      contactId: "CONTACT_1",
      contactName: "Nome alternativo",
      contactDetails: {
        id: "CONTACT_1",
        name: "Cliente Teste",
        phoneNumber: "+5500000000000",
      },
    });

    expect(session).toMatchObject({
      sessionId: "SESSION_1",
      contactId: "CONTACT_1",
      contactName: "Cliente Teste",
    });
    expect(session).not.toHaveProperty("phoneNumber");
  });

  it("pagina mensagens e preserva userId sem utilizar senderId", async () => {
    const calls: string[] = [];
    const messages = Array.from({ length: 100 }, (_, index) => ({
      id: `message-${index}`,
      userId: "11111111-1111-4111-8111-111111111111",
      senderId: `sender-${index}`,
      createdAt: "2026-08-25T13:00:00Z",
      direction: "TO_HUB",
      origin: "DEFAULT",
      type: "TEXT",
      text: "conteúdo que não deve ser persistido",
    }));
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      const page = new URL(url).searchParams.get("PageNumber");
      return page === "1"
        ? jsonResponse({ items: messages, totalItems: 101 })
        : jsonResponse({ items: [{ ...messages[0], id: "message-100" }], totalItems: 101 });
    }) as typeof fetch;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl,
    });
    const result = await client.listMessages("session-a");

    expect(result).toHaveLength(101);
    expect(calls).toHaveLength(2);
    expect(calls.every((url) => url.includes("PageSize=100"))).toBe(true);
    expect(result[0]).toMatchObject({
      userId: "11111111-1111-4111-8111-111111111111",
      senderId: "sender-0",
    });
    expect(result[0]).not.toHaveProperty("text");
  });

  it("aplica throttling global entre requests HTTP de mensagens", async () => {
    const waits: number[] = [];
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl: (async () => jsonResponse({ items: [], hasMorePages: false })) as typeof fetch,
      waitImpl: async (milliseconds) => {
        waits.push(milliseconds);
      },
    });

    await client.listMessages("session-a");
    await client.listMessages("session-b");

    expect(DEFAULT_MESSAGE_REQUEST_INTERVAL_MS).toBe(400);
    expect(waits).toEqual([400]);
  });

  it("envia CreatedAt.After sem assumir ordenação para paginação incremental", async () => {
    const calls: string[] = [];
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl: (async (input: string | URL | Request) => {
        calls.push(String(input));
        return jsonResponse({ items: [], hasMorePages: false });
      }) as typeof fetch,
      messageRequestIntervalMs: 0,
    });

    await client.listMessages("session-a", {
      createdAfter: "2026-08-25T14:30:00.000Z",
    });

    const params = new URL(calls[0]).searchParams;
    expect(params.get("CreatedAt.After")).toBe("2026-08-25T14:30:00.000Z");
    expect(params.has("OrderBy")).toBe(false);
    expect(params.has("OrderDirection")).toBe(false);
  });

  it("usa timeout padrão de 30 segundos", () => {
    expect(DEFAULT_BLESS_TIMEOUT_MS).toBe(30_000);
  });

  it.each([401, 403])("não repete chamadas após status %s", async (status) => {
    let attempts = 0;
    const fetchImpl = (async () => {
      attempts += 1;
      return new Response("", { status });
    }) as typeof fetch;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl,
      waitImpl: async () => undefined,
    });

    await expect(client.listSessions()).rejects.toThrow(
      `Bless API request failed after 1 attempt: GET /chat/v2/session returned ${status}.`,
    );
    expect(attempts).toBe(1);
  });

  it("repete chamadas após 429 e preserva o status final", async () => {
    let attempts = 0;
    const fetchImpl = (async () => {
      attempts += 1;
      return new Response("", { status: 429, headers: { "retry-after": "0" } });
    }) as typeof fetch;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl,
      waitImpl: async () => undefined,
    });

    await expect(client.listSessions()).rejects.toThrow(
      "Bless API request failed after 3 attempts: GET /chat/v2/session returned 429.",
    );
    expect(attempts).toBe(3);
  });

  it("repete chamadas após 503 e preserva o status final", async () => {
    let attempts = 0;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl: (async () => {
        attempts += 1;
        return new Response("", { status: 503 });
      }) as typeof fetch,
      waitImpl: async () => undefined,
    });

    await expect(client.listAgents()).rejects.toThrow(
      "Bless API request failed after 3 attempts: GET /core/v1/agent returned 503.",
    );
    expect(attempts).toBe(3);
  });

  it("repete timeout e informa a falha sem expor detalhes internos", async () => {
    let attempts = 0;
    const fetchImpl = (async (_input: string | URL | Request, init?: RequestInit) => {
      attempts += 1;
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("request aborted with synthetic-api-credential");
          error.name = "AbortError";
          reject(error);
        });
      });
    }) as typeof fetch;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl,
      timeoutMs: 1,
      waitImpl: async () => undefined,
    });

    const promise = client.listSessions();
    await expect(promise).rejects.toThrow(
      "Bless API request failed after 3 attempts: GET /chat/v2/session timed out.",
    );
    await expect(promise).rejects.not.toThrow("synthetic-api-credential");
    expect(attempts).toBe(3);
  });

  it("repete erros de rede e não inclui token nem mensagem original no erro", async () => {
    let attempts = 0;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl: (async () => {
        attempts += 1;
        throw new Error("network failed using Bearer synthetic-api-credential");
      }) as typeof fetch,
      waitImpl: async () => undefined,
    });

    const promise = client.listSessions();
    await expect(promise).rejects.toThrow(
      "Bless API request failed after 3 attempts: GET /chat/v2/session failed due to a network error.",
    );
    await expect(promise).rejects.not.toThrow("synthetic-api-credential");
    expect(attempts).toBe(3);
  });

  it("respeita Retry-After e limita a espera a 10 segundos", async () => {
    const waits: number[] = [];
    let attempts = 0;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl: (async () => {
        attempts += 1;
        if (attempts === 1) {
          return new Response("", { status: 429, headers: { "retry-after": "30" } });
        }
        return jsonResponse({ items: [], hasMorePages: false });
      }) as typeof fetch,
      waitImpl: async (milliseconds) => {
        waits.push(milliseconds);
      },
    });

    await expect(client.listSessions()).resolves.toEqual([]);
    expect(waits).toEqual([10_000]);
  });

  it("sanitiza o identificador de sessão e omite query e token no erro", async () => {
    const sessionId = "session-sensitive-customer-123";
    const token = "secret-bearer-token";
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token,
      fetchImpl: (async () => new Response("", { status: 503 })) as typeof fetch,
      waitImpl: async () => undefined,
    });

    const promise = client.listMessages(sessionId);
    await expect(promise).rejects.toThrow(
      "Bless API request failed after 3 attempts: GET /chat/v1/session/[session]/message returned 503.",
    );
    await expect(promise).rejects.not.toThrow(sessionId);
    await expect(promise).rejects.not.toThrow(token);
    await expect(promise).rejects.not.toThrow("PageNumber");
  });

  it("retorna sucesso após a segunda tentativa", async () => {
    const waits: number[] = [];
    let attempts = 0;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl: (async () => {
        attempts += 1;
        return attempts === 1
          ? new Response("", { status: 503 })
          : jsonResponse({ items: [], hasMorePages: false });
      }) as typeof fetch,
      waitImpl: async (milliseconds) => {
        waits.push(milliseconds);
      },
    });

    await expect(client.listSessions()).resolves.toEqual([]);
    expect(attempts).toBe(2);
    expect(waits).toEqual([750]);
  });

  it("aplica backoff exponencial de 750 ms e 1500 ms", async () => {
    const waits: number[] = [];
    let attempts = 0;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl: (async () => {
        attempts += 1;
        return attempts < 3
          ? new Response("", { status: 503 })
          : jsonResponse({ items: [], hasMorePages: false });
      }) as typeof fetch,
      waitImpl: async (milliseconds) => {
        waits.push(milliseconds);
      },
    });

    await expect(client.listSessions()).resolves.toEqual([]);
    expect(waits).toEqual([750, 1_500]);
  });
});

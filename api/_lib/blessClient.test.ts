import { describe, expect, it } from "vitest";
import { BlessClient } from "./blessClient.js";

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
    expect(calls[0].url).toContain("IncludeDetails%5B%5D=AgentDetails");
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

  it("repete chamadas limitadamente após 429", async () => {
    let attempts = 0;
    const fetchImpl = (async () => {
      attempts += 1;
      return attempts === 1
        ? new Response("", { status: 429, headers: { "retry-after": "0" } })
        : jsonResponse({ items: [], hasMorePages: false });
    }) as typeof fetch;
    const client = new BlessClient({
      baseUrl: "https://api.example.test",
      token: "synthetic-api-credential",
      fetchImpl,
    });
    await expect(client.listSessions()).resolves.toEqual([]);
    expect(attempts).toBe(2);
  });
});

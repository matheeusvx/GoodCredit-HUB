import { describe, expect, it } from "vitest";
import dashboardHandler from "../crm/dashboard.js";
import { isCrmDashboardMappingEligible } from "./dashboard.js";
import { REQUIRED_BLESS_EXCLUDED_USER_ID, getExcludedBlessUserIds } from "./config.js";
import { bearerToken, hasForbiddenIdentityParameter, type ApiRequest, type ApiResponse } from "./http.js";
import { resolveAutomaticMappingRows, safeErrorMessage } from "./sync.js";

function responseRecorder() {
  const record = { status: 0, body: null as unknown };
  const response: ApiResponse = {
    status(statusCode) { record.status = statusCode; return response; },
    json(body) { record.body = body; },
    setHeader() { return undefined; },
  };
  return { record, response };
}

describe("segurança da integração CRM", () => {
  it("mantém o usuário excluído obrigatório e não cria mapping para ele", () => {
    const excluded = getExcludedBlessUserIds();
    expect(excluded.has(REQUIRED_BLESS_EXCLUDED_USER_ID)).toBe(true);
    const rows = resolveAutomaticMappingRows({
      agents: [{ userId: REQUIRED_BLESS_EXCLUDED_USER_ID, name: "NÃO PERSISTIR", email: "excluded@example.com" }],
      hubUsers: [{ id: "hub-a", email: "excluded@example.com" }] as never[],
      existing: [],
      excludedUserIds: excluded,
      seenAt: "2026-08-25T12:00:00Z",
    });
    expect(rows).toEqual([]);
  });

  it("vincula somente e-mail exato e não ambíguo, nunca por nome", () => {
    const rows = resolveAutomaticMappingRows({
      agents: [
        { userId: "11111111-1111-4111-8111-111111111111", name: "MESMO NOME", email: "agent@example.com" },
        { userId: "22222222-2222-4222-8222-222222222222", name: "OUTRO", email: "ambiguous@example.com" },
        { userId: "33333333-3333-4333-8333-333333333333", name: "OUTRO", email: "ambiguous@example.com" },
      ],
      hubUsers: [
        { id: "hub-a", email: "AGENT@example.com" },
        { id: "hub-name-only", email: "different@example.com", user_metadata: { name: "MESMO NOME" } },
        { id: "hub-ambiguous", email: "ambiguous@example.com" },
      ] as never[],
      existing: [],
      excludedUserIds: new Set(),
      seenAt: "2026-08-25T12:00:00Z",
    });
    expect(rows.find((row) => row.bless_user_id.startsWith("1111"))?.hub_user_id).toBe("hub-a");
    expect(rows.filter((row) => row.bless_user_id.startsWith("2222") || row.bless_user_id.startsWith("3333")).every((row) => row.hub_user_id === null)).toBe(true);
  });

  it("enriquece mapping explícito existente mesmo sem correspondência de e-mail", () => {
    const rows = resolveAutomaticMappingRows({
      agents: [{
        userId: "11111111-1111-4111-8111-111111111111",
        name: "NOME DO DIRETÓRIO",
        email: "directory@example.com",
      }],
      hubUsers: [{ id: "hub-a", email: "different@example.com" }] as never[],
      existing: [{
        id: "mapping-a",
        hub_user_id: "hub-a",
        bless_user_id: "11111111-1111-4111-8111-111111111111",
        agent_email: null,
      }],
      excludedUserIds: new Set(),
      seenAt: "2026-08-25T12:00:00Z",
    });

    expect(rows).toEqual([{
      bless_user_id: "11111111-1111-4111-8111-111111111111",
      hub_user_id: "hub-a",
      agent_name: "NOME DO DIRETÓRIO",
      agent_email: "directory@example.com",
      last_seen_at: "2026-08-25T12:00:00Z",
    }]);
  });

  it("não libera dashboard para conta Bless sem hub_user_id", () => {
    expect(isCrmDashboardMappingEligible({
      hub_user_id: null,
      bless_user_id: "11111111-1111-4111-8111-111111111111",
      agent_name: "AGENTE SEM HUB",
      agent_email: "agent@example.com",
    }, "hub-a", new Set())).toBe(false);
  });

  it("rejeita identidade arbitrária e extrai somente o Bearer token", () => {
    const request: ApiRequest = {
      method: "GET",
      headers: { authorization: "Bearer token-sintetico" },
      query: { userId: "outro-usuario" },
    };
    expect(hasForbiddenIdentityParameter(request)).toBe(true);
    expect(bearerToken(request)).toBe("token-sintetico");
  });

  it("retorna 401 para chamada anônima antes de consultar configuração ou dados", async () => {
    const { record, response } = responseRecorder();
    await dashboardHandler({ method: "GET", headers: {}, query: {} }, response);
    expect(record.status).toBe(401);
    expect(record.body).toEqual({ error: "Não autorizado." });
  });

  it("retorna 400 para período custom inválido antes de consultar dados", async () => {
    const { record, response } = responseRecorder();
    await dashboardHandler({
      method: "GET",
      headers: { authorization: "Bearer token-sintetico" },
      query: { period: "custom", from: "2026-08-20", to: "2026-08-05" },
    }, response);
    expect(record.status).toBe(400);
    expect(record.body).toEqual({
      error: "A data inicial não pode ser posterior à final.",
    });
  });

  it("preserva o diagnóstico sanitizado do BlessClient no estado do sync", () => {
    const message = "Bless API request failed after 3 attempts: GET /chat/v2/session returned 503.";
    expect(safeErrorMessage(new Error(message))).toBe(message);
  });

  it("remove credenciais de mensagens antes de persistir o erro do sync", () => {
    const result = safeErrorMessage(new Error(
      "Authorization: Bearer segredo-1; api_token=segredo-2; Bearer segredo-3",
    ));
    expect(result).not.toContain("segredo-1");
    expect(result).not.toContain("segredo-2");
    expect(result).not.toContain("segredo-3");
  });
});

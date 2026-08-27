import { loadCrmAttendanceDetail } from "../_lib/attendanceDetail.js";
import { assertDashboardConfig } from "../_lib/config.js";
import {
  bearerToken,
  hasForbiddenIdentityParameter,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";
import { authenticateSupabaseRequest, createSupabaseAdmin } from "../_lib/supabaseAdmin.js";
import { parseCrmAnalyticsPeriodQuery } from "../../src/lib/crm/time.js";

function singleQueryValue(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value.trim() : null;
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { error: "Método não permitido." });
    return;
  }
  if (hasForbiddenIdentityParameter(request)) {
    sendJson(response, 400, { error: "Parâmetro de identidade não permitido." });
    return;
  }
  const token = bearerToken(request);
  if (!token) {
    sendJson(response, 401, { error: "Não autorizado." });
    return;
  }
  const sessionId = singleQueryValue(request.query?.sessionId);
  if (!sessionId || sessionId.length > 200) {
    sendJson(response, 400, { error: "sessionId inválida." });
    return;
  }

  let periodRequest;
  try {
    periodRequest = parseCrmAnalyticsPeriodQuery(request.query);
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Período inválido.",
    });
    return;
  }

  let config;
  try {
    config = assertDashboardConfig();
  } catch {
    sendJson(response, 503, { error: "Integração CRM não configurada." });
    return;
  }
  const supabase = createSupabaseAdmin(config.supabaseUrl, config.supabaseServiceRoleKey);
  const hubUser = await authenticateSupabaseRequest(supabase, token);
  if (!hubUser) {
    sendJson(response, 401, { error: "Não autorizado." });
    return;
  }

  try {
    const detail = await loadCrmAttendanceDetail({
      supabase,
      hubUser,
      sessionId,
      metricsStartAt: config.metricsStartAt,
      excludedUserIds: config.excludedBlessUserIds,
      periodRequest,
    });
    if (!detail) {
      sendJson(response, 404, { error: "Atendimento não encontrado." });
      return;
    }
    sendJson(response, 200, detail);
  } catch {
    sendJson(response, 503, { error: "Não foi possível carregar o atendimento." });
  }
}

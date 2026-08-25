import { buildCrmDashboard, emptyCrmDashboard } from "../_lib/dashboard.js";
import { assertDashboardConfig, getServerConfig } from "../_lib/config.js";
import {
  bearerToken,
  hasForbiddenIdentityParameter,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";
import { runCrmSync } from "../_lib/sync.js";
import { parseCrmAnalyticsPeriodQuery } from "../../src/lib/crm/time.js";
import {
  authenticateSupabaseRequest,
  createSupabaseAdmin,
} from "../_lib/supabaseAdmin.js";

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
    const fallback = getServerConfig();
    sendJson(
      response,
      503,
      emptyCrmDashboard(fallback.metricsStartAt, "NOT_CONFIGURED", undefined, periodRequest)
    );
    return;
  }
  const supabase = createSupabaseAdmin(
    config.supabaseUrl,
    config.supabaseServiceRoleKey
  );
  const hubUser = await authenticateSupabaseRequest(supabase, token);
  if (!hubUser) {
    sendJson(response, 401, { error: "Não autorizado." });
    return;
  }
  if (!config.blessApiToken || !config.crmSyncSecret) {
    sendJson(
      response,
      200,
      emptyCrmDashboard(config.metricsStartAt, "NOT_CONFIGURED", undefined, periodRequest)
    );
    return;
  }

  const refresh = request.query?.refresh === "1";
  if (refresh && config.blessApiToken && config.crmSyncSecret) {
    try {
      const { data: state } = await supabase
        .from("crm_sync_state")
        .select("last_success_at")
        .eq("id", "bless-primary")
        .maybeSingle();
      const lastSuccessAt = state?.last_success_at
        ? new Date(state.last_success_at).getTime()
        : 0;
      if (Date.now() - lastSuccessAt >= 4 * 60 * 1000) {
        await runCrmSync({ mode: "incremental", supabase });
      }
    } catch {
      // Dashboard data remains available from the last successful snapshot.
    }
  }

  try {
    const dashboard = await buildCrmDashboard({
      supabase,
      hubUser,
      metricsStartAt: config.metricsStartAt,
      excludedUserIds: config.excludedBlessUserIds,
      periodRequest,
    });
    sendJson(response, 200, dashboard);
  } catch {
    sendJson(response, 503, {
      error: "Não foi possível atualizar os indicadores.",
    });
  }
}

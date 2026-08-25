import { buildCrmDashboard, emptyCrmDashboard } from "../_lib/dashboard";
import { assertDashboardConfig, getServerConfig } from "../_lib/config";
import {
  bearerToken,
  hasForbiddenIdentityParameter,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";
import { runCrmSync } from "../_lib/sync";
import {
  authenticateSupabaseRequest,
  createSupabaseAdmin,
} from "../_lib/supabaseAdmin";

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

  let config;
  try {
    config = assertDashboardConfig();
  } catch {
    const fallback = getServerConfig();
    sendJson(
      response,
      503,
      emptyCrmDashboard(fallback.metricsStartAt, "NOT_CONFIGURED")
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
      emptyCrmDashboard(config.metricsStartAt, "NOT_CONFIGURED")
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
    });
    sendJson(response, 200, dashboard);
  } catch {
    sendJson(response, 503, {
      error: "Não foi possível atualizar os indicadores.",
    });
  }
}

import type { CrmDashboardResponse } from "../types/crmDashboard";

function isDashboardResponse(value: unknown): value is CrmDashboardResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CrmDashboardResponse>;
  return Boolean(candidate.metrics && candidate.sessions && candidate.meta);
}

export async function getCrmDashboard(
  accessToken: string,
  options: { refresh?: boolean; signal?: AbortSignal } = {}
): Promise<CrmDashboardResponse> {
  const endpoint = options.refresh
    ? "/api/crm/dashboard?refresh=1"
    : "/api/crm/dashboard";
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: options.signal,
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as unknown;
  if (isDashboardResponse(body)) return body;
  if (response.status === 401) throw new Error("Sua sessão expirou.");
  throw new Error("Não foi possível atualizar os indicadores.");
}

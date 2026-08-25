import type { CrmAnalyticsPeriodKey, CrmDashboardResponse } from "../types/crmDashboard";

export interface CrmDashboardRequestOptions {
  period?: CrmAnalyticsPeriodKey;
  from?: string;
  to?: string;
  refresh?: boolean;
  signal?: AbortSignal;
}

function isDashboardResponse(value: unknown): value is CrmDashboardResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CrmDashboardResponse>;
  return Boolean(candidate.metrics && candidate.sessions && candidate.meta);
}

export async function getCrmDashboard(
  accessToken: string,
  options: CrmDashboardRequestOptions = {}
): Promise<CrmDashboardResponse> {
  const params = new URLSearchParams();
  if (options.period) params.set("period", options.period);
  if (options.period === "custom" && options.from && options.to) {
    params.set("from", options.from);
    params.set("to", options.to);
  }
  if (options.refresh) params.set("refresh", "1");
  const endpoint = `/api/crm/dashboard${params.size ? `?${params.toString()}` : ""}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: options.signal,
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as unknown;
  if (isDashboardResponse(body)) return body;
  if (response.status === 401) throw new Error("Sua sessão expirou.");
  if (response.status === 400 && body && typeof body === "object" && "error" in body) {
    throw new Error(String(body.error));
  }
  throw new Error("Não foi possível atualizar os indicadores.");
}

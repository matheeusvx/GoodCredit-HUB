export const DEFAULT_CRM_METRICS_START_AT = "2026-08-01T03:00:00Z";
export const REQUIRED_BLESS_EXCLUDED_USER_ID = "74c069d0-2286-427b-a3a0-dbf89e228984";

function env(name: string): string {
  return String(process.env[name] || "").trim();
}

export function getExcludedBlessUserIds(): Set<string> {
  const configured = env("BLESS_EXCLUDED_USER_IDS")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return new Set([REQUIRED_BLESS_EXCLUDED_USER_ID, ...configured]);
}

export function getMetricsStartAt(): string {
  const value = env("CRM_METRICS_START_AT") || DEFAULT_CRM_METRICS_START_AT;
  if (!Number.isFinite(new Date(value).getTime())) {
    throw new Error("CRM_METRICS_START_AT is invalid.");
  }
  return new Date(value).toISOString();
}

export function getServerConfig() {
  const config = {
    blessApiBaseUrl: env("BLESS_API_BASE_URL") || "https://api.wts.chat",
    blessApiToken: env("BLESS_API_TOKEN"),
    supabaseUrl: env("SUPABASE_URL"),
    supabaseServiceRoleKey: env("SUPABASE_SERVICE_ROLE_KEY"),
    crmSyncSecret: env("CRM_SYNC_SECRET"),
    metricsStartAt: getMetricsStartAt(),
    excludedBlessUserIds: getExcludedBlessUserIds(),
  };
  return config;
}

export function assertDashboardConfig() {
  const config = getServerConfig();
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error("CRM server Supabase configuration is missing.");
  }
  return config;
}

export function assertSyncConfig() {
  const config = assertDashboardConfig();
  if (!config.blessApiToken) throw new Error("BLESS_API_TOKEN is missing.");
  if (!config.crmSyncSecret) throw new Error("CRM_SYNC_SECRET is missing.");
  return config;
}

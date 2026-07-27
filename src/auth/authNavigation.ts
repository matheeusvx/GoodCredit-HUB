export const PUBLIC_AUTH_PATHS = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback"
]);

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.has(pathname);
}

export function sanitizeInternalDestination(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const url = new URL(value, "https://goodcredit.local");
    if (url.origin !== "https://goodcredit.local") return "/";
    if (isPublicAuthPath(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function getReturnPath(search: string): string {
  const value = new URLSearchParams(search).get("returnTo");
  return sanitizeInternalDestination(value);
}

export function buildLoginPath(
  returnTo: string,
  reason?: "session-expired"
): string {
  const params = new URLSearchParams({
    returnTo: sanitizeInternalDestination(returnTo)
  });
  if (reason) params.set("reason", reason);
  return `/login?${params.toString()}`;
}

export function replaceAppPath(path: string): void {
  window.history.replaceState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}


interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status: (statusCode: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export type { ApiRequest, ApiResponse };

export function headerValue(
  request: ApiRequest,
  name: string
): string | null {
  const value = request.headers[name.toLowerCase()] ?? request.headers[name];
  return Array.isArray(value) ? value[0] || null : value || null;
}

export function bearerToken(request: ApiRequest): string | null {
  const authorization = headerValue(request, "authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function sendJson(
  response: ApiResponse,
  status: number,
  body: unknown
): void {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(body);
}

export function hasForbiddenIdentityParameter(request: ApiRequest): boolean {
  const query = request.query || {};
  return ["userId", "hubUserId", "blessUserId", "bless_user_id"].some(
    (key) => query[key] !== undefined
  );
}

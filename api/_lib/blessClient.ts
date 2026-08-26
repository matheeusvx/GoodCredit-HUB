import type { CrmSessionStatus } from "../../src/types/crmDashboard.js";
import type { CrmRawMessageIdentity } from "../../src/lib/crm/domain.js";

type JsonRecord = Record<string, unknown>;

export interface BlessAgentDetails {
  userId: string;
  name: string | null;
  email: string | null;
}

export interface BlessDirectoryAgent extends BlessAgentDetails {
  agentId: string | null;
  profile: string | null;
}

export interface BlessSession {
  sessionId: string;
  contactId: string | null;
  contactName: string | null;
  currentUserId: string | null;
  departmentId: string | null;
  status: CrmSessionStatus;
  createdAt: string | null;
  updatedAt: string | null;
  lastInteractionAt: string | null;
  unreadCount: number;
  agentDetails: BlessAgentDetails | null;
}

interface BlessClientOptions {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  waitImpl?: (milliseconds: number) => Promise<void>;
}

interface SessionQuery {
  statuses?: CrmSessionStatus[];
  lastInteractionAfter?: string;
  updatedAfter?: string;
}

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: unknown): string | null {
  const text = stringValue(value);
  if (!text || !Number.isFinite(new Date(text).getTime())) return null;
  return new Date(text).toISOString();
}

function arrayPage(payload: unknown): {
  items: unknown[];
  hasMorePages: boolean;
  totalItems: number | null;
} {
  const root = object(payload);
  const nested = object(root.data);
  const source = Object.keys(nested).length ? nested : root;
  const items = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.agents)
      ? source.agents
      : Array.isArray(source.data)
        ? source.data
        : Array.isArray(payload)
          ? payload
          : [];
  return {
    items,
    hasMorePages: source.hasMorePages === true || source.hasNextPage === true,
    totalItems: source.totalItems === undefined ? null : numberValue(source.totalItems),
  };
}

function explicitNextUrl(payload: unknown, linkHeader: string | null): string | null {
  const linkMatch = linkHeader?.match(/<([^>]+)>\s*;\s*rel\s*=\s*["']?next["']?/i);
  if (linkMatch?.[1]) return linkMatch[1];
  const root = object(payload);
  const nested = object(root.data);
  const links = object(root.links);
  const nestedLinks = object(nested.links);
  return stringValue(
    root.nextPageUrl
    ?? root.nextUrl
    ?? root.next
    ?? links.next
    ?? nested.nextPageUrl
    ?? nested.nextUrl
    ?? nested.next
    ?? nestedLinks.next
  );
}

function normalizeStatus(value: unknown): CrmSessionStatus {
  const status = String(value || "UNDEFINED").toUpperCase();
  return ["UNDEFINED", "STARTED", "PENDING", "IN_PROGRESS", "COMPLETED", "HIDDEN"].includes(status)
    ? status as CrmSessionStatus
    : "UNDEFINED";
}

export function normalizeBlessSession(value: unknown): BlessSession | null {
  const item = object(value);
  const agent = object(item.agentDetails);
  const contact = object(item.contactDetails);
  const sessionId = stringValue(item.id ?? item.sessionId);
  if (!sessionId) return null;
  const currentUserId = stringValue(item.userId ?? agent.userId)?.toLowerCase() || null;
  return {
    sessionId,
    contactId: stringValue(item.contactId ?? contact.id),
    contactName: stringValue(contact.name ?? item.contactName),
    currentUserId,
    departmentId: stringValue(item.departmentId),
    status: normalizeStatus(item.status),
    createdAt: dateValue(item.createdAt),
    updatedAt: dateValue(item.updatedAt),
    lastInteractionAt: dateValue(item.lastInteractionDate ?? item.lastInteractionAt),
    unreadCount: Math.max(0, Math.floor(numberValue(item.unreadCount))),
    agentDetails: currentUserId
      ? {
          userId: currentUserId,
          name: stringValue(agent.name),
          email: stringValue(agent.email)?.toLowerCase() || null,
        }
      : null,
  };
}

export function normalizeBlessMessage(
  value: unknown,
  sessionId: string
): CrmRawMessageIdentity | null {
  const item = object(value);
  const messageId = stringValue(item.id ?? item.messageId);
  const timestamp = dateValue(item.createdAt ?? item.timestamp ?? item.sentAt);
  if (!messageId || !timestamp) return null;
  return {
    messageId,
    sessionId,
    userId: stringValue(item.userId)?.toLowerCase() || null,
    senderId: stringValue(item.senderId),
    timestamp,
    direction: stringValue(item.direction)?.toUpperCase() || null,
    origin: stringValue(item.origin)?.toUpperCase() || null,
    messageType: stringValue(item.type ?? item.messageType)?.toUpperCase() || null,
  };
}

export function normalizeBlessDirectoryAgent(value: unknown): BlessDirectoryAgent | null {
  const item = object(value);
  const userId = stringValue(item.userId)?.toLowerCase() || null;
  if (!userId) return null;
  return {
    userId,
    agentId: stringValue(item.id ?? item.agentId)?.toLowerCase() || null,
    name: stringValue(item.name),
    email: stringValue(item.email)?.toLowerCase() || null,
    profile: stringValue(item.profile)?.toUpperCase() || null,
  };
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const DEFAULT_BLESS_TIMEOUT_MS = 30_000;

const MAX_ATTEMPTS = 3;
const MAX_RETRY_AFTER_MS = 10_000;
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

type RequestFailure =
  | { type: "http"; status: number }
  | { type: "timeout" }
  | { type: "network" };

function sanitizeEndpoint(pathname: string): string {
  return pathname.replace(
    /^\/chat\/v1\/session\/[^/]+\/message\/?$/i,
    "/chat/v1/session/[session]/message",
  );
}

function getRetryDelay(response: Response | null, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after")?.trim();
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1_000, MAX_RETRY_AFTER_MS);
    }

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.min(Math.max(retryAt - Date.now(), 0), MAX_RETRY_AFTER_MS);
    }
  }

  return 750 * 2 ** (attempt - 1);
}

function createRequestError(
  method: "GET",
  endpoint: string,
  attempts: number,
  failure: RequestFailure,
): Error {
  const attemptLabel = attempts === 1 ? "attempt" : "attempts";
  const prefix = `Bless API request failed after ${attempts} ${attemptLabel}: ${method} ${endpoint}`;

  if (failure.type === "http") {
    return new Error(`${prefix} returned ${failure.status}.`);
  }
  if (failure.type === "timeout") {
    return new Error(`${prefix} timed out.`);
  }
  return new Error(`${prefix} failed due to a network error.`);
}

export class BlessClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly waitImpl: (milliseconds: number) => Promise<void>;

  constructor(options: BlessClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.fetchImpl = options.fetchImpl || fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_BLESS_TIMEOUT_MS;
    this.waitImpl = options.waitImpl ?? wait;
  }

  private async requestPage(
    path: string,
    params = new URLSearchParams()
  ): Promise<{ payload: unknown; nextUrl: string | null }> {
    const url = new URL(path, `${this.baseUrl}/`);
    if (url.origin !== new URL(this.baseUrl).origin) {
      throw new Error("Bless API pagination URL has an unexpected origin.");
    }
    params.forEach((value, key) => url.searchParams.append(key, value));
    const endpoint = sanitizeEndpoint(url.pathname);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.timeoutMs);
      try {
        const response = await this.fetchImpl(url.toString(), {
          method: "GET",
          headers: { Authorization: this.token },
          signal: controller.signal,
        });
        if (response.ok) {
          const payload = await response.json();
          return {
            payload,
            nextUrl: explicitNextUrl(payload, response.headers.get("link")),
          };
        }
        const failure: RequestFailure = { type: "http", status: response.status };
        if (!RETRYABLE_HTTP_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
          throw createRequestError("GET", endpoint, attempt, failure);
        }
        await this.waitImpl(getRetryDelay(response, attempt));
      } catch (error) {
        if (
          error instanceof Error
          && error.message.startsWith("Bless API request failed after")
        ) {
          throw error;
        }

        const failure: RequestFailure =
          timedOut || (error instanceof Error && error.name === "AbortError")
            ? { type: "timeout" }
            : { type: "network" };
        if (attempt === MAX_ATTEMPTS) {
          throw createRequestError("GET", endpoint, attempt, failure);
        }
        await this.waitImpl(getRetryDelay(null, attempt));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw createRequestError("GET", endpoint, MAX_ATTEMPTS, { type: "network" });
  }

  private async request(path: string, params: URLSearchParams): Promise<unknown> {
    return (await this.requestPage(path, params)).payload;
  }

  async listAgents(): Promise<BlessDirectoryAgent[]> {
    const agents = new Map<string, BlessDirectoryAgent>();
    let nextPath: string | null = "/core/v1/agent";
    for (let page = 0; nextPath && page < 1000; page += 1) {
      const response = await this.requestPage(nextPath);
      const parsed = arrayPage(response.payload);
      parsed.items
        .map(normalizeBlessDirectoryAgent)
        .filter((agent): agent is BlessDirectoryAgent => Boolean(agent))
        .forEach((agent) => agents.set(agent.userId, agent));
      if (!response.nextUrl) {
        const incomplete = parsed.hasMorePages
          || (parsed.totalItems !== null && agents.size < parsed.totalItems);
        if (incomplete) {
          throw new Error(
            "Bless agent directory indicates more pages without an explicit next-page URL."
          );
        }
        nextPath = null;
      } else {
        nextPath = response.nextUrl;
      }
    }
    return [...agents.values()];
  }

  async listSessions(query: SessionQuery = {}): Promise<BlessSession[]> {
    const result: BlessSession[] = [];
    for (let pageNumber = 1; pageNumber <= 1000; pageNumber += 1) {
      const params = new URLSearchParams({
        Type: "INDIVIDUAL",
        PageNumber: String(pageNumber),
        PageSize: "100",
      });
      query.statuses?.forEach((status) => params.append("Status", status));
      if (query.lastInteractionAfter) {
        params.set("LastInteractionAt.After", query.lastInteractionAfter);
      }
      if (query.updatedAfter) params.set("UpdatedAt.After", query.updatedAfter);
      params.append("IncludeDetails", "AgentDetails");
      params.append("IncludeDetails", "ContactDetails");
      const page = arrayPage(await this.request("/chat/v2/session", params));
      result.push(
        ...page.items
          .map(normalizeBlessSession)
          .filter((item): item is BlessSession => Boolean(item))
      );
      const loaded = result.length;
      const hasMore = page.hasMorePages
        || (page.totalItems !== null && loaded < page.totalItems)
        || (page.totalItems === null && page.items.length === 100);
      if (!hasMore) break;
    }
    return result;
  }

  async listMessages(sessionId: string): Promise<CrmRawMessageIdentity[]> {
    const result: CrmRawMessageIdentity[] = [];
    for (let pageNumber = 1; pageNumber <= 1000; pageNumber += 1) {
      const params = new URLSearchParams({
        PageNumber: String(pageNumber),
        PageSize: "100",
      });
      const page = arrayPage(
        await this.request(
          `/chat/v1/session/${encodeURIComponent(sessionId)}/message`,
          params
        )
      );
      result.push(
        ...page.items
          .map((item) => normalizeBlessMessage(item, sessionId))
          .filter((item): item is CrmRawMessageIdentity => Boolean(item))
      );
      const loaded = result.length;
      const hasMore = page.hasMorePages
        || (page.totalItems !== null && loaded < page.totalItems)
        || (page.totalItems === null && page.items.length === 100);
      if (!hasMore) break;
    }
    return result;
  }
}

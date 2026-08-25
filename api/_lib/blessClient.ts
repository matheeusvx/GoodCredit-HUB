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

export class BlessClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: BlessClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.fetchImpl = options.fetchImpl || fetch;
    this.timeoutMs = options.timeoutMs || 15_000;
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
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
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
        if (response.status !== 429 && response.status < 500) {
          throw new Error(`Bless API request failed with status ${response.status}.`);
        }
        if (attempt === 2) {
          throw new Error(`Bless API unavailable with status ${response.status}.`);
        }
        const retryAfter = Number(response.headers.get("retry-after"));
        await wait(Number.isFinite(retryAfter)
          ? Math.min(5_000, Math.max(250, retryAfter * 1000))
          : 500 * (attempt + 1));
      } catch (error) {
        if (
          error instanceof Error
          && error.message.startsWith("Bless API request failed with status")
        ) {
          throw error;
        }
        if (attempt === 2) throw new Error("Bless API request failed after retries.");
        await wait(500 * (attempt + 1));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error("Bless API request failed.");
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

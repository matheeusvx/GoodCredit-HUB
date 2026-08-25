import type {
  CrmDashboardMetrics,
  CrmDashboardSession,
  CrmSessionStatus,
} from "../../types/crmDashboard.js";
import { getSaoPauloDayRange, isInsideRange } from "./time.js";

export type CrmActorType = "CUSTOMER" | "AGENT" | "EXCLUDED" | "UNKNOWN";
export type CrmAssignmentScope = "VALID" | "EXCLUDED" | "UNASSIGNED" | "UNKNOWN";
export type CrmAssignmentEventType =
  | "ASSIGNED"
  | "TRANSFERRED"
  | "UNASSIGNED"
  | "COMPLETED"
  | "REOPENED";

export interface CrmRawMessageIdentity {
  messageId: string;
  sessionId: string;
  userId: string | null;
  senderId?: string | null;
  timestamp: string;
  direction: string | null;
  origin: string | null;
  messageType: string | null;
}

export interface CrmMessageActivity {
  messageId: string;
  sessionId: string;
  actorType: CrmActorType;
  blessUserId: string | null;
  timestamp: string;
  direction: string | null;
  origin: string | null;
  messageType: string | null;
}

export interface CrmOwner {
  scope: CrmAssignmentScope;
  blessUserId: string | null;
}

export interface CrmSessionSnapshot extends CrmOwner {
  sessionId: string;
  status: CrmSessionStatus;
  updatedAt: string | null;
}

export interface CrmAssignmentEvent {
  eventKey: string;
  sessionId: string;
  eventType: CrmAssignmentEventType;
  fromBlessUserId: string | null;
  toBlessUserId: string | null;
  fromScope: CrmAssignmentScope;
  toScope: CrmAssignmentScope;
  detectedAt: string;
  source: "SNAPSHOT";
}

export interface CrmResponseEvent {
  sessionId: string;
  agentBlessUserId: string;
  waitStartedAt: string;
  respondedAt: string;
  responseSeconds: number;
}

export function classifyCrmMessage(
  message: CrmRawMessageIdentity,
  excludedUserIds: ReadonlySet<string>
): CrmMessageActivity {
  const userId = message.userId?.trim().toLowerCase() || null;
  let actorType: CrmActorType = "UNKNOWN";
  let blessUserId: string | null = null;

  if (userId && excludedUserIds.has(userId)) {
    actorType = "EXCLUDED";
  } else if (userId && message.direction === "TO_HUB") {
    actorType = "AGENT";
    blessUserId = userId;
  } else if (!userId && message.direction === "FROM_HUB") {
    actorType = "CUSTOMER";
  }

  return {
    messageId: message.messageId,
    sessionId: message.sessionId,
    actorType,
    blessUserId,
    timestamp: message.timestamp,
    direction: message.direction,
    origin: message.origin,
    messageType: message.messageType,
  };
}

export function sanitizeCrmOwner(
  userId: string | null | undefined,
  excludedUserIds: ReadonlySet<string>
): CrmOwner {
  const normalized = userId?.trim().toLowerCase() || null;
  if (!normalized) return { scope: "UNASSIGNED", blessUserId: null };
  if (excludedUserIds.has(normalized)) {
    return { scope: "EXCLUDED", blessUserId: null };
  }
  return { scope: "VALID", blessUserId: normalized };
}

function sameOwner(left: CrmOwner, right: CrmOwner): boolean {
  return left.scope === right.scope && left.blessUserId === right.blessUserId;
}

function eventKey(
  sessionId: string,
  eventType: CrmAssignmentEventType,
  previous: CrmOwner,
  current: CrmOwner,
  detectedAt: string
): string {
  return [
    sessionId,
    eventType,
    previous.scope,
    previous.blessUserId || "-",
    current.scope,
    current.blessUserId || "-",
    detectedAt,
  ].join("|");
}

export function detectCrmSnapshotEvents(
  previous: CrmSessionSnapshot | null,
  current: CrmSessionSnapshot,
  baseline: boolean,
  detectedAt: string
): CrmAssignmentEvent[] {
  if (baseline) return [];
  const events: CrmAssignmentEvent[] = [];
  const previousOwner: CrmOwner = previous || {
    scope: "UNASSIGNED",
    blessUserId: null,
  };

  if (!sameOwner(previousOwner, current)) {
    let eventType: CrmAssignmentEventType = "TRANSFERRED";
    if (current.scope === "UNASSIGNED") eventType = "UNASSIGNED";
    else if (!previous || previous.scope === "UNASSIGNED" || previous.scope === "UNKNOWN") {
      eventType = "ASSIGNED";
    }
    events.push({
      eventKey: eventKey(current.sessionId, eventType, previousOwner, current, detectedAt),
      sessionId: current.sessionId,
      eventType,
      fromBlessUserId: previousOwner.scope === "VALID" ? previousOwner.blessUserId : null,
      toBlessUserId: current.scope === "VALID" ? current.blessUserId : null,
      fromScope: previousOwner.scope,
      toScope: current.scope,
      detectedAt,
      source: "SNAPSHOT",
    });
  }

  const wasOpen = previous ? isOpenCrmStatus(previous.status) : true;
  const isOpen = isOpenCrmStatus(current.status);
  if (previous && wasOpen && !isOpen && current.status === "COMPLETED") {
    events.push({
      eventKey: eventKey(current.sessionId, "COMPLETED", previous, current, detectedAt),
      sessionId: current.sessionId,
      eventType: "COMPLETED",
      fromBlessUserId: previous.scope === "VALID" ? previous.blessUserId : null,
      toBlessUserId: current.scope === "VALID" ? current.blessUserId : null,
      fromScope: previous.scope,
      toScope: current.scope,
      detectedAt,
      source: "SNAPSHOT",
    });
  } else if (previous && !wasOpen && isOpen) {
    events.push({
      eventKey: eventKey(current.sessionId, "REOPENED", previous, current, detectedAt),
      sessionId: current.sessionId,
      eventType: "REOPENED",
      fromBlessUserId: previous.scope === "VALID" ? previous.blessUserId : null,
      toBlessUserId: current.scope === "VALID" ? current.blessUserId : null,
      fromScope: previous.scope,
      toScope: current.scope,
      detectedAt,
      source: "SNAPSHOT",
    });
  }
  return events;
}

export function buildCrmResponseEvents(
  activities: CrmMessageActivity[],
  metricsStartAt: string
): CrmResponseEvent[] {
  const cutoff = new Date(metricsStartAt).getTime();
  const sorted = activities
    .filter((activity) => new Date(activity.timestamp).getTime() >= cutoff)
    .sort((left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
      || left.messageId.localeCompare(right.messageId)
    );
  const events: CrmResponseEvent[] = [];
  let waitStartedAt: string | null = null;

  for (const activity of sorted) {
    if (activity.actorType === "CUSTOMER") {
      waitStartedAt ||= activity.timestamp;
      continue;
    }
    if (!waitStartedAt) continue;
    if (activity.actorType === "EXCLUDED") {
      waitStartedAt = null;
      continue;
    }
    if (activity.actorType === "AGENT" && activity.blessUserId) {
      const seconds = Math.max(
        0,
        Math.round(
          (new Date(activity.timestamp).getTime() - new Date(waitStartedAt).getTime())
          / 1000
        )
      );
      events.push({
        sessionId: activity.sessionId,
        agentBlessUserId: activity.blessUserId,
        waitStartedAt,
        respondedAt: activity.timestamp,
        responseSeconds: seconds,
      });
      waitStartedAt = null;
    }
  }
  return events;
}

export function isOpenCrmStatus(status: CrmSessionStatus): boolean {
  return ["STARTED", "PENDING", "IN_PROGRESS"].includes(status);
}

interface MetricsInput {
  blessUserId: string;
  sessions: Array<CrmDashboardSession & { currentBlessUserId: string | null }>;
  assignmentEvents: CrmAssignmentEvent[];
  messageActivity: CrmMessageActivity[];
  responseEvents: CrmResponseEvent[];
  now?: Date;
}

export function calculateCrmDashboardMetrics(input: MetricsInput): CrmDashboardMetrics {
  const now = input.now || new Date();
  const { start, end } = getSaoPauloDayRange(now);
  const portfolio = input.sessions.filter(
    (session) =>
      session.currentBlessUserId === input.blessUserId
      && isOpenCrmStatus(session.status)
  );
  const todayAssignments = input.assignmentEvents.filter((event) =>
    isInsideRange(event.detectedAt, start, end)
  );
  const todayAgentMessages = input.messageActivity.filter(
    (activity) =>
      activity.actorType === "AGENT"
      && activity.blessUserId === input.blessUserId
      && isInsideRange(activity.timestamp, start, end)
  );
  const todayResponses = input.responseEvents.filter(
    (event) =>
      event.agentBlessUserId === input.blessUserId
      && isInsideRange(event.respondedAt, start, end)
  );
  const responseTotal = todayResponses.reduce(
    (sum, event) => sum + event.responseSeconds,
    0
  );
  const inactiveBefore = now.getTime() - 24 * 60 * 60 * 1000;

  return {
    currentPortfolio: portfolio.length,
    receivedToday: todayAssignments.filter(
      (event) =>
        event.toBlessUserId === input.blessUserId
        && ["ASSIGNED", "TRANSFERRED"].includes(event.eventType)
    ).length,
    transferredToday: todayAssignments.filter(
      (event) =>
        event.fromBlessUserId === input.blessUserId
        && event.eventType === "TRANSFERRED"
    ).length,
    averageResponseSecondsToday: todayResponses.length
      ? Math.round(responseTotal / todayResponses.length)
      : null,
    clientsServedToday: new Set(todayAgentMessages.map((item) => item.sessionId)).size,
    awaitingResponse: portfolio.filter((session) => session.awaitingResponse).length,
    conversationsWithUnread: portfolio.filter((session) => session.unreadCount > 0).length,
    totalUnreadMessages: portfolio.reduce((sum, session) => sum + session.unreadCount, 0),
    inactiveOver24h: portfolio.filter(
      (session) =>
        Boolean(session.lastInteractionAt)
        && new Date(session.lastInteractionAt!).getTime() < inactiveBefore
    ).length,
  };
}

import type {
  CrmAssignmentHistoryCoverage,
  CrmAssignmentScope,
  CrmAttendanceMovement,
  CrmAttendanceActivityItem,
  CrmAttendanceAssignmentItem,
  CrmAttendanceDetail,
  CrmAttendedClient,
  CrmSessionStatus,
} from "../../types/crmDashboard.js";
import type {
  CrmAssignmentEvent,
  CrmMessageActivity,
  CrmResponseEvent,
} from "./domain.js";
import { getAssignmentHistoryCoverage } from "./analytics.js";
import { isOpenCrmStatus } from "./domain.js";
import { isInsideRange } from "./time.js";

export interface CrmAttendanceSessionSnapshot {
  sessionId: string;
  contactName: string | null;
  status: CrmSessionStatus;
  assignmentScope: CrmAssignmentScope;
  currentBlessUserId: string | null;
  unreadCount: number;
  lastActorType: string | null;
}

function isAllowedUser(blessUserId: string, excludedUserIds: ReadonlySet<string>): boolean {
  return !excludedUserIds.has(blessUserId.toLowerCase());
}

function reliableAssignmentEvents(options: {
  events: CrmAssignmentEvent[];
  start: Date;
  end: Date;
  availableFrom: Date | null;
}): { coverage: CrmAssignmentHistoryCoverage; events: CrmAssignmentEvent[] } {
  const coverage = getAssignmentHistoryCoverage(options.start, options.end, options.availableFrom);
  if (coverage === "NONE") return { coverage, events: [] };
  const start = coverage === "PARTIAL" ? options.availableFrom! : options.start;
  return {
    coverage,
    events: options.events.filter((event) => isInsideRange(event.detectedAt, start, options.end)),
  };
}

export function buildCrmAttendedClients(options: {
  blessUserId: string;
  excludedUserIds: ReadonlySet<string>;
  start: Date;
  end: Date;
  assignmentHistoryStartAt: string | null;
  messageActivity: CrmMessageActivity[];
  assignmentEvents: CrmAssignmentEvent[];
  sessions: CrmAttendanceSessionSnapshot[];
}): CrmAttendedClient[] {
  if (!isAllowedUser(options.blessUserId, options.excludedUserIds)) return [];
  const activities = options.messageActivity.filter((activity) =>
    activity.actorType === "AGENT"
    && activity.blessUserId === options.blessUserId
    && isInsideRange(activity.timestamp, options.start, options.end)
  );
  const bySession = new Map<string, CrmMessageActivity[]>();
  activities.forEach((activity) => {
    bySession.set(activity.sessionId, [...(bySession.get(activity.sessionId) || []), activity]);
  });
  const customerMessagesBySession = new Map<string, number>();
  options.messageActivity.forEach((activity) => {
    if (
      activity.actorType === "CUSTOMER"
      && isInsideRange(activity.timestamp, options.start, options.end)
    ) {
      customerMessagesBySession.set(
        activity.sessionId,
        (customerMessagesBySession.get(activity.sessionId) || 0) + 1,
      );
    }
  });
  const sessionById = new Map(options.sessions.map((session) => [session.sessionId, session]));
  const assignments = reliableAssignmentEvents({
    events: options.assignmentEvents,
    start: options.start,
    end: options.end,
    availableFrom: options.assignmentHistoryStartAt
      ? new Date(options.assignmentHistoryStartAt)
      : null,
  }).events;

  return [...bySession.entries()].map(([sessionId, sessionActivities]) => {
    const sorted = [...sessionActivities].sort((left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
      || left.messageId.localeCompare(right.messageId)
    );
    const session = sessionById.get(sessionId);
    const sessionAssignments = assignments.filter((event) => event.sessionId === sessionId);
    const customerMessageCount = customerMessagesBySession.get(sessionId) || 0;
    return {
      sessionId,
      contactName: session?.contactName || "Cliente não identificado",
      currentStatus: session?.status || "UNDEFINED",
      firstAgentInteractionAt: sorted[0].timestamp,
      lastAgentInteractionAt: sorted[sorted.length - 1].timestamp,
      agentMessageCount: sorted.length,
      customerMessageCount,
      totalRelevantMessages: sorted.length + customerMessageCount,
      currentAssignmentScope: session?.assignmentScope || "UNKNOWN",
      currentBlessUserId: session?.currentBlessUserId || null,
      receivedInPeriod: sessionAssignments.some((event) =>
        event.toBlessUserId === options.blessUserId
        && ["ASSIGNED", "TRANSFERRED"].includes(event.eventType)
      ),
      transferredInPeriod: sessionAssignments.some((event) =>
        event.fromBlessUserId === options.blessUserId
        && event.eventType === "TRANSFERRED"
      ),
    };
  }).sort((left, right) =>
    new Date(right.lastAgentInteractionAt).getTime()
    - new Date(left.lastAgentInteractionAt).getTime()
  );
}

function movementTypeForUser(
  event: CrmAssignmentEvent,
  blessUserId: string,
): CrmAttendanceMovement["type"] | null {
  if (event.fromBlessUserId === blessUserId && event.eventType === "TRANSFERRED") {
    return "TRANSFERRED";
  }
  if (
    event.toBlessUserId === blessUserId
    && ["ASSIGNED", "TRANSFERRED"].includes(event.eventType)
  ) {
    return "RECEIVED";
  }
  if (event.fromBlessUserId === blessUserId && event.eventType === "UNASSIGNED") {
    return "UNASSIGNED";
  }
  if (
    ["COMPLETED", "REOPENED"].includes(event.eventType)
    && (event.fromBlessUserId === blessUserId || event.toBlessUserId === blessUserId)
  ) {
    return event.eventType as "COMPLETED" | "REOPENED";
  }
  return null;
}

export function buildCrmAttendanceMovements(options: {
  blessUserId: string;
  excludedUserIds: ReadonlySet<string>;
  start: Date;
  end: Date;
  assignmentHistoryStartAt: string | null;
  assignmentEvents: CrmAssignmentEvent[];
  attendedClients: CrmAttendedClient[];
}): CrmAttendanceMovement[] {
  if (!isAllowedUser(options.blessUserId, options.excludedUserIds)) return [];
  const clientBySession = new Map(
    options.attendedClients.map((client) => [client.sessionId, client.contactName]),
  );
  const reliableEvents = reliableAssignmentEvents({
    events: options.assignmentEvents,
    start: options.start,
    end: options.end,
    availableFrom: options.assignmentHistoryStartAt
      ? new Date(options.assignmentHistoryStartAt)
      : null,
  }).events;
  return reliableEvents.flatMap((event): CrmAttendanceMovement[] => {
    const contactName = clientBySession.get(event.sessionId);
    const type = movementTypeForUser(event, options.blessUserId);
    if (!contactName || !type) return [];
    return [{ contactName, type, occurredAt: event.detectedAt }];
  }).sort((left, right) =>
    new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
  );
}

export function canAccessCrmAttendanceDetail(options: {
  blessUserId: string;
  excludedUserIds: ReadonlySet<string>;
  session: CrmAttendanceSessionSnapshot | null;
  messageActivity: CrmMessageActivity[];
  start: Date;
  end: Date;
}): boolean {
  if (!isAllowedUser(options.blessUserId, options.excludedUserIds)) return false;
  const hasAgentActivity = options.messageActivity.some((activity) =>
    activity.actorType === "AGENT"
    && activity.blessUserId === options.blessUserId
    && isInsideRange(activity.timestamp, options.start, options.end)
  );
  const isInCurrentPortfolio = Boolean(
    options.session
    && options.session.assignmentScope === "VALID"
    && options.session.currentBlessUserId === options.blessUserId
    && isOpenCrmStatus(options.session.status)
  );
  return hasAgentActivity || isInCurrentPortfolio;
}

function assignmentTimeline(options: {
  blessUserId: string;
  events: CrmAssignmentEvent[];
}): CrmAttendanceAssignmentItem[] {
  return options.events.flatMap((event): CrmAttendanceAssignmentItem[] => {
    const relation = movementTypeForUser(event, options.blessUserId);
    return relation ? [{ eventType: event.eventType, occurredAt: event.detectedAt, relation }] : [];
  }).sort((left, right) =>
    new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
  );
}

export function buildCrmAttendanceDetail(options: {
  blessUserId: string;
  excludedUserIds: ReadonlySet<string>;
  start: Date;
  end: Date;
  assignmentHistoryStartAt: string | null;
  session: CrmAttendanceSessionSnapshot;
  messageActivity: CrmMessageActivity[];
  assignmentEvents: CrmAssignmentEvent[];
  responseEvents: CrmResponseEvent[];
}): CrmAttendanceDetail {
  const relevantActivities = options.messageActivity.filter((activity) =>
    isInsideRange(activity.timestamp, options.start, options.end)
    && (
      activity.actorType === "CUSTOMER"
      || (activity.actorType === "AGENT" && activity.blessUserId === options.blessUserId)
    )
  ).sort((left, right) =>
    new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
    || left.messageId.localeCompare(right.messageId)
  );
  const responses = options.responseEvents.filter((event) =>
    event.sessionId === options.session.sessionId
    && event.agentBlessUserId === options.blessUserId
    && isInsideRange(event.respondedAt, options.start, options.end)
  );
  const reliableAssignments = reliableAssignmentEvents({
    events: options.assignmentEvents,
    start: options.start,
    end: options.end,
    availableFrom: options.assignmentHistoryStartAt
      ? new Date(options.assignmentHistoryStartAt)
      : null,
  });
  const agentMessageCount = relevantActivities.filter((item) => item.actorType === "AGENT").length;
  const customerMessageCount = relevantActivities.filter((item) => item.actorType === "CUSTOMER").length;
  const responseTotal = responses.reduce((total, event) => total + event.responseSeconds, 0);
  const activityTimeline: CrmAttendanceActivityItem[] = relevantActivities.map((activity) => ({
    actorType: activity.actorType as "AGENT" | "CUSTOMER",
    timestamp: activity.timestamp,
    direction: activity.direction,
    messageType: activity.messageType,
  }));
  return {
    sessionId: options.session.sessionId,
    contactName: options.session.contactName || "Cliente não identificado",
    status: options.session.status,
    currentAssignmentScope: options.session.assignmentScope,
    isCurrentlyAssignedToUser: options.session.assignmentScope === "VALID"
      && options.session.currentBlessUserId === options.blessUserId
      && isOpenCrmStatus(options.session.status),
    agentMessageCount,
    customerMessageCount,
    totalRelevantMessages: agentMessageCount + customerMessageCount,
    firstInteractionAt: relevantActivities[0]?.timestamp || null,
    lastInteractionAt: relevantActivities[relevantActivities.length - 1]?.timestamp || null,
    averageResponseSeconds: responses.length ? Math.round(responseTotal / responses.length) : null,
    responseCount: responses.length,
    unreadCount: options.session.unreadCount,
    awaitingResponse: options.session.lastActorType === "CUSTOMER",
    assignmentCoverage: reliableAssignments.coverage,
    assignmentEvents: assignmentTimeline({
      blessUserId: options.blessUserId,
      events: reliableAssignments.events,
    }),
    activityTimeline,
  };
}

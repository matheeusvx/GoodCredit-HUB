import type {
  CrmAnalyticsMetricComparison,
  CrmAnalyticsPeriodSummary,
  CrmAssignmentHistoryCoverage,
  CrmDashboardAnalytics,
  CrmDashboardSession,
} from "../../types/crmDashboard.js";
import type {
  CrmAssignmentEvent,
  CrmMessageActivity,
  CrmResponseEvent,
} from "./domain.js";
import { isOpenCrmStatus } from "./domain.js";
import {
  addLocalDays,
  getSaoPauloDateKey,
  getSaoPauloDateRange,
  type ResolvedCrmAnalyticsPeriod,
} from "./time.js";

type PortfolioSession = CrmDashboardSession & { currentBlessUserId: string | null };

interface AnalyticsInput {
  blessUserId: string;
  excludedUserIds: ReadonlySet<string>;
  metricsStartAt: string;
  assignmentHistoryStartAt: string | null;
  period: ResolvedCrmAnalyticsPeriod;
  sessions: PortfolioSession[];
  assignmentEvents: CrmAssignmentEvent[];
  messageActivity: CrmMessageActivity[];
  responseEvents: CrmResponseEvent[];
}

interface RangeAggregate extends CrmAnalyticsPeriodSummary {
  assignmentsAvailable: boolean;
  assignmentCoverage: CrmAssignmentHistoryCoverage;
  messagesAvailable: boolean;
  responsesAvailable: boolean;
}

function inRange(value: string, start: Date, end: Date): boolean {
  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

function rangeAvailable(start: Date, end: Date, availableFrom: Date | null): boolean {
  return Boolean(
    availableFrom
    && end.getTime() > start.getTime()
    && start.getTime() >= availableFrom.getTime()
  );
}

export function getAssignmentHistoryCoverage(
  start: Date,
  end: Date,
  availableFrom: Date | null,
): CrmAssignmentHistoryCoverage {
  if (
    !availableFrom
    || end.getTime() <= start.getTime()
    || end.getTime() <= availableFrom.getTime()
  ) {
    return "NONE";
  }
  return start.getTime() < availableFrom.getTime() ? "PARTIAL" : "FULL";
}

function aggregateRange(options: {
  start: Date;
  end: Date;
  blessUserId: string;
  assignmentAvailableFrom: Date | null;
  messagesAvailableFrom: Date;
  responsesAvailableFrom: Date;
  assignmentEvents: CrmAssignmentEvent[];
  messageActivity: CrmMessageActivity[];
  responseEvents: CrmResponseEvent[];
}): RangeAggregate {
  const assignmentCoverage = getAssignmentHistoryCoverage(
    options.start,
    options.end,
    options.assignmentAvailableFrom
  );
  const assignmentsAvailable = assignmentCoverage !== "NONE";
  const messagesAvailable = rangeAvailable(
    options.start,
    options.end,
    options.messagesAvailableFrom
  );
  const responsesAvailable = rangeAvailable(
    options.start,
    options.end,
    options.responsesAvailableFrom
  );
  const assignmentStart = assignmentCoverage === "PARTIAL"
    ? options.assignmentAvailableFrom!
    : options.start;
  const assignments = assignmentsAvailable
    ? options.assignmentEvents.filter((event) =>
        inRange(event.detectedAt, assignmentStart, options.end)
      )
    : [];
  const messages = options.messageActivity.filter((activity) =>
    activity.actorType === "AGENT"
    && activity.blessUserId === options.blessUserId
    && inRange(activity.timestamp, options.start, options.end)
  );
  const responses = options.responseEvents.filter((event) =>
    event.agentBlessUserId === options.blessUserId
    && inRange(event.respondedAt, options.start, options.end)
  );
  const responseTotal = responses.reduce((sum, event) => sum + event.responseSeconds, 0);
  return {
    received: assignmentsAvailable
      ? assignments.filter((event) =>
          event.toBlessUserId === options.blessUserId
          && ["ASSIGNED", "TRANSFERRED"].includes(event.eventType)
        ).length
      : null,
    transferred: assignmentsAvailable
      ? assignments.filter((event) =>
          event.fromBlessUserId === options.blessUserId
          && event.eventType === "TRANSFERRED"
        ).length
      : null,
    clientsServed: messagesAvailable
      ? new Set(messages.map((message) => message.sessionId)).size
      : 0,
    averageResponseSeconds: responsesAvailable && responses.length
      ? Math.round(responseTotal / responses.length)
      : null,
    responseCount: responsesAvailable ? responses.length : 0,
    assignmentsAvailable,
    assignmentCoverage,
    messagesAvailable,
    responsesAvailable,
  };
}

export function calculatePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round((((current - previous) / previous) * 100) * 100) / 100;
}

function comparisonMetric(
  current: number | null,
  previous: number | null,
  available: boolean
): CrmAnalyticsMetricComparison {
  if (!available || current === null || previous === null) {
    return {
      current,
      previous: null,
      absoluteChange: null,
      percentChange: null,
      available: false,
    };
  }
  return {
    current,
    previous,
    absoluteChange: current - previous,
    percentChange: calculatePercentChange(current, previous),
    available: true,
  };
}

export function calculateCrmAnalytics(input: AnalyticsInput): CrmDashboardAnalytics {
  const metricsStart = new Date(input.metricsStartAt);
  const assignmentStart = input.assignmentHistoryStartAt
    ? new Date(input.assignmentHistoryStartAt)
    : null;
  const allowed = !input.excludedUserIds.has(input.blessUserId.toLowerCase());
  const assignmentEvents = allowed ? input.assignmentEvents : [];
  const messageActivity = allowed ? input.messageActivity : [];
  const responseEvents = allowed ? input.responseEvents : [];
  const sessions = allowed
    ? input.sessions.filter((session) =>
        session.currentBlessUserId === input.blessUserId
        && isOpenCrmStatus(session.status)
      )
    : [];
  const common = {
    blessUserId: input.blessUserId,
    assignmentAvailableFrom: assignmentStart,
    messagesAvailableFrom: metricsStart,
    responsesAvailableFrom: metricsStart,
    assignmentEvents,
    messageActivity,
    responseEvents,
  };
  const current = aggregateRange({
    ...common,
    start: input.period.effectiveStart,
    end: input.period.effectiveEnd,
  });
  const previous = aggregateRange({
    ...common,
    start: input.period.previousRequestedStart,
    end: input.period.previousRequestedEnd,
  });

  const dailySeries: CrmDashboardAnalytics["dailySeries"] = [];
  if (input.period.effectiveEnd.getTime() > input.period.effectiveStart.getTime()) {
    let dateKey = getSaoPauloDateKey(input.period.effectiveStart);
    const lastDateKey = getSaoPauloDateKey(
      new Date(input.period.effectiveEnd.getTime() - 1)
    );
    while (dateKey <= lastDateKey) {
      const day = getSaoPauloDateRange(dateKey);
      const start = new Date(Math.max(day.start.getTime(), input.period.effectiveStart.getTime()));
      const end = new Date(Math.min(day.end.getTime(), input.period.effectiveEnd.getTime()));
      const aggregate = aggregateRange({ ...common, start, end });
      dailySeries.push({
        date: dateKey,
        received: aggregate.received,
        transferred: aggregate.transferred,
        clientsServed: aggregate.clientsServed,
        responseCount: aggregate.responseCount,
        averageResponseSeconds: aggregate.averageResponseSeconds,
        availability: {
          assignments: aggregate.assignmentsAvailable,
          assignmentCoverage: aggregate.assignmentCoverage,
          messages: aggregate.messagesAvailable,
          responses: aggregate.responsesAvailable,
        },
      });
      dateKey = addLocalDays(dateKey, 1);
    }
  }

  const portfolioHealth = {
    total: sessions.length,
    responded: sessions.filter((session) => !session.awaitingResponse).length,
    awaitingResponse: sessions.filter((session) => session.awaitingResponse).length,
    conversationsWithUnread: sessions.filter((session) => session.unreadCount > 0).length,
    inactiveOver24h: sessions.filter((session) => session.inactiveOver24h).length,
  };
  const portfolioDistribution = {
    awaitingResponse: 0,
    unread: 0,
    inactive: 0,
    ok: 0,
    total: sessions.length,
  };
  sessions.forEach((session) => {
    if (session.awaitingResponse) portfolioDistribution.awaitingResponse += 1;
    else if (session.unreadCount > 0) portfolioDistribution.unread += 1;
    else if (session.inactiveOver24h) portfolioDistribution.inactive += 1;
    else portfolioDistribution.ok += 1;
  });

  const previousLimited = input.period.previousEffectiveStart.getTime()
    !== input.period.previousRequestedStart.getTime();
  return {
    period: input.period.metadata,
    availability: {
      metricsStartAt: input.metricsStartAt,
      assignmentHistoryStartAt: input.assignmentHistoryStartAt,
      messagesHistoryStartAt: input.metricsStartAt,
      responsesHistoryStartAt: input.metricsStartAt,
      assignmentCoverage: current.assignmentCoverage,
      limitations: [
        "ASSIGNMENT_HISTORY_STARTS_AT_MONITOR_INITIALIZATION",
        "PORTFOLIO_HISTORY_UNAVAILABLE_CURRENT_SNAPSHOT_ONLY",
      ],
    },
    periodSummary: {
      received: current.received,
      transferred: current.transferred,
      clientsServed: current.clientsServed,
      averageResponseSeconds: current.averageResponseSeconds,
      responseCount: current.responseCount,
    },
    comparison: {
      previousPeriod: {
        startAt: input.period.previousRequestedStart.toISOString(),
        endAt: input.period.previousRequestedEnd.toISOString(),
        effectiveStartAt: input.period.previousEffectiveStart.toISOString(),
        effectiveEndAt: input.period.previousEffectiveEnd.toISOString(),
        limitedByMetricsStartAt: previousLimited,
      },
      received: comparisonMetric(
        current.received,
        previous.received,
        current.assignmentCoverage === "FULL"
          && previous.assignmentCoverage === "FULL"
      ),
      transferred: comparisonMetric(
        current.transferred,
        previous.transferred,
        current.assignmentCoverage === "FULL"
          && previous.assignmentCoverage === "FULL"
      ),
      clientsServed: comparisonMetric(
        current.clientsServed,
        previous.messagesAvailable ? previous.clientsServed : null,
        current.messagesAvailable && previous.messagesAvailable
      ),
      averageResponseSeconds: comparisonMetric(
        current.averageResponseSeconds,
        previous.averageResponseSeconds,
        current.responsesAvailable
          && previous.responsesAvailable
          && current.averageResponseSeconds !== null
          && previous.averageResponseSeconds !== null
      ),
    },
    dailySeries,
    portfolioHealth,
    portfolioDistribution,
    attendedClients: [],
    attendanceMovements: [],
  };
}

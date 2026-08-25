export type CrmSessionStatus =
  | "UNDEFINED"
  | "STARTED"
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "HIDDEN";

export type CrmIntegrationStatus =
  | "READY"
  | "UNLINKED"
  | "NOT_CONFIGURED"
  | "SYNC_ERROR";

export interface CrmDashboardMetrics {
  currentPortfolio: number;
  receivedToday: number;
  transferredToday: number;
  averageResponseSecondsToday: number | null;
  clientsServedToday: number;
  awaitingResponse: number;
  conversationsWithUnread: number;
  totalUnreadMessages: number;
  inactiveOver24h: number;
}

export interface CrmDashboardSession {
  sessionId: string;
  contactName: string;
  status: CrmSessionStatus;
  lastInteractionAt: string | null;
  unreadCount: number;
  awaitingResponse: boolean;
  inactiveOver24h: boolean;
}

export type CrmAnalyticsPeriodKey = "today" | "7d" | "30d" | "month" | "custom";

export interface CrmAnalyticsPeriod {
  key: CrmAnalyticsPeriodKey;
  timezone: "America/Sao_Paulo";
  requestedStartAt: string;
  requestedEndAt: string;
  effectiveStartAt: string;
  effectiveEndAt: string;
  limitedByMetricsStartAt: boolean;
}

export interface CrmAnalyticsDailyPoint {
  date: string;
  received: number | null;
  transferred: number | null;
  clientsServed: number;
  responseCount: number;
  averageResponseSeconds: number | null;
  availability: {
    assignments: boolean;
    messages: boolean;
    responses: boolean;
  };
}

export interface CrmAnalyticsPeriodSummary {
  received: number | null;
  transferred: number | null;
  clientsServed: number;
  averageResponseSeconds: number | null;
  responseCount: number;
}

export interface CrmAnalyticsMetricComparison {
  current: number | null;
  previous: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
  available: boolean;
}

export interface CrmAnalyticsComparison {
  previousPeriod: {
    startAt: string;
    endAt: string;
    effectiveStartAt: string;
    effectiveEndAt: string;
    limitedByMetricsStartAt: boolean;
  };
  received: CrmAnalyticsMetricComparison;
  transferred: CrmAnalyticsMetricComparison;
  clientsServed: CrmAnalyticsMetricComparison;
  averageResponseSeconds: CrmAnalyticsMetricComparison;
}

export type CrmAnalyticsLimitation =
  | "ASSIGNMENT_HISTORY_STARTS_AT_MONITOR_INITIALIZATION"
  | "PORTFOLIO_HISTORY_UNAVAILABLE_CURRENT_SNAPSHOT_ONLY";

export interface CrmAnalyticsAvailability {
  metricsStartAt: string;
  assignmentHistoryStartAt: string | null;
  messagesHistoryStartAt: string;
  responsesHistoryStartAt: string;
  limitations: CrmAnalyticsLimitation[];
}

export interface CrmPortfolioHealth {
  total: number;
  responded: number;
  awaitingResponse: number;
  conversationsWithUnread: number;
  inactiveOver24h: number;
}

export interface CrmPortfolioDistribution {
  awaitingResponse: number;
  unread: number;
  inactive: number;
  ok: number;
  total: number;
}

export interface CrmDashboardAnalytics {
  period: CrmAnalyticsPeriod;
  availability: CrmAnalyticsAvailability;
  periodSummary: CrmAnalyticsPeriodSummary;
  comparison: CrmAnalyticsComparison;
  dailySeries: CrmAnalyticsDailyPoint[];
  portfolioHealth: CrmPortfolioHealth;
  portfolioDistribution: CrmPortfolioDistribution;
}

export interface CrmDashboardResponse {
  user: {
    name: string;
    blessUserId: string;
  } | null;
  metrics: CrmDashboardMetrics;
  sessions: CrmDashboardSession[];
  analytics: CrmDashboardAnalytics;
  meta: {
    metricsStartAt: string;
    monitorStartedAt: string | null;
    lastSyncAt: string | null;
    integrationStatus: CrmIntegrationStatus;
  };
}

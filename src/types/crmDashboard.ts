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

export interface CrmDashboardResponse {
  user: {
    name: string;
    blessUserId: string;
  } | null;
  metrics: CrmDashboardMetrics;
  sessions: CrmDashboardSession[];
  meta: {
    metricsStartAt: string;
    monitorStartedAt: string | null;
    lastSyncAt: string | null;
    integrationStatus: CrmIntegrationStatus;
  };
}

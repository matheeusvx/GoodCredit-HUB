import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  calculateCrmDashboardMetrics,
  type CrmAssignmentEvent,
  type CrmMessageActivity,
  type CrmResponseEvent,
} from "../../src/lib/crm/domain.js";
import { calculateCrmAnalytics } from "../../src/lib/crm/analytics.js";
import {
  buildCrmAttendanceMovements,
  buildCrmAttendedClients,
  type CrmAttendanceSessionSnapshot,
} from "../../src/lib/crm/attendance.js";
import {
  getSaoPauloDayRange,
  resolveCrmAnalyticsPeriod,
  type CrmAnalyticsPeriodRequest,
} from "../../src/lib/crm/time.js";
import type {
  CrmDashboardResponse,
  CrmDashboardSession,
  CrmSessionStatus,
} from "../../src/types/crmDashboard.js";
import { throwOnSupabaseError } from "./supabaseAdmin.js";

const OPEN_STATUSES: CrmSessionStatus[] = ["STARTED", "PENDING", "IN_PROGRESS"];
const QUERY_PAGE_SIZE = 1000;

interface QueryPage<T> {
  data: T[] | null;
  error: { message: string } | null;
}

async function loadPagedRows<T>(
  operation: string,
  loadPage: (from: number, to: number) => PromiseLike<QueryPage<T>>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += QUERY_PAGE_SIZE) {
    const page = await loadPage(from, from + QUERY_PAGE_SIZE - 1);
    throwOnSupabaseError(operation, page.error);
    const data = page.data || [];
    rows.push(...data);
    if (data.length < QUERY_PAGE_SIZE) return rows;
  }
}

interface SessionRow {
  session_id: string;
  contact_name: string | null;
  status: string;
  last_interaction_at: string | null;
  unread_count: number;
  last_actor_type: string | null;
  current_bless_user_id: string | null;
  assignment_scope: string;
}

interface AssignmentRow {
  event_key: string;
  session_id: string;
  event_type: string;
  from_bless_user_id: string | null;
  to_bless_user_id: string | null;
  from_scope: string;
  to_scope: string;
  detected_at: string;
}

interface ActivityRow {
  message_id: string;
  session_id: string;
  actor_type: string;
  bless_user_id: string | null;
  timestamp: string;
  direction: string | null;
  origin: string | null;
  message_type: string | null;
}

interface ResponseRow {
  session_id: string;
  agent_bless_user_id: string;
  wait_started_at: string;
  responded_at: string;
  response_seconds: number;
}

interface DashboardMapping {
  hub_user_id: string | null;
  bless_user_id: string;
  agent_name: string | null;
  agent_email: string | null;
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function loadSessionSnapshotsByIds(
  supabase: SupabaseClient,
  sessionIds: string[],
): Promise<SessionRow[]> {
  const rows: SessionRow[] = [];
  for (const sessionIdGroup of chunks([...new Set(sessionIds)], 100)) {
    if (!sessionIdGroup.length) continue;
    const { data, error } = await supabase
      .from("crm_sessions")
      .select("session_id,contact_name,status,last_interaction_at,unread_count,last_actor_type,current_bless_user_id,assignment_scope")
      .in("session_id", sessionIdGroup)
      .order("session_id");
    throwOnSupabaseError("Unable to load attended CRM sessions", error);
    rows.push(...((data || []) as SessionRow[]));
  }
  return rows;
}

async function loadCustomerActivityBySessionIds(
  supabase: SupabaseClient,
  sessionIds: string[],
  start: Date,
  end: Date,
): Promise<ActivityRow[]> {
  const rows: ActivityRow[] = [];
  for (const sessionIdGroup of chunks([...new Set(sessionIds)], 100)) {
    if (!sessionIdGroup.length) continue;
    rows.push(...await loadPagedRows<ActivityRow>(
      "Unable to load attended CRM customer activity",
      (from, to) => supabase
        .from("crm_message_activity")
        .select("message_id,session_id,actor_type,bless_user_id,timestamp,direction,origin,message_type")
        .eq("actor_type", "CUSTOMER")
        .in("session_id", sessionIdGroup)
        .gte("timestamp", start.toISOString())
        .lt("timestamp", end.toISOString())
        .order("timestamp")
        .order("message_id")
        .range(from, to),
    ));
  }
  return rows;
}

export function isCrmDashboardMappingEligible(
  mapping: DashboardMapping | null,
  hubUserId: string,
  excludedUserIds: ReadonlySet<string>
): mapping is DashboardMapping {
  return Boolean(
    mapping?.hub_user_id
    && mapping.hub_user_id === hubUserId
    && !excludedUserIds.has(mapping.bless_user_id.toLowerCase())
  );
}

export function emptyCrmMetrics() {
  return {
    currentPortfolio: 0,
    receivedToday: 0,
    transferredToday: 0,
    averageResponseSecondsToday: null,
    clientsServedToday: 0,
    awaitingResponse: 0,
    conversationsWithUnread: 0,
    totalUnreadMessages: 0,
    inactiveOver24h: 0,
  };
}

export function emptyCrmDashboard(
  metricsStartAt: string,
  integrationStatus: CrmDashboardResponse["meta"]["integrationStatus"],
  state?: { initialized_at?: string | null; last_success_at?: string | null },
  periodRequest: CrmAnalyticsPeriodRequest = { key: "today" },
  now = new Date()
): CrmDashboardResponse {
  const period = resolveCrmAnalyticsPeriod(periodRequest, metricsStartAt, now);
  return {
    user: null,
    metrics: emptyCrmMetrics(),
    sessions: [],
    analytics: calculateCrmAnalytics({
      blessUserId: "",
      excludedUserIds: new Set(),
      metricsStartAt,
      assignmentHistoryStartAt: state?.initialized_at || null,
      period,
      sessions: [],
      assignmentEvents: [],
      messageActivity: [],
      responseEvents: [],
    }),
    meta: {
      metricsStartAt,
      monitorStartedAt: state?.initialized_at || null,
      lastSyncAt: state?.last_success_at || null,
      integrationStatus,
    },
  };
}

export async function buildCrmDashboard(options: {
  supabase: SupabaseClient;
  hubUser: User;
  metricsStartAt: string;
  excludedUserIds: ReadonlySet<string>;
  periodRequest?: CrmAnalyticsPeriodRequest;
  now?: Date;
}): Promise<CrmDashboardResponse> {
  const now = options.now || new Date();
  const today = getSaoPauloDayRange(now);
  const period = resolveCrmAnalyticsPeriod(
    options.periodRequest || { key: "today" },
    options.metricsStartAt,
    now
  );
  const { data: stateData, error: stateError } = await options.supabase
    .from("crm_sync_state")
    .select("initialized_at,last_success_at,status")
    .eq("id", "bless-primary")
    .maybeSingle();
  throwOnSupabaseError("Unable to load CRM integration state", stateError);
  const state = stateData as {
    initialized_at: string | null;
    last_success_at: string | null;
    status: string;
  } | null;
  const { data: mappingData, error: mappingError } = await options.supabase
    .from("crm_user_mappings")
    .select("hub_user_id,bless_user_id,agent_name,agent_email")
    .eq("hub_user_id", options.hubUser.id)
    .maybeSingle();
  throwOnSupabaseError("Unable to resolve CRM user mapping", mappingError);
  const mapping = mappingData as DashboardMapping | null;
  if (!isCrmDashboardMappingEligible(
    mapping,
    options.hubUser.id,
    options.excludedUserIds
  )) {
    return emptyCrmDashboard(
      options.metricsStartAt,
      "UNLINKED",
      state || undefined,
      options.periodRequest,
      now
    );
  }

  const blessUserId = mapping.bless_user_id;
  const historyStart = new Date(Math.max(
    new Date(options.metricsStartAt).getTime(),
    Math.min(period.previousRequestedStart.getTime(), today.start.getTime())
  ));
  const historyEnd = new Date(Math.max(period.effectiveEnd.getTime(), today.end.getTime()));
  const assignmentHistoryStart = state?.initialized_at
    ? new Date(state.initialized_at)
    : null;
  const assignmentQueryStart = assignmentHistoryStart
    ? new Date(Math.max(historyStart.getTime(), assignmentHistoryStart.getTime()))
    : historyEnd;
  const [sessionRows, assignmentRows, activityRows, responseRows] = await Promise.all([
    loadPagedRows<SessionRow>("Unable to load current CRM portfolio", (from, to) =>
      options.supabase
        .from("crm_sessions")
        .select("session_id,contact_name,status,last_interaction_at,unread_count,last_actor_type,current_bless_user_id,assignment_scope")
        .eq("assignment_scope", "VALID")
        .eq("current_bless_user_id", blessUserId)
        .in("status", OPEN_STATUSES)
        .order("session_id")
        .range(from, to)
    ),
    loadPagedRows<AssignmentRow>("Unable to load CRM assignment metrics", (from, to) =>
      options.supabase
        .from("crm_assignment_events")
        .select("event_key,session_id,event_type,from_bless_user_id,to_bless_user_id,from_scope,to_scope,detected_at")
        .gte("detected_at", assignmentQueryStart.toISOString())
        .lt("detected_at", historyEnd.toISOString())
        .or(`from_bless_user_id.eq.${blessUserId},to_bless_user_id.eq.${blessUserId}`)
        .order("detected_at")
        .order("event_key")
        .range(from, to)
    ),
    loadPagedRows<ActivityRow>("Unable to load CRM activity metrics", (from, to) =>
      options.supabase
        .from("crm_message_activity")
        .select("message_id,session_id,actor_type,bless_user_id,timestamp,direction,origin,message_type")
        .eq("actor_type", "AGENT")
        .eq("bless_user_id", blessUserId)
        .gte("timestamp", historyStart.toISOString())
        .lt("timestamp", historyEnd.toISOString())
        .order("timestamp")
        .order("message_id")
        .range(from, to)
    ),
    loadPagedRows<ResponseRow>("Unable to load CRM response metrics", (from, to) =>
      options.supabase
        .from("crm_response_events")
        .select("session_id,agent_bless_user_id,wait_started_at,responded_at,response_seconds")
        .eq("agent_bless_user_id", blessUserId)
        .gte("responded_at", historyStart.toISOString())
        .lt("responded_at", historyEnd.toISOString())
        .order("responded_at")
        .order("wait_started_at")
        .order("session_id")
        .range(from, to)
    ),
  ]);

  const inactiveBefore = now.getTime() - 24 * 60 * 60 * 1000;
  const sessions = sessionRows.map((row) => {
    const lastInteractionAt = row.last_interaction_at as string | null;
    return {
      sessionId: String(row.session_id),
      contactName: String(row.contact_name || "Cliente não identificado"),
      status: row.status as CrmSessionStatus,
      lastInteractionAt,
      unreadCount: Number(row.unread_count || 0),
      awaitingResponse: row.last_actor_type === "CUSTOMER",
      inactiveOver24h: Boolean(
        lastInteractionAt
        && new Date(lastInteractionAt).getTime() < inactiveBefore
      ),
      currentBlessUserId: row.current_bless_user_id,
    };
  });
  sessions.sort((left, right) =>
    Number(right.awaitingResponse) - Number(left.awaitingResponse)
    || Number(right.unreadCount > 0) - Number(left.unreadCount > 0)
    || new Date(left.lastInteractionAt || 0).getTime()
      - new Date(right.lastInteractionAt || 0).getTime()
  );

  const assignmentEvents: CrmAssignmentEvent[] = assignmentRows.map((row) => ({
    eventKey: String(row.event_key),
    sessionId: String(row.session_id),
    eventType: row.event_type as CrmAssignmentEvent["eventType"],
    fromBlessUserId: row.from_bless_user_id as string | null,
    toBlessUserId: row.to_bless_user_id as string | null,
    fromScope: row.from_scope as CrmAssignmentEvent["fromScope"],
    toScope: row.to_scope as CrmAssignmentEvent["toScope"],
    detectedAt: String(row.detected_at),
    source: "SNAPSHOT",
  }));
  const messageActivity: CrmMessageActivity[] = activityRows.map((row) => ({
    messageId: String(row.message_id),
    sessionId: String(row.session_id),
    actorType: row.actor_type as CrmMessageActivity["actorType"],
    blessUserId: row.bless_user_id as string | null,
    timestamp: String(row.timestamp),
    direction: row.direction as string | null,
    origin: row.origin as string | null,
    messageType: row.message_type as string | null,
  }));
  const responseEvents: CrmResponseEvent[] = responseRows.map((row) => ({
    sessionId: String(row.session_id),
    agentBlessUserId: String(row.agent_bless_user_id),
    waitStartedAt: String(row.wait_started_at),
    respondedAt: String(row.responded_at),
    responseSeconds: Number(row.response_seconds),
  }));
  const attendedSessionIds = new Set(
    messageActivity
      .filter((activity) =>
        activity.actorType === "AGENT"
        && activity.blessUserId === blessUserId
        && new Date(activity.timestamp).getTime() >= period.effectiveStart.getTime()
        && new Date(activity.timestamp).getTime() < period.effectiveEnd.getTime()
      )
      .map((activity) => activity.sessionId)
  );
  const [attendedSessionRows, customerActivityRows] = await Promise.all([
    loadSessionSnapshotsByIds(options.supabase, [...attendedSessionIds]),
    loadCustomerActivityBySessionIds(
      options.supabase,
      [...attendedSessionIds],
      period.effectiveStart,
      period.effectiveEnd,
    ),
  ]);
  const attendedSessionSnapshots: CrmAttendanceSessionSnapshot[] = attendedSessionRows.map((row) => ({
    sessionId: String(row.session_id),
    contactName: row.contact_name,
    status: row.status as CrmSessionStatus,
    assignmentScope: row.assignment_scope as CrmAttendanceSessionSnapshot["assignmentScope"],
    currentBlessUserId: row.current_bless_user_id,
    unreadCount: Number(row.unread_count || 0),
    lastActorType: row.last_actor_type,
  }));
  const customerMessageActivity: CrmMessageActivity[] = customerActivityRows.map((row) => ({
    messageId: String(row.message_id),
    sessionId: String(row.session_id),
    actorType: "CUSTOMER",
    blessUserId: null,
    timestamp: String(row.timestamp),
    direction: row.direction as string | null,
    origin: row.origin as string | null,
    messageType: row.message_type as string | null,
  }));
  const metrics = calculateCrmDashboardMetrics({
    blessUserId,
    sessions,
    assignmentEvents,
    messageActivity,
    responseEvents,
    now,
  });
  const analytics = calculateCrmAnalytics({
    blessUserId,
    excludedUserIds: options.excludedUserIds,
    metricsStartAt: options.metricsStartAt,
    assignmentHistoryStartAt: state?.initialized_at || null,
    period,
    sessions,
    assignmentEvents,
    messageActivity,
    responseEvents,
  });
  analytics.attendedClients = buildCrmAttendedClients({
    blessUserId,
    excludedUserIds: options.excludedUserIds,
    start: period.effectiveStart,
    end: period.effectiveEnd,
    assignmentHistoryStartAt: state?.initialized_at || null,
    messageActivity: [...messageActivity, ...customerMessageActivity],
    assignmentEvents,
    sessions: attendedSessionSnapshots,
  });
  analytics.attendanceMovements = buildCrmAttendanceMovements({
    blessUserId,
    excludedUserIds: options.excludedUserIds,
    start: period.effectiveStart,
    end: period.effectiveEnd,
    assignmentHistoryStartAt: state?.initialized_at || null,
    assignmentEvents,
    attendedClients: analytics.attendedClients,
  });

  return {
    user: {
      name: mapping.agent_name
        || options.hubUser.user_metadata?.name
        || options.hubUser.email?.split("@")[0]
        || "Usuário",
      blessUserId,
    },
    metrics,
    sessions: sessions.map(({ currentBlessUserId: _currentBlessUserId, ...session }) => session),
    analytics,
    meta: {
      metricsStartAt: options.metricsStartAt,
      monitorStartedAt: state?.initialized_at || null,
      lastSyncAt: state?.last_success_at || null,
      integrationStatus: state?.status === "FAILED" ? "SYNC_ERROR" : "READY",
    },
  };
}

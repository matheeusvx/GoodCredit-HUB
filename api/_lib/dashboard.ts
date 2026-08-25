import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  calculateCrmDashboardMetrics,
  type CrmAssignmentEvent,
  type CrmMessageActivity,
  type CrmResponseEvent,
} from "../../src/lib/crm/domain.js";
import { getSaoPauloDayRange } from "../../src/lib/crm/time.js";
import type {
  CrmDashboardResponse,
  CrmDashboardSession,
  CrmSessionStatus,
} from "../../src/types/crmDashboard.js";
import { throwOnSupabaseError } from "./supabaseAdmin.js";

const OPEN_STATUSES: CrmSessionStatus[] = ["STARTED", "PENDING", "IN_PROGRESS"];

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
  state?: { initialized_at?: string | null; last_success_at?: string | null }
): CrmDashboardResponse {
  return {
    user: null,
    metrics: emptyCrmMetrics(),
    sessions: [],
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
  now?: Date;
}): Promise<CrmDashboardResponse> {
  const now = options.now || new Date();
  const { start, end } = getSaoPauloDayRange(now);
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
    .select("bless_user_id,agent_name,agent_email")
    .eq("hub_user_id", options.hubUser.id)
    .maybeSingle();
  throwOnSupabaseError("Unable to resolve CRM user mapping", mappingError);
  const mapping = mappingData as {
    bless_user_id: string;
    agent_name: string | null;
    agent_email: string | null;
  } | null;
  if (
    !mapping
    || options.excludedUserIds.has(mapping.bless_user_id.toLowerCase())
  ) {
    return emptyCrmDashboard(options.metricsStartAt, "UNLINKED", state || undefined);
  }

  const blessUserId = mapping.bless_user_id;
  const [sessionsResult, assignmentResult, activityResult, responseResult] = await Promise.all([
    options.supabase
      .from("crm_sessions")
      .select("session_id,contact_name,status,last_interaction_at,unread_count,last_actor_type,current_bless_user_id")
      .eq("assignment_scope", "VALID")
      .eq("current_bless_user_id", blessUserId)
      .in("status", OPEN_STATUSES),
    options.supabase
      .from("crm_assignment_events")
      .select("event_key,session_id,event_type,from_bless_user_id,to_bless_user_id,from_scope,to_scope,detected_at")
      .gte("detected_at", start.toISOString())
      .lt("detected_at", end.toISOString())
      .or(`from_bless_user_id.eq.${blessUserId},to_bless_user_id.eq.${blessUserId}`),
    options.supabase
      .from("crm_message_activity")
      .select("message_id,session_id,actor_type,bless_user_id,timestamp,direction,origin,message_type")
      .eq("actor_type", "AGENT")
      .eq("bless_user_id", blessUserId)
      .gte("timestamp", start.toISOString())
      .lt("timestamp", end.toISOString()),
    options.supabase
      .from("crm_response_events")
      .select("session_id,agent_bless_user_id,wait_started_at,responded_at,response_seconds")
      .eq("agent_bless_user_id", blessUserId)
      .gte("responded_at", start.toISOString())
      .lt("responded_at", end.toISOString()),
  ]);
  throwOnSupabaseError("Unable to load current CRM portfolio", sessionsResult.error);
  throwOnSupabaseError("Unable to load CRM assignment metrics", assignmentResult.error);
  throwOnSupabaseError("Unable to load CRM activity metrics", activityResult.error);
  throwOnSupabaseError("Unable to load CRM response metrics", responseResult.error);

  const inactiveBefore = now.getTime() - 24 * 60 * 60 * 1000;
  const sessions = (sessionsResult.data || []).map((row) => {
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
      currentBlessUserId: row.current_bless_user_id as string,
    };
  });
  sessions.sort((left, right) =>
    Number(right.awaitingResponse) - Number(left.awaitingResponse)
    || Number(right.unreadCount > 0) - Number(left.unreadCount > 0)
    || new Date(left.lastInteractionAt || 0).getTime()
      - new Date(right.lastInteractionAt || 0).getTime()
  );

  const assignmentEvents: CrmAssignmentEvent[] = (assignmentResult.data || []).map((row) => ({
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
  const messageActivity: CrmMessageActivity[] = (activityResult.data || []).map((row) => ({
    messageId: String(row.message_id),
    sessionId: String(row.session_id),
    actorType: row.actor_type as CrmMessageActivity["actorType"],
    blessUserId: row.bless_user_id as string | null,
    timestamp: String(row.timestamp),
    direction: row.direction as string | null,
    origin: row.origin as string | null,
    messageType: row.message_type as string | null,
  }));
  const responseEvents: CrmResponseEvent[] = (responseResult.data || []).map((row) => ({
    sessionId: String(row.session_id),
    agentBlessUserId: String(row.agent_bless_user_id),
    waitStartedAt: String(row.wait_started_at),
    respondedAt: String(row.responded_at),
    responseSeconds: Number(row.response_seconds),
  }));
  const metrics = calculateCrmDashboardMetrics({
    blessUserId,
    sessions,
    assignmentEvents,
    messageActivity,
    responseEvents,
    now,
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
    meta: {
      metricsStartAt: options.metricsStartAt,
      monitorStartedAt: state?.initialized_at || null,
      lastSyncAt: state?.last_success_at || null,
      integrationStatus: state?.status === "FAILED" ? "SYNC_ERROR" : "READY",
    },
  };
}

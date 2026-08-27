import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  buildCrmAttendanceDetail,
  canAccessCrmAttendanceDetail,
  type CrmAttendanceSessionSnapshot,
} from "../../src/lib/crm/attendance.js";
import type {
  CrmAssignmentEvent,
  CrmMessageActivity,
  CrmResponseEvent,
} from "../../src/lib/crm/domain.js";
import { resolveCrmAnalyticsPeriod, type CrmAnalyticsPeriodRequest } from "../../src/lib/crm/time.js";
import type { CrmAttendanceDetail, CrmSessionStatus } from "../../src/types/crmDashboard.js";
import { isCrmDashboardMappingEligible } from "./dashboard.js";
import { throwOnSupabaseError } from "./supabaseAdmin.js";

interface DetailMapping {
  hub_user_id: string | null;
  bless_user_id: string;
  agent_name: string | null;
  agent_email: string | null;
}

interface DetailSessionRow {
  session_id: string;
  contact_name: string | null;
  status: string;
  assignment_scope: string;
  current_bless_user_id: string | null;
  unread_count: number;
  last_actor_type: string | null;
}

interface DetailActivityRow {
  message_id: string;
  session_id: string;
  actor_type: string;
  bless_user_id: string | null;
  timestamp: string;
  direction: string | null;
  origin: string | null;
  message_type: string | null;
}

interface DetailAssignmentRow {
  event_key: string;
  session_id: string;
  event_type: string;
  from_bless_user_id: string | null;
  to_bless_user_id: string | null;
  from_scope: string;
  to_scope: string;
  detected_at: string;
}

interface DetailResponseRow {
  session_id: string;
  agent_bless_user_id: string;
  wait_started_at: string;
  responded_at: string;
  response_seconds: number;
}

export async function loadCrmAttendanceDetail(options: {
  supabase: SupabaseClient;
  hubUser: User;
  sessionId: string;
  metricsStartAt: string;
  excludedUserIds: ReadonlySet<string>;
  periodRequest: CrmAnalyticsPeriodRequest;
  now?: Date;
}): Promise<CrmAttendanceDetail | null> {
  const period = resolveCrmAnalyticsPeriod(
    options.periodRequest,
    options.metricsStartAt,
    options.now || new Date(),
  );
  const [{ data: stateData, error: stateError }, { data: mappingData, error: mappingError }] = await Promise.all([
    options.supabase
      .from("crm_sync_state")
      .select("initialized_at")
      .eq("id", "bless-primary")
      .maybeSingle(),
    options.supabase
      .from("crm_user_mappings")
      .select("hub_user_id,bless_user_id,agent_name,agent_email")
      .eq("hub_user_id", options.hubUser.id)
      .maybeSingle(),
  ]);
  throwOnSupabaseError("Unable to load CRM integration state", stateError);
  throwOnSupabaseError("Unable to resolve CRM user mapping", mappingError);
  const mapping = mappingData as DetailMapping | null;
  if (!isCrmDashboardMappingEligible(mapping, options.hubUser.id, options.excludedUserIds)) {
    return null;
  }

  const blessUserId = mapping.bless_user_id;
  const assignmentHistoryStartAt = (stateData as { initialized_at?: string | null } | null)?.initialized_at || null;
  const assignmentStart = assignmentHistoryStartAt
    ? new Date(Math.max(period.effectiveStart.getTime(), new Date(assignmentHistoryStartAt).getTime()))
    : period.effectiveEnd;
  const [sessionResult, activityResult, responseResult, assignmentResult] = await Promise.all([
    options.supabase
      .from("crm_sessions")
      .select("session_id,contact_name,status,assignment_scope,current_bless_user_id,unread_count,last_actor_type")
      .eq("session_id", options.sessionId)
      .maybeSingle(),
    options.supabase
      .from("crm_message_activity")
      .select("message_id,session_id,actor_type,bless_user_id,timestamp,direction,origin,message_type")
      .eq("session_id", options.sessionId)
      .in("actor_type", ["AGENT", "CUSTOMER"])
      .gte("timestamp", period.effectiveStart.toISOString())
      .lt("timestamp", period.effectiveEnd.toISOString())
      .order("timestamp")
      .order("message_id"),
    options.supabase
      .from("crm_response_events")
      .select("session_id,agent_bless_user_id,wait_started_at,responded_at,response_seconds")
      .eq("session_id", options.sessionId)
      .eq("agent_bless_user_id", blessUserId)
      .gte("responded_at", period.effectiveStart.toISOString())
      .lt("responded_at", period.effectiveEnd.toISOString())
      .order("responded_at"),
    options.supabase
      .from("crm_assignment_events")
      .select("event_key,session_id,event_type,from_bless_user_id,to_bless_user_id,from_scope,to_scope,detected_at")
      .eq("session_id", options.sessionId)
      .gte("detected_at", assignmentStart.toISOString())
      .lt("detected_at", period.effectiveEnd.toISOString())
      .order("detected_at")
      .order("event_key"),
  ]);
  throwOnSupabaseError("Unable to load CRM attendance session", sessionResult.error);
  throwOnSupabaseError("Unable to load CRM attendance activity", activityResult.error);
  throwOnSupabaseError("Unable to load CRM attendance responses", responseResult.error);
  throwOnSupabaseError("Unable to load CRM attendance assignments", assignmentResult.error);
  const sessionRow = sessionResult.data as DetailSessionRow | null;
  if (!sessionRow) return null;

  const session: CrmAttendanceSessionSnapshot = {
    sessionId: String(sessionRow.session_id),
    contactName: sessionRow.contact_name,
    status: sessionRow.status as CrmSessionStatus,
    assignmentScope: sessionRow.assignment_scope as CrmAttendanceSessionSnapshot["assignmentScope"],
    currentBlessUserId: sessionRow.current_bless_user_id,
    unreadCount: Number(sessionRow.unread_count || 0),
    lastActorType: sessionRow.last_actor_type,
  };
  const messageActivity: CrmMessageActivity[] = ((activityResult.data || []) as DetailActivityRow[]).map((row) => ({
    messageId: String(row.message_id),
    sessionId: String(row.session_id),
    actorType: row.actor_type as CrmMessageActivity["actorType"],
    blessUserId: row.bless_user_id,
    timestamp: String(row.timestamp),
    direction: row.direction,
    origin: row.origin,
    messageType: row.message_type,
  }));
  if (!canAccessCrmAttendanceDetail({
    blessUserId,
    excludedUserIds: options.excludedUserIds,
    session,
    messageActivity,
    start: period.effectiveStart,
    end: period.effectiveEnd,
  })) {
    return null;
  }

  const assignmentEvents: CrmAssignmentEvent[] = ((assignmentResult.data || []) as DetailAssignmentRow[]).map((row) => ({
    eventKey: String(row.event_key),
    sessionId: String(row.session_id),
    eventType: row.event_type as CrmAssignmentEvent["eventType"],
    fromBlessUserId: row.from_bless_user_id,
    toBlessUserId: row.to_bless_user_id,
    fromScope: row.from_scope as CrmAssignmentEvent["fromScope"],
    toScope: row.to_scope as CrmAssignmentEvent["toScope"],
    detectedAt: String(row.detected_at),
    source: "SNAPSHOT",
  }));
  const responseEvents: CrmResponseEvent[] = ((responseResult.data || []) as DetailResponseRow[]).map((row) => ({
    sessionId: String(row.session_id),
    agentBlessUserId: String(row.agent_bless_user_id),
    waitStartedAt: String(row.wait_started_at),
    respondedAt: String(row.responded_at),
    responseSeconds: Number(row.response_seconds),
  }));
  return buildCrmAttendanceDetail({
    blessUserId,
    excludedUserIds: options.excludedUserIds,
    start: period.effectiveStart,
    end: period.effectiveEnd,
    assignmentHistoryStartAt,
    session,
    messageActivity,
    assignmentEvents,
    responseEvents,
  });
}

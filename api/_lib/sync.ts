import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import {
  buildCrmResponseEvents,
  classifyCrmMessage,
  detectCrmSnapshotEvents,
  sanitizeCrmOwner,
  type CrmAssignmentEvent,
  type CrmMessageActivity,
  type CrmSessionSnapshot,
} from "../../src/lib/crm/domain.js";
import {
  BlessClient,
  type BlessAgentDetails,
  type BlessDirectoryAgent,
  type BlessSession,
} from "./blessClient.js";
import { assertSyncConfig } from "./config.js";
import { createSupabaseAdmin, listAllHubUsers, throwOnSupabaseError } from "./supabaseAdmin.js";

const OPEN_STATUSES = ["STARTED", "PENDING", "IN_PROGRESS"] as const;
const SYNC_ID = "bless-primary";
const MESSAGE_CONCURRENCY = 3;
export const AGENT_DIRECTORY_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1_000;

interface SyncStateRow {
  initialized_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  status: string;
}

interface StoredSessionRow {
  session_id: string;
  current_bless_user_id: string | null;
  assignment_scope: CrmSessionSnapshot["scope"];
  status: CrmSessionSnapshot["status"];
  updated_at: string | null;
  last_interaction_at: string | null;
  department_id: string | null;
  unread_count: number;
  last_message_synced_at: string | null;
  last_actor_type: CrmMessageActivity["actorType"] | null;
}

interface AgentMappingFreshnessRow {
  id: string;
  agent_name: string | null;
  agent_email: string | null;
  last_seen_at: string | null;
}

export interface CrmSyncSummary {
  status: "COMPLETED" | "ALREADY_RUNNING";
  baseline: boolean;
  sessionsDiscovered: number;
  sessionsWithMessagesFetched: number;
  activitiesStored: number;
  responseEventsStored: number;
  assignmentEventsDetected: number;
  agentDirectoryRefreshed: boolean;
  agentDirectoryWarning: boolean;
}

export function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "CRM synchronization failed.";
  return message
    .replace(
      /authorization\s*[:=]\s*(?:bearer\s+)?[^\s,;]+/gi,
      "Authorization=[redacted]",
    )
    .replace(/bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(
      /(?:access[_-]?token|api[_-]?token|token)\s*[:=]\s*[^\s,;]+/gi,
      "token=[redacted]",
    )
    .slice(0, 500);
}

function deduplicateSessions(groups: BlessSession[][]): BlessSession[] {
  const sessions = new Map<string, BlessSession>();
  groups.flat().forEach((session) => {
    const existing = sessions.get(session.sessionId);
    if (!existing) {
      sessions.set(session.sessionId, session);
      return;
    }
    const existingUpdated = new Date(existing.updatedAt || 0).getTime();
    const incomingUpdated = new Date(session.updatedAt || 0).getTime();
    if (incomingUpdated >= existingUpdated) sessions.set(session.sessionId, session);
  });
  return [...sessions.values()];
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function loadStoredSessions(
  supabase: SupabaseClient,
  sessionIds: string[]
): Promise<Map<string, StoredSessionRow>> {
  const result = new Map<string, StoredSessionRow>();
  for (const group of chunks(sessionIds, 100)) {
    const { data, error } = await supabase
      .from("crm_sessions")
      .select("session_id,current_bless_user_id,assignment_scope,status,updated_at,last_interaction_at,department_id,unread_count,last_message_synced_at,last_actor_type")
      .in("session_id", group);
    throwOnSupabaseError("Unable to load CRM session snapshots", error);
    (data as StoredSessionRow[] | null)?.forEach((row) => result.set(row.session_id, row));
  }
  return result;
}

function changedForMessageSync(
  previous: StoredSessionRow | undefined,
  current: BlessSession,
  force: boolean
): boolean {
  if (force || !previous || !previous.last_message_synced_at) return true;
  return previous.updated_at !== current.updatedAt
    || previous.last_interaction_at !== current.lastInteractionAt;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const result = new Array<R>(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      result[index] = await mapper(values[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker())
  );
  return result;
}

async function synchronizeAgentMappings(
  supabase: SupabaseClient,
  agents: BlessDirectoryAgent[],
  excludedUserIds: ReadonlySet<string>,
  seenAt: string
): Promise<void> {
  const validAgents = agents.filter(
    (agent) => !excludedUserIds.has(agent.userId.toLowerCase())
  );
  if (!validAgents.length) return;

  const [{ data: existingData, error: existingError }, hubUsers] = await Promise.all([
    supabase
      .from("crm_user_mappings")
      .select("id,hub_user_id,bless_user_id,agent_name,agent_email"),
    listAllHubUsers(supabase),
  ]);
  throwOnSupabaseError("Unable to load CRM user mappings", existingError);
  const existing = (existingData || []) as Array<{
    id: string;
    hub_user_id: string | null;
    bless_user_id: string;
    agent_email: string | null;
  }>;
  const rows = resolveAutomaticMappingRows({
    agents: validAgents,
    hubUsers,
    existing,
    excludedUserIds,
    seenAt,
  });
  const { error } = await supabase
    .from("crm_user_mappings")
    .upsert(rows, { onConflict: "bless_user_id" });
  throwOnSupabaseError("Unable to store CRM user mappings", error);
}

export function shouldRefreshAgentDirectory(
  mappings: AgentMappingFreshnessRow[],
  now: Date,
  lastDirectoryFailureAt?: string | null,
): boolean {
  if (!mappings.length) {
    const lastFailure = lastDirectoryFailureAt
      ? new Date(lastDirectoryFailureAt).getTime()
      : Number.NaN;
    return !Number.isFinite(lastFailure)
      || now.getTime() - lastFailure >= AGENT_DIRECTORY_REFRESH_INTERVAL_MS;
  }

  const latestRefreshAt = mappings.reduce((latest, mapping) => {
    const timestamp = mapping.last_seen_at
      ? new Date(mapping.last_seen_at).getTime()
      : Number.NaN;
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, Number.NEGATIVE_INFINITY);

  if (!Number.isFinite(latestRefreshAt)) return true;
  return now.getTime() - latestRefreshAt >= AGENT_DIRECTORY_REFRESH_INTERVAL_MS;
}

async function refreshAgentDirectoryIfDue(options: {
  supabase: SupabaseClient;
  blessClient: BlessClient;
  excludedUserIds: ReadonlySet<string>;
  now: Date;
  seenAt: string;
  lastDirectoryFailureAt: string | null;
}): Promise<{ refreshed: boolean; warning: boolean }> {
  const { data, error } = await options.supabase
    .from("crm_user_mappings")
    .select("id,agent_name,agent_email,last_seen_at");
  throwOnSupabaseError("Unable to load CRM agent directory freshness", error);

  const mappings = (data || []) as AgentMappingFreshnessRow[];
  if (!shouldRefreshAgentDirectory(
    mappings,
    options.now,
    options.lastDirectoryFailureAt,
  )) {
    return { refreshed: false, warning: false };
  }

  // Reserve the six-hour refresh window before the external call. This keeps a
  // failed/rate-limited directory request from being repeated by every sync.
  for (const mappingIds of chunks(mappings.map((mapping) => mapping.id), 250)) {
    const { error: markerError } = await options.supabase
      .from("crm_user_mappings")
      .update({ last_seen_at: options.seenAt })
      .in("id", mappingIds);
    throwOnSupabaseError("Unable to store CRM agent directory refresh marker", markerError);
  }

  let agents: BlessDirectoryAgent[];
  try {
    agents = await options.blessClient.listAgents();
  } catch (error) {
    console.warn(
      "[Bless CRM] Agent directory refresh failed; operational sync will continue:",
      safeErrorMessage(error),
    );
    const { error: warningMarkerError } = await options.supabase
      .from("crm_sync_state")
      .update({ last_error_at: options.seenAt })
      .eq("id", SYNC_ID);
    if (warningMarkerError) {
      console.warn(
        "[Bless CRM] Unable to persist agent directory cooldown marker:",
        safeErrorMessage(warningMarkerError),
      );
    }
    return { refreshed: false, warning: true };
  }

  await synchronizeAgentMappings(
    options.supabase,
    agents,
    options.excludedUserIds,
    options.seenAt,
  );
  return { refreshed: true, warning: false };
}

export function resolveAutomaticMappingRows(options: {
  agents: BlessAgentDetails[];
  hubUsers: User[];
  existing: Array<{
    id: string;
    hub_user_id: string | null;
    bless_user_id: string;
    agent_email?: string | null;
  }>;
  excludedUserIds: ReadonlySet<string>;
  seenAt: string;
}) {
  const validAgents = options.agents.filter(
    (agent) => !options.excludedUserIds.has(agent.userId.toLowerCase())
  );
  const hubUsers = options.hubUsers;
  const existing = options.existing;
  const existingByBless = new Map(existing.map((row) => [row.bless_user_id, row]));
  const mappedHubIds = new Map(
    existing
      .filter((row) => row.hub_user_id)
      .map((row) => [row.hub_user_id!, row.bless_user_id])
  );
  const hubByEmail = new Map<string, typeof hubUsers>();
  hubUsers.forEach((user) => {
    const email = user.email?.trim().toLowerCase();
    if (!email) return;
    hubByEmail.set(email, [...(hubByEmail.get(email) || []), user]);
  });
  const blessByEmail = new Map<string, BlessAgentDetails[]>();
  validAgents.forEach((agent) => {
    if (!agent.email) return;
    blessByEmail.set(agent.email, [...(blessByEmail.get(agent.email) || []), agent]);
  });
  existing.forEach((row) => {
    const email = row.agent_email?.trim().toLowerCase();
    if (!email || blessByEmail.get(email)?.some((agent) => agent.userId === row.bless_user_id)) return;
    blessByEmail.set(email, [
      ...(blessByEmail.get(email) || []),
      { userId: row.bless_user_id, name: null, email },
    ]);
  });

  return validAgents.map((agent) => {
    const current = existingByBless.get(agent.userId);
    let hubUserId = current?.hub_user_id || null;
    const hubMatches = agent.email ? hubByEmail.get(agent.email) || [] : [];
    const blessMatches = agent.email ? blessByEmail.get(agent.email) || [] : [];
    if (!hubUserId && hubMatches.length === 1 && blessMatches.length === 1) {
      const candidate = hubMatches[0].id;
      const mappedBless = mappedHubIds.get(candidate);
      if (!mappedBless || mappedBless === agent.userId) {
        hubUserId = candidate;
        mappedHubIds.set(candidate, agent.userId);
      }
    }
    return {
      bless_user_id: agent.userId,
      hub_user_id: hubUserId,
      agent_name: agent.name,
      agent_email: agent.email,
      last_seen_at: options.seenAt,
    };
  });
}

function databaseSession(
  session: BlessSession,
  owner: ReturnType<typeof sanitizeCrmOwner>,
  syncedAt: string,
  previous?: StoredSessionRow
) {
  return {
    session_id: session.sessionId,
    contact_id: session.contactId,
    contact_name: session.contactName,
    current_bless_user_id: owner.scope === "VALID" ? owner.blessUserId : null,
    assignment_scope: owner.scope,
    department_id: session.departmentId,
    status: session.status,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    last_interaction_at: session.lastInteractionAt,
    unread_count: session.unreadCount,
    last_actor_type: previous?.last_actor_type || null,
    last_message_synced_at: previous?.last_message_synced_at || null,
    last_synced_at: syncedAt,
  };
}

function databaseEvent(event: CrmAssignmentEvent) {
  return {
    event_key: event.eventKey,
    session_id: event.sessionId,
    event_type: event.eventType,
    from_bless_user_id: event.fromBlessUserId,
    to_bless_user_id: event.toBlessUserId,
    from_scope: event.fromScope,
    to_scope: event.toScope,
    detected_at: event.detectedAt,
  };
}

export async function runCrmSync(options: {
  mode?: "bootstrap" | "incremental";
  supabase?: SupabaseClient;
  blessClient?: BlessClient;
  now?: Date;
} = {}): Promise<CrmSyncSummary> {
  const config = assertSyncConfig();
  const supabase = options.supabase || createSupabaseAdmin(
    config.supabaseUrl,
    config.supabaseServiceRoleKey
  );
  const blessClient = options.blessClient || new BlessClient({
    baseUrl: config.blessApiBaseUrl,
    token: config.blessApiToken,
  });
  const now = options.now || new Date();
  const startedAt = now.toISOString();
  const { data: syncStateData, error: syncStateError } = await supabase
    .from("crm_sync_state")
    .select("initialized_at,last_success_at,last_error_at,status")
    .eq("id", SYNC_ID)
    .single();
  throwOnSupabaseError("Unable to load CRM sync state", syncStateError);
  const syncState = syncStateData as SyncStateRow;
  const { data: lockToken, error: lockError } = await supabase.rpc(
    "crm_try_start_sync",
    { p_sync_id: SYNC_ID, p_stale_after_seconds: 900 }
  );
  throwOnSupabaseError("Unable to acquire CRM sync lock", lockError);
  if (!lockToken) {
    return {
      status: "ALREADY_RUNNING",
      baseline: false,
      sessionsDiscovered: 0,
      sessionsWithMessagesFetched: 0,
      activitiesStored: 0,
      responseEventsStored: 0,
      assignmentEventsDetected: 0,
      agentDirectoryRefreshed: false,
      agentDirectoryWarning: false,
    };
  }

  const baseline = !syncState.initialized_at;
  try {
    const sessionQueries = [
      blessClient.listSessions({ statuses: [...OPEN_STATUSES] }),
      blessClient.listSessions({ lastInteractionAfter: config.metricsStartAt }),
    ];
    if (syncState.last_success_at && !baseline) {
      sessionQueries.push(
        blessClient.listSessions({ updatedAfter: syncState.last_success_at })
      );
    }
    const sessionGroups = await Promise.all(sessionQueries);
    const sessions = deduplicateSessions(sessionGroups);
    const previousById = await loadStoredSessions(
      supabase,
      sessions.map((session) => session.sessionId)
    );
    const snapshots: ReturnType<typeof databaseSession>[] = [];
    const assignmentEvents: CrmAssignmentEvent[] = [];

    sessions.forEach((session) => {
      const previous = previousById.get(session.sessionId);
      const owner = sanitizeCrmOwner(
        session.currentUserId,
        config.excludedBlessUserIds
      );
      const current: CrmSessionSnapshot = {
        sessionId: session.sessionId,
        status: session.status,
        updatedAt: session.updatedAt,
        ...owner,
      };
      const previousSnapshot: CrmSessionSnapshot | null = previous
        ? {
            sessionId: previous.session_id,
            status: previous.status,
            updatedAt: previous.updated_at,
            scope: previous.assignment_scope,
            blessUserId: previous.current_bless_user_id,
          }
        : null;
      assignmentEvents.push(
        ...detectCrmSnapshotEvents(previousSnapshot, current, baseline, startedAt)
      );
      snapshots.push(databaseSession(session, owner, startedAt, previous));
    });

    for (const snapshotChunk of chunks(snapshots, 250)) {
      const ids = new Set(snapshotChunk.map((snapshot) => snapshot.session_id));
      const eventChunk = assignmentEvents
        .filter((event) => ids.has(event.sessionId))
        .map(databaseEvent);
      const { error } = await supabase.rpc("crm_apply_session_snapshots", {
        p_sessions: snapshotChunk,
        p_events: eventChunk,
      });
      throwOnSupabaseError("Unable to apply CRM session snapshots", error);
    }

    const forceMessages = baseline || options.mode === "bootstrap";
    const sessionsToFetch = sessions.filter((session) =>
      changedForMessageSync(previousById.get(session.sessionId), session, forceMessages)
    );
    let activitiesStored = 0;
    let responseEventsStored = 0;
    await mapWithConcurrency(
      sessionsToFetch,
      MESSAGE_CONCURRENCY,
      async (session) => {
        const rawMessages = await blessClient.listMessages(session.sessionId);
        const allActivities = rawMessages.map((message) =>
          classifyCrmMessage(message, config.excludedBlessUserIds)
        );
        const activities = allActivities.filter(
          (activity) =>
            new Date(activity.timestamp).getTime()
            >= new Date(config.metricsStartAt).getTime()
        );
        if (activities.length) {
          const { error } = await supabase.from("crm_message_activity").upsert(
            activities.map((activity) => ({
              message_id: activity.messageId,
              session_id: activity.sessionId,
              actor_type: activity.actorType,
              bless_user_id: activity.blessUserId,
              timestamp: activity.timestamp,
              direction: activity.direction,
              origin: activity.origin,
              message_type: activity.messageType,
            })),
            { onConflict: "message_id" }
          );
          throwOnSupabaseError("Unable to store CRM message activity", error);
          activitiesStored += activities.length;
        }
        const responseEvents = buildCrmResponseEvents(
          activities,
          config.metricsStartAt
        );
        if (responseEvents.length) {
          const { error } = await supabase.from("crm_response_events").upsert(
            responseEvents.map((event) => ({
              session_id: event.sessionId,
              agent_bless_user_id: event.agentBlessUserId,
              wait_started_at: event.waitStartedAt,
              responded_at: event.respondedAt,
              response_seconds: event.responseSeconds,
            })),
            { onConflict: "session_id,wait_started_at" }
          );
          throwOnSupabaseError("Unable to store CRM response events", error);
          responseEventsStored += responseEvents.length;
        }
        const latest = [...allActivities].sort(
          (left, right) =>
            new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
        )[0];
        const { error: sessionError } = await supabase
          .from("crm_sessions")
          .update({
            last_actor_type: latest?.actorType || null,
            last_message_synced_at: startedAt,
          })
          .eq("session_id", session.sessionId);
        throwOnSupabaseError("Unable to update CRM message snapshot", sessionError);
      }
    );

    const agentDirectory = await refreshAgentDirectoryIfDue({
      supabase,
      blessClient,
      excludedUserIds: config.excludedBlessUserIds,
      now,
      seenAt: startedAt,
      lastDirectoryFailureAt: syncState.last_error_at,
    });

    const { error: finishError } = await supabase.rpc("crm_finish_sync", {
      p_sync_id: SYNC_ID,
      p_lock_token: lockToken,
      p_success: true,
      p_initialize: baseline,
      p_error_message: null,
    });
    throwOnSupabaseError("Unable to finish CRM sync", finishError);
    return {
      status: "COMPLETED",
      baseline,
      sessionsDiscovered: sessions.length,
      sessionsWithMessagesFetched: sessionsToFetch.length,
      activitiesStored,
      responseEventsStored,
      assignmentEventsDetected: assignmentEvents.length,
      agentDirectoryRefreshed: agentDirectory.refreshed,
      agentDirectoryWarning: agentDirectory.warning,
    };
  } catch (error) {
    await supabase.rpc("crm_finish_sync", {
      p_sync_id: SYNC_ID,
      p_lock_token: lockToken,
      p_success: false,
      p_initialize: false,
      p_error_message: safeErrorMessage(error),
    });
    throw error;
  }
}

-- Internal operational data for the Bless CRM integration.
-- Browser roles intentionally have no direct access; server-side service_role only.

create table public.crm_user_mappings (
  id uuid primary key default gen_random_uuid(),
  hub_user_id uuid references auth.users(id) on delete set null,
  bless_user_id uuid not null unique,
  agent_name text,
  agent_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  constraint crm_user_mappings_excluded_user_check
    check (bless_user_id <> '74c069d0-2286-427b-a3a0-dbf89e228984'::uuid)
);

create unique index crm_user_mappings_hub_user_unique
  on public.crm_user_mappings (hub_user_id)
  where hub_user_id is not null;

create table public.crm_sessions (
  session_id text primary key,
  contact_id text,
  contact_name text,
  current_bless_user_id uuid,
  assignment_scope text not null default 'UNASSIGNED'
    check (assignment_scope in ('VALID', 'EXCLUDED', 'UNASSIGNED', 'UNKNOWN')),
  department_id text,
  status text not null
    check (status in ('UNDEFINED', 'STARTED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'HIDDEN')),
  created_at timestamptz,
  updated_at timestamptz,
  last_interaction_at timestamptz,
  last_message_text text,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_actor_type text check (last_actor_type in ('CUSTOMER', 'AGENT', 'EXCLUDED', 'UNKNOWN')),
  last_message_synced_at timestamptz,
  last_synced_at timestamptz not null default now(),
  constraint crm_sessions_assignment_identity_check check (
    (assignment_scope = 'VALID' and current_bless_user_id is not null)
    or (assignment_scope <> 'VALID' and current_bless_user_id is null)
  ),
  constraint crm_sessions_excluded_user_check check (
    current_bless_user_id is null
    or current_bless_user_id <> '74c069d0-2286-427b-a3a0-dbf89e228984'::uuid
  ),
  constraint crm_sessions_no_message_body check (last_message_text is null)
);

create index crm_sessions_current_owner_status_idx
  on public.crm_sessions (current_bless_user_id, status);
create index crm_sessions_last_interaction_idx
  on public.crm_sessions (last_interaction_at desc);

create table public.crm_assignment_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  session_id text not null references public.crm_sessions(session_id) on delete cascade,
  event_type text not null
    check (event_type in ('ASSIGNED', 'TRANSFERRED', 'UNASSIGNED', 'COMPLETED', 'REOPENED')),
  from_bless_user_id uuid,
  to_bless_user_id uuid,
  from_scope text not null check (from_scope in ('VALID', 'EXCLUDED', 'UNASSIGNED', 'UNKNOWN')),
  to_scope text not null check (to_scope in ('VALID', 'EXCLUDED', 'UNASSIGNED', 'UNKNOWN')),
  detected_at timestamptz not null,
  created_at timestamptz not null default now(),
  source text not null default 'SNAPSHOT' check (source = 'SNAPSHOT'),
  constraint crm_assignment_events_from_identity_check check (
    (from_scope = 'VALID' and from_bless_user_id is not null)
    or (from_scope <> 'VALID' and from_bless_user_id is null)
  ),
  constraint crm_assignment_events_to_identity_check check (
    (to_scope = 'VALID' and to_bless_user_id is not null)
    or (to_scope <> 'VALID' and to_bless_user_id is null)
  ),
  constraint crm_assignment_events_excluded_user_check check (
    (from_bless_user_id is null or from_bless_user_id <> '74c069d0-2286-427b-a3a0-dbf89e228984'::uuid)
    and (to_bless_user_id is null or to_bless_user_id <> '74c069d0-2286-427b-a3a0-dbf89e228984'::uuid)
  )
);

create index crm_assignment_events_from_date_idx
  on public.crm_assignment_events (from_bless_user_id, detected_at desc);
create index crm_assignment_events_to_date_idx
  on public.crm_assignment_events (to_bless_user_id, detected_at desc);

create table public.crm_message_activity (
  message_id text primary key,
  session_id text not null references public.crm_sessions(session_id) on delete cascade,
  actor_type text not null check (actor_type in ('CUSTOMER', 'AGENT', 'EXCLUDED', 'UNKNOWN')),
  bless_user_id uuid,
  timestamp timestamptz not null,
  direction text,
  origin text,
  message_type text,
  created_at timestamptz not null default now(),
  constraint crm_message_activity_actor_identity_check check (
    (actor_type = 'AGENT' and bless_user_id is not null)
    or (actor_type <> 'AGENT' and bless_user_id is null)
  ),
  constraint crm_message_activity_excluded_user_check check (
    bless_user_id is null
    or bless_user_id <> '74c069d0-2286-427b-a3a0-dbf89e228984'::uuid
  )
);

create index crm_message_activity_agent_date_idx
  on public.crm_message_activity (bless_user_id, timestamp desc);
create index crm_message_activity_session_date_idx
  on public.crm_message_activity (session_id, timestamp desc);

create table public.crm_response_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.crm_sessions(session_id) on delete cascade,
  agent_bless_user_id uuid not null,
  wait_started_at timestamptz not null,
  responded_at timestamptz not null,
  response_seconds integer not null check (response_seconds >= 0),
  created_at timestamptz not null default now(),
  constraint crm_response_events_unique_wait unique (session_id, wait_started_at),
  constraint crm_response_events_excluded_user_check
    check (agent_bless_user_id <> '74c069d0-2286-427b-a3a0-dbf89e228984'::uuid),
  constraint crm_response_events_time_order_check check (responded_at >= wait_started_at)
);

create index crm_response_events_agent_date_idx
  on public.crm_response_events (agent_bless_user_id, responded_at desc);

create table public.crm_sync_state (
  id text primary key,
  initialized_at timestamptz,
  last_started_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  status text not null default 'IDLE' check (status in ('IDLE', 'RUNNING', 'SUCCEEDED', 'FAILED')),
  lock_token uuid
);

insert into public.crm_sync_state (id) values ('bless-primary')
on conflict (id) do nothing;

create or replace function public.crm_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger crm_user_mappings_set_updated_at
before update on public.crm_user_mappings
for each row execute function public.crm_set_updated_at();

create or replace function public.crm_try_start_sync(
  p_sync_id text default 'bless-primary',
  p_stale_after_seconds integer default 900
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_token uuid := gen_random_uuid();
begin
  update public.crm_sync_state
  set status = 'RUNNING',
      last_started_at = now(),
      last_error_message = null,
      lock_token = v_lock_token
  where id = p_sync_id
    and (
      status <> 'RUNNING'
      or last_started_at is null
      or last_started_at < now() - make_interval(secs => greatest(p_stale_after_seconds, 60))
    );

  if found then
    return v_lock_token;
  end if;
  return null;
end;
$$;

create or replace function public.crm_finish_sync(
  p_sync_id text,
  p_lock_token uuid,
  p_success boolean,
  p_initialize boolean default false,
  p_error_message text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.crm_sync_state
  set status = case when p_success then 'SUCCEEDED' else 'FAILED' end,
      initialized_at = case
        when p_success and p_initialize then coalesce(initialized_at, now())
        else initialized_at
      end,
      last_success_at = case when p_success then now() else last_success_at end,
      last_error_at = case when p_success then last_error_at else now() end,
      last_error_message = case
        when p_success then null
        else left(coalesce(p_error_message, 'CRM synchronization failed.'), 500)
      end,
      lock_token = null
  where id = p_sync_id and lock_token = p_lock_token;
  return found;
end;
$$;

create or replace function public.crm_apply_session_snapshots(
  p_sessions jsonb,
  p_events jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.crm_sessions (
    session_id,
    contact_id,
    contact_name,
    current_bless_user_id,
    assignment_scope,
    department_id,
    status,
    created_at,
    updated_at,
    last_interaction_at,
    last_message_text,
    unread_count,
    last_actor_type,
    last_message_synced_at,
    last_synced_at
  )
  select
    session_id,
    contact_id,
    contact_name,
    current_bless_user_id,
    assignment_scope,
    department_id,
    status,
    created_at,
    updated_at,
    last_interaction_at,
    null,
    greatest(coalesce(unread_count, 0), 0),
    last_actor_type,
    last_message_synced_at,
    coalesce(last_synced_at, now())
  from jsonb_to_recordset(coalesce(p_sessions, '[]'::jsonb)) as value(
    session_id text,
    contact_id text,
    contact_name text,
    current_bless_user_id uuid,
    assignment_scope text,
    department_id text,
    status text,
    created_at timestamptz,
    updated_at timestamptz,
    last_interaction_at timestamptz,
    unread_count integer,
    last_actor_type text,
    last_message_synced_at timestamptz,
    last_synced_at timestamptz
  )
  on conflict (session_id) do update set
    contact_id = excluded.contact_id,
    contact_name = excluded.contact_name,
    current_bless_user_id = excluded.current_bless_user_id,
    assignment_scope = excluded.assignment_scope,
    department_id = excluded.department_id,
    status = excluded.status,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    last_interaction_at = excluded.last_interaction_at,
    last_message_text = null,
    unread_count = excluded.unread_count,
    last_actor_type = coalesce(excluded.last_actor_type, public.crm_sessions.last_actor_type),
    last_message_synced_at = coalesce(
      excluded.last_message_synced_at,
      public.crm_sessions.last_message_synced_at
    ),
    last_synced_at = excluded.last_synced_at;

  insert into public.crm_assignment_events (
    event_key,
    session_id,
    event_type,
    from_bless_user_id,
    to_bless_user_id,
    from_scope,
    to_scope,
    detected_at,
    source
  )
  select
    event_key,
    session_id,
    event_type,
    from_bless_user_id,
    to_bless_user_id,
    from_scope,
    to_scope,
    detected_at,
    'SNAPSHOT'
  from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb)) as value(
    event_key text,
    session_id text,
    event_type text,
    from_bless_user_id uuid,
    to_bless_user_id uuid,
    from_scope text,
    to_scope text,
    detected_at timestamptz
  )
  on conflict (event_key) do nothing;
end;
$$;

alter table public.crm_user_mappings enable row level security;
alter table public.crm_sessions enable row level security;
alter table public.crm_assignment_events enable row level security;
alter table public.crm_message_activity enable row level security;
alter table public.crm_response_events enable row level security;
alter table public.crm_sync_state enable row level security;

revoke all on table public.crm_user_mappings from anon, authenticated;
revoke all on table public.crm_sessions from anon, authenticated;
revoke all on table public.crm_assignment_events from anon, authenticated;
revoke all on table public.crm_message_activity from anon, authenticated;
revoke all on table public.crm_response_events from anon, authenticated;
revoke all on table public.crm_sync_state from anon, authenticated;

grant all on table public.crm_user_mappings to service_role;
grant all on table public.crm_sessions to service_role;
grant all on table public.crm_assignment_events to service_role;
grant all on table public.crm_message_activity to service_role;
grant all on table public.crm_response_events to service_role;
grant all on table public.crm_sync_state to service_role;

revoke execute on function public.crm_set_updated_at() from public, anon, authenticated;
revoke execute on function public.crm_try_start_sync(text, integer) from public, anon, authenticated;
revoke execute on function public.crm_finish_sync(text, uuid, boolean, boolean, text) from public, anon, authenticated;
revoke execute on function public.crm_apply_session_snapshots(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.crm_try_start_sync(text, integer) to service_role;
grant execute on function public.crm_finish_sync(text, uuid, boolean, boolean, text) to service_role;
grant execute on function public.crm_apply_session_snapshots(jsonb, jsonb) to service_role;

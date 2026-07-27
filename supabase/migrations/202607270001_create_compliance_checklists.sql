create extension if not exists pgcrypto;

create table if not exists public.compliance_checklists (
  id uuid primary key default gen_random_uuid(),
  client_name text not null check (length(trim(client_name)) > 0),
  process_reference text,
  analyst_name text,
  review_date date not null,
  overall_status text not null
    check (overall_status in ('IN_PROGRESS', 'HAS_ISSUES', 'COMPLETED')),
  completion_percent numeric(5, 2) not null default 0
    check (completion_percent >= 0 and completion_percent <= 100),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.compliance_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null
    references public.compliance_checklists(id) on delete cascade,
  item_key text not null,
  item_order integer not null,
  item_label text not null,
  status text not null
    check (status in ('PENDING', 'COMPLIANT', 'HAS_ISSUE', 'NOT_APPLICABLE')),
  observation text not null default '',
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_id, item_key)
);

create index if not exists compliance_checklists_client_name_idx
  on public.compliance_checklists (lower(client_name));
create index if not exists compliance_checklists_process_reference_idx
  on public.compliance_checklists (lower(process_reference));
create index if not exists compliance_checklists_overall_status_idx
  on public.compliance_checklists (overall_status);
create index if not exists compliance_checklists_analyst_name_idx
  on public.compliance_checklists (lower(analyst_name));
create index if not exists compliance_checklists_review_date_idx
  on public.compliance_checklists (review_date);
create index if not exists compliance_checklists_updated_at_idx
  on public.compliance_checklists (updated_at desc);
create index if not exists compliance_checklists_archived_at_idx
  on public.compliance_checklists (archived_at);
create index if not exists compliance_checklist_items_checklist_id_idx
  on public.compliance_checklist_items (checklist_id);

create or replace function public.set_compliance_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists compliance_checklists_set_updated_at
  on public.compliance_checklists;
create trigger compliance_checklists_set_updated_at
before update on public.compliance_checklists
for each row execute function public.set_compliance_updated_at();

drop trigger if exists compliance_checklist_items_set_updated_at
  on public.compliance_checklist_items;
create trigger compliance_checklist_items_set_updated_at
before update on public.compliance_checklist_items
for each row execute function public.set_compliance_updated_at();

alter table public.compliance_checklists enable row level security;
alter table public.compliance_checklist_items enable row level security;

drop policy if exists "Authenticated users read compliance checklists"
  on public.compliance_checklists;
create policy "Authenticated users read compliance checklists"
on public.compliance_checklists
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "Authenticated users create compliance checklists"
  on public.compliance_checklists;
create policy "Authenticated users create compliance checklists"
on public.compliance_checklists
for insert
to authenticated
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

drop policy if exists "Authenticated users update compliance checklists"
  on public.compliance_checklists;
create policy "Authenticated users update compliance checklists"
on public.compliance_checklists
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null and updated_by = auth.uid());

drop policy if exists "Authenticated users read compliance checklist items"
  on public.compliance_checklist_items;
create policy "Authenticated users read compliance checklist items"
on public.compliance_checklist_items
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "Authenticated users create compliance checklist items"
  on public.compliance_checklist_items;
create policy "Authenticated users create compliance checklist items"
on public.compliance_checklist_items
for insert
to authenticated
with check (auth.uid() is not null and updated_by = auth.uid());

drop policy if exists "Authenticated users update compliance checklist items"
  on public.compliance_checklist_items;
create policy "Authenticated users update compliance checklist items"
on public.compliance_checklist_items
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null and updated_by = auth.uid());

create or replace function public.create_compliance_checklist_with_items(
  p_checklist_id uuid,
  p_client_name text,
  p_process_reference text,
  p_analyst_name text,
  p_review_date date,
  p_overall_status text,
  p_completion_percent numeric,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_checklist_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select id
  into v_checklist_id
  from public.compliance_checklists
  where id = p_checklist_id
    and created_by = v_user_id;

  if v_checklist_id is not null then
    return v_checklist_id;
  end if;

  insert into public.compliance_checklists (
    id,
    client_name,
    process_reference,
    analyst_name,
    review_date,
    overall_status,
    completion_percent,
    created_by,
    updated_by
  )
  values (
    p_checklist_id,
    trim(p_client_name),
    nullif(trim(p_process_reference), ''),
    nullif(trim(p_analyst_name), ''),
    p_review_date,
    p_overall_status,
    p_completion_percent,
    v_user_id,
    v_user_id
  )
  returning id into v_checklist_id;

  insert into public.compliance_checklist_items (
    checklist_id,
    item_key,
    item_order,
    item_label,
    status,
    observation,
    updated_by
  )
  select
    v_checklist_id,
    item->>'item_key',
    (item->>'item_order')::integer,
    item->>'item_label',
    item->>'status',
    coalesce(item->>'observation', ''),
    v_user_id
  from jsonb_array_elements(p_items) as item;

  return v_checklist_id;
end;
$$;

revoke all on function public.create_compliance_checklist_with_items(
  uuid, text, text, text, date, text, numeric, jsonb
) from public;
grant execute on function public.create_compliance_checklist_with_items(
  uuid, text, text, text, date, text, numeric, jsonb
) to authenticated;

create or replace function public.update_compliance_checklist_with_items(
  p_checklist_id uuid,
  p_expected_updated_at timestamptz,
  p_client_name text,
  p_process_reference text,
  p_analyst_name text,
  p_review_date date,
  p_overall_status text,
  p_completion_percent numeric,
  p_items jsonb
)
returns public.compliance_checklists
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_record public.compliance_checklists%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.compliance_checklists
  set
    client_name = trim(p_client_name),
    process_reference = nullif(trim(p_process_reference), ''),
    analyst_name = nullif(trim(p_analyst_name), ''),
    review_date = p_review_date,
    overall_status = p_overall_status,
    completion_percent = p_completion_percent,
    updated_by = v_user_id
  where id = p_checklist_id
    and updated_at = p_expected_updated_at
  returning * into v_record;

  if v_record.id is null then
    raise exception 'COMPLIANCE_CONFLICT'
      using errcode = '40001';
  end if;

  insert into public.compliance_checklist_items (
    checklist_id,
    item_key,
    item_order,
    item_label,
    status,
    observation,
    updated_by
  )
  select
    p_checklist_id,
    item->>'item_key',
    (item->>'item_order')::integer,
    item->>'item_label',
    item->>'status',
    coalesce(item->>'observation', ''),
    v_user_id
  from jsonb_array_elements(p_items) as item
  on conflict (checklist_id, item_key)
  do update set
    item_order = excluded.item_order,
    item_label = excluded.item_label,
    status = excluded.status,
    observation = excluded.observation,
    updated_by = excluded.updated_by;

  return v_record;
end;
$$;

revoke all on function public.update_compliance_checklist_with_items(
  uuid, timestamptz, text, text, text, date, text, numeric, jsonb
) from public;
grant execute on function public.update_compliance_checklist_with_items(
  uuid, timestamptz, text, text, text, date, text, numeric, jsonb
) to authenticated;

create or replace function public.get_compliance_user_labels(p_user_ids uuid[])
returns table (id uuid, email text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
  select users.id, users.email::text
  from auth.users
  where users.id = any(p_user_ids);
end;
$$;

revoke all on function public.get_compliance_user_labels(uuid[]) from public;
grant execute on function public.get_compliance_user_labels(uuid[]) to authenticated;

revoke all on table public.compliance_checklists from anon;
revoke all on table public.compliance_checklist_items from anon;
grant select, insert, update on table public.compliance_checklists to authenticated;
grant select, insert, update on table public.compliance_checklist_items to authenticated;

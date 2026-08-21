-- Restrict Compliance Checklist data to the authenticated record owner.
-- Existing records and their created_by values are intentionally left unchanged.

alter table public.compliance_checklists enable row level security;
alter table public.compliance_checklist_items enable row level security;

drop policy if exists "Authenticated users read compliance checklists"
  on public.compliance_checklists;
drop policy if exists "Authenticated users create compliance checklists"
  on public.compliance_checklists;
drop policy if exists "Authenticated users update compliance checklists"
  on public.compliance_checklists;

create policy "Owners read compliance checklists"
on public.compliance_checklists
for select
to authenticated
using (created_by = auth.uid());

create policy "Owners create compliance checklists"
on public.compliance_checklists
for insert
to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
);

create policy "Owners update compliance checklists"
on public.compliance_checklists
for update
to authenticated
using (created_by = auth.uid())
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
);

drop policy if exists "Authenticated users read compliance checklist items"
  on public.compliance_checklist_items;
drop policy if exists "Authenticated users create compliance checklist items"
  on public.compliance_checklist_items;
drop policy if exists "Authenticated users update compliance checklist items"
  on public.compliance_checklist_items;

create policy "Owners read compliance checklist items"
on public.compliance_checklist_items
for select
to authenticated
using (
  exists (
    select 1
    from public.compliance_checklists checklist
    where checklist.id = compliance_checklist_items.checklist_id
      and checklist.created_by = auth.uid()
  )
);

create policy "Owners create compliance checklist items"
on public.compliance_checklist_items
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.compliance_checklists checklist
    where checklist.id = compliance_checklist_items.checklist_id
      and checklist.created_by = auth.uid()
  )
);

create policy "Owners update compliance checklist items"
on public.compliance_checklist_items
for update
to authenticated
using (
  exists (
    select 1
    from public.compliance_checklists checklist
    where checklist.id = compliance_checklist_items.checklist_id
      and checklist.created_by = auth.uid()
  )
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.compliance_checklists checklist
    where checklist.id = compliance_checklist_items.checklist_id
      and checklist.created_by = auth.uid()
  )
);

create index if not exists compliance_checklists_created_by_idx
  on public.compliance_checklists (created_by);

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
  from jsonb_array_elements(p_items) as item
  where exists (
    select 1
    from public.compliance_checklists checklist
    where checklist.id = v_checklist_id
      and checklist.created_by = v_user_id
  );

  return v_checklist_id;
end;
$$;

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
    and created_by = v_user_id
    and updated_at = p_expected_updated_at
  returning * into v_record;

  if v_record.id is null then
    raise exception 'COMPLIANCE_CONFLICT'
      using errcode = '40001';
  end if;

  if not exists (
    select 1
    from public.compliance_checklists checklist
    where checklist.id = p_checklist_id
      and checklist.created_by = v_user_id
  ) then
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
  where exists (
    select 1
    from public.compliance_checklists checklist
    where checklist.id = p_checklist_id
      and checklist.created_by = v_user_id
  )
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

-- This helper is security definer only to read auth.users. Limit it to the
-- current account even if arbitrary IDs are supplied by a caller.
create or replace function public.get_compliance_user_labels(p_user_ids uuid[])
returns table (id uuid, email text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  return query
  select users.id, users.email::text
  from auth.users
  where users.id = v_user_id
    and users.id = any(p_user_ids);
end;
$$;

revoke all on function public.create_compliance_checklist_with_items(
  uuid, text, text, text, date, text, numeric, jsonb
) from public;
grant execute on function public.create_compliance_checklist_with_items(
  uuid, text, text, text, date, text, numeric, jsonb
) to authenticated;

revoke all on function public.update_compliance_checklist_with_items(
  uuid, timestamptz, text, text, text, date, text, numeric, jsonb
) from public;
grant execute on function public.update_compliance_checklist_with_items(
  uuid, timestamptz, text, text, text, date, text, numeric, jsonb
) to authenticated;

revoke all on function public.get_compliance_user_labels(uuid[]) from public;
grant execute on function public.get_compliance_user_labels(uuid[]) to authenticated;

revoke all on table public.compliance_checklists from anon;
revoke all on table public.compliance_checklist_items from anon;
revoke delete on table public.compliance_checklists from authenticated;
revoke delete on table public.compliance_checklist_items from authenticated;
grant select, insert, update on table public.compliance_checklists to authenticated;
grant select, insert, update on table public.compliance_checklist_items to authenticated;

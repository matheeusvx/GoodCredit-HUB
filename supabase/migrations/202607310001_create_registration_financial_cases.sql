create extension if not exists pgcrypto;

create table if not exists public.registration_financial_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  client_name text not null check (length(trim(client_name)) > 0),
  process_reference text,
  registry_office text,
  city text,
  operation_mode text not null check (operation_mode in ('FULL_PAYMENT_TO_GOODCREDIT', 'ADVISORY_ONLY')),
  advisory_fee_expected_cents bigint not null default 200000 check (advisory_fee_expected_cents >= 0),
  estimated_itbi_cents bigint not null default 0 check (estimated_itbi_cents >= 0),
  estimated_registry_cents bigint not null default 0 check (estimated_registry_cents >= 0),
  estimated_other_costs_cents bigint not null default 0 check (estimated_other_costs_cents >= 0),
  notes text,
  financial_finalized_at timestamptz,
  opened_at date not null default current_date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registration_financial_transactions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.registration_financial_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  transaction_type text not null check (transaction_type in ('INCOME', 'EXPENSE', 'DIRECT_CUSTOMER_PAYMENT', 'REFUND', 'ADJUSTMENT')),
  category text,
  transaction_date date not null,
  amount_cents bigint not null check (amount_cents > 0),
  advisory_allocation_cents bigint not null default 0 check (advisory_allocation_cents >= 0),
  cost_allocation_cents bigint not null default 0 check (cost_allocation_cents >= 0),
  customer_interest_cents bigint not null default 0 check (customer_interest_cents >= 0),
  customer_total_paid_cents bigint not null default 0 check (customer_total_paid_cents >= 0),
  adjustment_direction text check (adjustment_direction is null or adjustment_direction in ('POSITIVE', 'NEGATIVE')),
  payment_method text,
  installments integer check (installments is null or installments > 0),
  installment_amount_cents bigint check (installment_amount_cents is null or installment_amount_cents >= 0),
  card_brand text,
  beneficiary text,
  reference_number text,
  description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (transaction_type = 'INCOME' and advisory_allocation_cents + cost_allocation_cents = amount_cents)
    or
    (transaction_type <> 'INCOME' and advisory_allocation_cents = 0 and cost_allocation_cents = 0)
  ),
  check (customer_total_paid_cents >= amount_cents or customer_total_paid_cents = 0),
  check (
    (transaction_type = 'ADJUSTMENT' and adjustment_direction is not null)
    or
    (transaction_type <> 'ADJUSTMENT' and adjustment_direction is null)
  )
);

create index if not exists registration_financial_cases_owner_updated_idx on public.registration_financial_cases (owner_id, updated_at desc);
create index if not exists registration_financial_cases_owner_client_idx on public.registration_financial_cases (owner_id, lower(client_name));
create index if not exists registration_financial_cases_owner_process_idx on public.registration_financial_cases (owner_id, lower(process_reference));
create index if not exists registration_financial_cases_owner_mode_idx on public.registration_financial_cases (owner_id, operation_mode);
create index if not exists registration_financial_cases_owner_archived_idx on public.registration_financial_cases (owner_id, archived_at);
create index if not exists registration_financial_transactions_case_date_idx on public.registration_financial_transactions (case_id, transaction_date desc);
create index if not exists registration_financial_transactions_owner_idx on public.registration_financial_transactions (owner_id);
create index if not exists registration_financial_transactions_type_idx on public.registration_financial_transactions (transaction_type);

create or replace function public.set_registration_financial_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_registration_financial_owner()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  new.owner_id = auth.uid();
  return new;
end;
$$;

create or replace function public.validate_registration_financial_transaction()
returns trigger language plpgsql set search_path = public as $$
declare
  v_case public.registration_financial_cases%rowtype;
begin
  select * into v_case from public.registration_financial_cases where id = new.case_id and owner_id = auth.uid();
  if v_case.id is null then raise exception 'Financial case unavailable'; end if;
  if v_case.archived_at is not null then raise exception 'Archived financial case cannot receive transactions'; end if;
  if v_case.financial_finalized_at is not null then raise exception 'Finalized financial case cannot receive transactions'; end if;
  if v_case.operation_mode = 'ADVISORY_ONLY' and new.transaction_type = 'INCOME' and new.cost_allocation_cents <> 0 then
    raise exception 'Advisory-only cases cannot allocate income to costs';
  end if;
  new.owner_id = auth.uid();
  return new;
end;
$$;

drop trigger if exists registration_financial_cases_owner on public.registration_financial_cases;
create trigger registration_financial_cases_owner before insert on public.registration_financial_cases for each row execute function public.set_registration_financial_owner();
drop trigger if exists registration_financial_cases_updated_at on public.registration_financial_cases;
create trigger registration_financial_cases_updated_at before update on public.registration_financial_cases for each row execute function public.set_registration_financial_updated_at();
drop trigger if exists registration_financial_transactions_guard on public.registration_financial_transactions;
create trigger registration_financial_transactions_guard before insert or update on public.registration_financial_transactions for each row execute function public.validate_registration_financial_transaction();
drop trigger if exists registration_financial_transactions_updated_at on public.registration_financial_transactions;
create trigger registration_financial_transactions_updated_at before update on public.registration_financial_transactions for each row execute function public.set_registration_financial_updated_at();

create or replace function public.touch_registration_financial_case()
returns trigger language plpgsql set search_path = public as $$
begin
  update public.registration_financial_cases set updated_at = now() where id = new.case_id and owner_id = auth.uid();
  return new;
end;
$$;
drop trigger if exists registration_financial_transactions_touch_case on public.registration_financial_transactions;
create trigger registration_financial_transactions_touch_case after insert or update on public.registration_financial_transactions for each row execute function public.touch_registration_financial_case();

alter table public.registration_financial_cases enable row level security;
alter table public.registration_financial_transactions enable row level security;

drop policy if exists "Owners read registration financial cases" on public.registration_financial_cases;
create policy "Owners read registration financial cases" on public.registration_financial_cases for select to authenticated using (owner_id = auth.uid());
drop policy if exists "Owners create registration financial cases" on public.registration_financial_cases;
create policy "Owners create registration financial cases" on public.registration_financial_cases for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "Owners update registration financial cases" on public.registration_financial_cases;
create policy "Owners update registration financial cases" on public.registration_financial_cases for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Owners read registration financial transactions" on public.registration_financial_transactions;
create policy "Owners read registration financial transactions" on public.registration_financial_transactions for select to authenticated using (
  owner_id = auth.uid() and exists (select 1 from public.registration_financial_cases c where c.id = case_id and c.owner_id = auth.uid())
);
drop policy if exists "Owners create registration financial transactions" on public.registration_financial_transactions;
create policy "Owners create registration financial transactions" on public.registration_financial_transactions for insert to authenticated with check (
  owner_id = auth.uid() and exists (select 1 from public.registration_financial_cases c where c.id = case_id and c.owner_id = auth.uid())
);
drop policy if exists "Owners update registration financial transactions" on public.registration_financial_transactions;
create policy "Owners update registration financial transactions" on public.registration_financial_transactions for update to authenticated using (
  owner_id = auth.uid() and exists (select 1 from public.registration_financial_cases c where c.id = case_id and c.owner_id = auth.uid())
) with check (
  owner_id = auth.uid() and exists (select 1 from public.registration_financial_cases c where c.id = case_id and c.owner_id = auth.uid())
);

revoke all on table public.registration_financial_cases from anon;
revoke all on table public.registration_financial_transactions from anon;
grant select, insert, update on table public.registration_financial_cases to authenticated;
grant select, insert, update on table public.registration_financial_transactions to authenticated;

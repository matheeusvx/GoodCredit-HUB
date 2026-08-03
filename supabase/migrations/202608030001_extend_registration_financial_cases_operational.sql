alter table public.registration_financial_cases
  add column if not exists control_number bigint,
  add column if not exists signing_date date,
  add column if not exists referral_source text,
  add column if not exists bank_branch text,
  add column if not exists iq_status text,
  add column if not exists payment_status text,
  add column if not exists collection_status text,
  add column if not exists itbi_amount_cents bigint not null default 0,
  add column if not exists itbi_payment_status text,
  add column if not exists protocol_reference text,
  add column if not exists registry_costs_cents bigint not null default 0,
  add column if not exists registry_costs_payment_status text,
  add column if not exists operational_status text not null default '',
  add column if not exists operational_status_updated_at timestamptz,
  add column if not exists bank_delivery_date date,
  add column if not exists seller_payment_status text,
  add column if not exists seller_payment_date date;

update public.registration_financial_cases
set payment_status = case operation_mode
  when 'FULL_PAYMENT_TO_GOODCREDIT' then 'FULL_PAYMENT'
  when 'ADVISORY_ONLY' then 'ADVISORY_ONLY'
end
where payment_status is null;

with owner_maximums as (
  select owner_id, coalesce(max(control_number), 0) as current_maximum
  from public.registration_financial_cases
  group by owner_id
), numbered as (
  select cases.id,
    coalesce(owner_maximums.current_maximum, 0)
      + row_number() over (partition by cases.owner_id order by cases.created_at, cases.id) as next_number
  from public.registration_financial_cases cases
  left join owner_maximums on owner_maximums.owner_id = cases.owner_id
  where cases.control_number is null
)
update public.registration_financial_cases cases
set control_number = numbered.next_number
from numbered where cases.id = numbered.id;

create unique index if not exists registration_financial_cases_owner_control_number_uidx
  on public.registration_financial_cases (owner_id, control_number);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'registration_financial_cases_iq_status_check') then
    alter table public.registration_financial_cases add constraint registration_financial_cases_iq_status_check check (iq_status is null or iq_status in ('SANTANDER','CAIXA','INTER','ITAU','BRADESCO','BANCO_DO_BRASIL','NAO'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'registration_financial_cases_payment_status_check') then
    alter table public.registration_financial_cases add constraint registration_financial_cases_payment_status_check check (payment_status is null or payment_status in ('TO_CHARGE','FULL_PAYMENT','FOLLOWED_ACCOUNT','ADVISORY_ONLY','NO_PAYMENT'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'registration_financial_cases_collection_status_check') then
    alter table public.registration_financial_cases add constraint registration_financial_cases_collection_status_check check (collection_status is null or collection_status in ('TO_CHARGE','ALREADY_PAID','NOTHING_PAID','DO_NOT_CHARGE','CHARGE_SENT'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'registration_financial_cases_itbi_payment_status_check') then
    alter table public.registration_financial_cases add constraint registration_financial_cases_itbi_payment_status_check check (itbi_payment_status is null or itbi_payment_status in ('PENDING','PAID_BY_GOODCREDIT','PAID_BY_CLIENT','EXEMPT','NOT_APPLICABLE'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'registration_financial_cases_registry_costs_payment_status_check') then
    alter table public.registration_financial_cases add constraint registration_financial_cases_registry_costs_payment_status_check check (registry_costs_payment_status is null or registry_costs_payment_status in ('PENDING','PAID_BY_GOODCREDIT','PAID_BY_CLIENT','NOT_APPLICABLE'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'registration_financial_cases_seller_payment_status_check') then
    alter table public.registration_financial_cases add constraint registration_financial_cases_seller_payment_status_check check (seller_payment_status is null or seller_payment_status in ('PENDING','IN_PROGRESS','PAID','NOT_APPLICABLE'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'registration_financial_cases_operational_money_check') then
    alter table public.registration_financial_cases add constraint registration_financial_cases_operational_money_check check (itbi_amount_cents >= 0 and registry_costs_cents >= 0);
  end if;
end $$;

create index if not exists registration_financial_cases_owner_signing_idx on public.registration_financial_cases (owner_id, signing_date desc);
create index if not exists registration_financial_cases_owner_iq_idx on public.registration_financial_cases (owner_id, iq_status);
create index if not exists registration_financial_cases_owner_payment_idx on public.registration_financial_cases (owner_id, payment_status);
create index if not exists registration_financial_cases_owner_collection_idx on public.registration_financial_cases (owner_id, collection_status);
create index if not exists registration_financial_cases_owner_itbi_payment_idx on public.registration_financial_cases (owner_id, itbi_payment_status);
create index if not exists registration_financial_cases_owner_registry_payment_idx on public.registration_financial_cases (owner_id, registry_costs_payment_status);
create index if not exists registration_financial_cases_owner_seller_payment_idx on public.registration_financial_cases (owner_id, seller_payment_status);
create index if not exists registration_financial_cases_owner_updated_idx on public.registration_financial_cases (owner_id, updated_at desc);
create unique index if not exists registration_financial_transactions_auto_payment_uidx
  on public.registration_financial_transactions (case_id, reference_number)
  where reference_number in ('AUTO:ITBI', 'AUTO:REGISTRY_FEES');

create or replace function public.assign_registration_financial_control_number()
returns trigger language plpgsql set search_path = public as $$
begin
  new.owner_id := auth.uid();
  if new.owner_id is null then
    raise exception 'Authentication is required to create a registration financial case.';
  end if;
  if new.control_number is null then
    perform pg_advisory_xact_lock(hashtext(new.owner_id::text));
    select coalesce(max(control_number), 0) + 1 into new.control_number
    from public.registration_financial_cases where owner_id = new.owner_id;
  end if;
  return new;
end;
$$;

drop trigger if exists registration_financial_cases_control_number on public.registration_financial_cases;
create trigger registration_financial_cases_control_number
before insert on public.registration_financial_cases
for each row execute function public.assign_registration_financial_control_number();

create or replace function public.track_registration_operational_status()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.operational_status is distinct from old.operational_status then new.operational_status_updated_at = now(); end if;
  return new;
end;
$$;
drop trigger if exists registration_financial_cases_operational_status on public.registration_financial_cases;
create trigger registration_financial_cases_operational_status
before update on public.registration_financial_cases
for each row execute function public.track_registration_operational_status();

-- RLS existente permanece ativa. Nenhum privilégio é concedido ao papel anon.

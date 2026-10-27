-- A payment says what it bought (ADR 0045).
--
-- Until now a payment was "a billing log row that carries records", and whether it opened
-- the package or topped it up was worked out from its place in the list. That leaves no way
-- to record money taken for anything else, and an Operator now sells an Extra Schedule: a
-- Schedule beyond what the Plan includes, which carries no records at all.
--
-- event_billing_events.kind names what a payment bought:
--   plan           - opens the Record Package: records on a Plan; exactly one per Event
--   top_up         - more Paid Records on the package's Plan (ADR 0042)
--   extra_schedule - one or more Schedules beyond the Plan, counted in schedule_count.
--                    The Operator creates the Schedule by hand; nothing links to it
-- A row with no kind is an Operator's status change, not a payment.
--
-- Paid Records are still the sum of record_count, so a Top-up grows the package exactly as
-- before and an Extra Schedule leaves it alone. Both upsales need the Plan to exist first.

create type public.billing_payment_kind as enum ('plan', 'top_up', 'extra_schedule');

alter table public.event_billing_events
  add column kind public.billing_payment_kind null,
  add column schedule_count integer null;

-- ---------------------------------------------------------------------------
-- 1. Backfill: the oldest payment of each Event opened its package
-- ---------------------------------------------------------------------------
-- Every payment so far carries records. The same order every read uses (occurred_at, then
-- created_at) decides which one opened the package; id only breaks an exact tie.

update public.event_billing_events b
set kind = case when ranked.n = 1 then 'plan' else 'top_up' end::public.billing_payment_kind
from (
  select id,
         row_number() over (
           partition by event_id order by occurred_at, created_at, id
         ) as n
  from public.event_billing_events
  where record_count is not null
) ranked
where b.id = ranked.id;

-- ---------------------------------------------------------------------------
-- 2. What each kind must carry
-- ---------------------------------------------------------------------------

alter table public.event_billing_events drop constraint event_billing_events_payment_complete;

alter table public.event_billing_events
  add constraint event_billing_events_payment_complete check (
    (
      kind is null
      and record_count is null
      and channel is null
      and payment_method is null
      and schedule_count is null
    )
    or (
      kind in ('plan', 'top_up')
      and record_count is not null
      and channel is not null
      and schedule_count is null
      and payment_method is not null
      and amount is not null
      and to_status = 'paid'
    )
    or (
      kind = 'extra_schedule'
      and schedule_count is not null
      and record_count is null
      and channel is null
      and payment_method is not null
      and amount is not null
      and to_status = 'paid'
    )
  ),
  add constraint event_billing_events_schedule_count_positive check (
    schedule_count is null or schedule_count > 0
  );

-- One Plan per Event. This, not the read in the Server Action, is what stops two Operators
-- opening the same package twice.
create unique index uq_event_billing_events_plan
  on public.event_billing_events(event_id)
  where kind = 'plan';

-- ---------------------------------------------------------------------------
-- 3. apply_event_billing_transition takes the kind
-- ---------------------------------------------------------------------------

drop function public.apply_event_billing_transition(
  uuid, public.event_billing_status, text, text, numeric, text,
  public.record_package_channel, integer, text, uuid, timestamptz, public.billing_payment_method
);

create or replace function public.apply_event_billing_transition(
  p_event_id       uuid,
  p_to_status      public.event_billing_status,
  p_provider       text default 'manual',
  p_provider_ref   text default null,
  p_amount         numeric default null,
  p_currency       text default 'ILS',
  p_channel        public.record_package_channel default null,
  p_record_count   integer default null,
  p_note           text default null,
  p_created_by     uuid default null,
  p_occurred_at    timestamptz default now(),
  p_payment_method public.billing_payment_method default null,
  p_kind           public.billing_payment_kind default null,
  p_schedule_count integer default null
)
returns public.event_billing_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.event_billing_events;
  v_row      public.event_billing_events;
begin
  if p_provider_ref is not null then
    select * into v_existing
    from public.event_billing_events
    where provider = p_provider and provider_ref = p_provider_ref;

    if found then
      return v_existing;
    end if;
  end if;

  -- An upsale adds to a package, so there has to be one.
  if p_kind in ('top_up', 'extra_schedule') and not exists (
    select 1 from public.event_billing_events
    where event_id = p_event_id and kind = 'plan'
  ) then
    raise exception 'apply_event_billing_transition: event % has no plan to add a % to',
      p_event_id, p_kind;
  end if;

  insert into public.event_billing_events (
    event_id, to_status, provider, provider_ref, amount, currency,
    channel, record_count, note, created_by, occurred_at, payment_method,
    kind, schedule_count
  )
  values (
    p_event_id, p_to_status, p_provider, p_provider_ref, p_amount, p_currency,
    p_channel, p_record_count, p_note, p_created_by, p_occurred_at, p_payment_method,
    p_kind, p_schedule_count
  )
  returning * into v_row;

  update public.events
  set billing_status = p_to_status
  where id = p_event_id;

  if not found then
    raise exception 'apply_event_billing_transition: event % does not exist', p_event_id;
  end if;

  return v_row;
end;
$$;

revoke execute on function public.apply_event_billing_transition(
  uuid, public.event_billing_status, text, text, numeric, text,
  public.record_package_channel, integer, text, uuid, timestamptz, public.billing_payment_method,
  public.billing_payment_kind, integer
) from public, anon, authenticated;

grant execute on function public.apply_event_billing_transition(
  uuid, public.event_billing_status, text, text, numeric, text,
  public.record_package_channel, integer, text, uuid, timestamptz, public.billing_payment_method,
  public.billing_payment_kind, integer
) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Guard: every payment has a kind, and every package exactly one Plan, its oldest
-- ---------------------------------------------------------------------------

do $$
declare
  v_unkinded integer;
  v_misplaced integer;
begin
  select count(*) into v_unkinded
  from public.event_billing_events
  where record_count is not null and kind is null;

  if v_unkinded > 0 then
    raise exception 'billing_payment_kinds: % payments have no kind', v_unkinded;
  end if;

  select count(*) into v_misplaced
  from (
    select event_id
    from public.event_billing_events
    where record_count is not null
    group by event_id
    having count(*) filter (where kind = 'plan') <> 1
        or min(occurred_at) <> min(occurred_at) filter (where kind = 'plan')
  ) bad;

  if v_misplaced > 0 then
    raise exception 'billing_payment_kinds: % events do not open with exactly one plan', v_misplaced;
  end if;
end;
$$;

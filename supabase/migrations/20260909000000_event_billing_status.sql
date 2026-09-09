-- "Free to Plan, Pay to Send" was modelled as a single boolean, events.can_create_schedules,
-- flipped by hand in the Back Office. It carried no history (who enabled it, when, whether
-- money changed hands), no room for the states between free and paid (payment started but
-- not confirmed, access comped, access revoked), and nowhere for an external payment
-- service to deliver a confirmation.
--
-- This migration makes the commercial state of an Event a first-class enum,
-- events.billing_status, and turns can_create_schedules into a value derived from it so the
-- send gate can never disagree with the status. Every transition is written to
-- event_billing_events - a log, some of whose rows are real payments and some of which are
-- manual operator decisions - which doubles as the idempotent intake point for a future
-- payment webhook (unique on provider + provider_ref).
--
-- billing_status:
--   free            - default; planning is free, no outbound reach
--   payment_pending - payment started in the external service, not yet confirmed
--   paid            - payment confirmed; WhatsApp lifecycle and Call Rounds unlock
--   comped          - Kululu granted sending without payment (team, test, goodwill)
--   canceled        - was paid, now revoked or refunded; reach turns back off
--
-- There is production data behind can_create_schedules = true. Those events were enabled by
-- an operator flipping the flag with no payment record attached, so the honest backfill is
-- 'comped', not 'paid' (see the seed row written per event below).

-- ---------------------------------------------------------------------------
-- 1. billing_status enum + column
-- ---------------------------------------------------------------------------

create type public.event_billing_status as enum (
  'free',
  'payment_pending',
  'paid',
  'comped',
  'canceled'
);

alter table public.events
  add column billing_status public.event_billing_status not null default 'free';

-- Remember which events could send before the change, so step 5 can prove the derived
-- column reproduces exactly that set.
create temporary table _pre_send_gate on commit drop as
  select id from public.events where can_create_schedules = true;

update public.events
  set billing_status = 'comped'
  where can_create_schedules = true;

-- ---------------------------------------------------------------------------
-- 2. can_create_schedules becomes derived
-- ---------------------------------------------------------------------------
-- Nothing in the database references this column - no policy, function, or view - so it is
-- safe to drop and recreate. Every reader is application code selecting the column, and a
-- generated column reads identically.

alter table public.events drop column can_create_schedules;

alter table public.events
  add column can_create_schedules boolean
  generated always as (billing_status in ('paid', 'comped')) stored;

-- ---------------------------------------------------------------------------
-- 3. event_billing_events - transition log and webhook intake
-- ---------------------------------------------------------------------------

create table public.event_billing_events (
  id           uuid        primary key default gen_random_uuid(),
  event_id     uuid        not null references public.events(id) on delete cascade,
  to_status    public.event_billing_status not null,
  provider     text        not null default 'manual',
  provider_ref text        null,
  amount       numeric(10, 2) null,
  currency     text        not null default 'ILS',
  channel      public.delivery_method null,
  record_count integer     null,
  note         text        null,
  created_by   uuid        null references auth.users(id) on delete set null,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  constraint event_billing_events_amount_non_negative check (amount is null or amount >= 0),
  constraint event_billing_events_record_count_positive check (record_count is null or record_count > 0),
  constraint event_billing_events_note_length check (note is null or char_length(note) <= 500)
);

create index idx_event_billing_events_event_id on public.event_billing_events(event_id);

-- One confirmation per external payment. Manual rows carry no provider_ref and are exempt.
create unique index uq_event_billing_events_provider_ref
  on public.event_billing_events(provider, provider_ref)
  where provider_ref is not null;

alter table public.event_billing_events enable row level security;

-- The owner may read their own billing history; admins may read all. Writes go through
-- apply_event_billing_transition (security definer) or the service role only - never
-- straight from an authenticated client.
create policy "event_billing_events_select" on public.event_billing_events for select to authenticated
  using (
    event_id in (select id from public.events where user_id = auth.uid())
    or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

-- Seed a row for every event enabled before this migration, so the log is complete from
-- day one rather than starting with unexplained 'comped' events.
insert into public.event_billing_events (event_id, to_status, provider, note)
select id, 'comped', 'manual', 'Backfilled from legacy can_create_schedules flag'
from public.events
where billing_status = 'comped';

-- ---------------------------------------------------------------------------
-- 4. apply_event_billing_transition - the one write path
-- ---------------------------------------------------------------------------
-- Advances events.billing_status and appends the matching log row in a single transaction.
-- Idempotent when p_provider_ref is supplied: a second call with the same provider +
-- provider_ref is a no-op that returns the existing row. Security definer because the
-- payment webhook runs unauthenticated and the Back Office action runs as the service role;
-- callers are responsible for their own authorization (assertAdmin, signature check).

create or replace function public.apply_event_billing_transition(
  p_event_id     uuid,
  p_to_status    public.event_billing_status,
  p_provider     text default 'manual',
  p_provider_ref text default null,
  p_amount       numeric default null,
  p_currency     text default 'ILS',
  p_channel      public.delivery_method default null,
  p_record_count integer default null,
  p_note         text default null,
  p_created_by   uuid default null,
  p_occurred_at  timestamptz default now()
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

  insert into public.event_billing_events (
    event_id, to_status, provider, provider_ref, amount, currency,
    channel, record_count, note, created_by, occurred_at
  )
  values (
    p_event_id, p_to_status, p_provider, p_provider_ref, p_amount, p_currency,
    p_channel, p_record_count, p_note, p_created_by, p_occurred_at
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

grant execute on function public.apply_event_billing_transition(
  uuid, public.event_billing_status, text, text, numeric, text,
  public.delivery_method, integer, text, uuid, timestamptz
) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Guard: the derived column must match the pre-migration flag exactly
-- ---------------------------------------------------------------------------

do $$
declare
  v_mismatch integer;
begin
  select
    (select count(*) from (
       select id from public.events where can_create_schedules = true
       except select id from _pre_send_gate) gained)
    +
    (select count(*) from (
       select id from _pre_send_gate
       except select id from public.events where can_create_schedules = true) lost)
  into v_mismatch;

  if v_mismatch > 0 then
    raise exception 'event_billing_status backfill changed the send gate for % events', v_mismatch;
  end if;
end;
$$;

-- The Record Package (ADR 0027): every Event may reach its Paid Records plus its Bonus
-- Records, and no more. This migration stores the facts the package is derived from. It does
-- not gate anything yet - the sending gate ships last, after an Operator has entered packages
-- for today's comped Events by hand.
--
-- 1. Paid Records come only from recorded payments. A payment is an event_billing_events row
--    that carries records, a channel, an amount and a method, and always moves the Event to
--    `paid`. A top-up is just another such row, so the payments are the audit trail and
--    nothing edits a total directly. The log already had `record_count` and `channel`, but
--    `channel` was typed as a delivery method (whatsapp/sms), which cannot say "WhatsApp +
--    calls". It is retyped to the package channels the homepage sells.
-- 2. Bonus Records follow the homepage rule unless an Operator overrides them per Event:
--    events.bonus_records_override, null meaning "automatic".
-- 3. A Reached Guest Record (anything was sent to it) stays counted even after it is
--    deleted, or deleting and re-adding records would let one package reach any number of
--    guests. Deliveries and call logs cascade away with their guest, so Reached is kept in
--    event_reached_records, which deliberately has no foreign key to guests.
--
-- "Sent" means the provider accepted a message (sent_at is set on the delivery or one of its
-- attempts) or an Operator logged a call (call_logs.called_at). A send that failed before the
-- provider accepted it does not reach anyone and does not count.

-- ---------------------------------------------------------------------------
-- 1. Payments: channel + method on the billing log
-- ---------------------------------------------------------------------------

create type public.record_package_channel as enum ('sms', 'whatsapp', 'whatsapp_calls');

create type public.billing_payment_method as enum (
  'bank_transfer',
  'bit',
  'cash',
  'gift',
  'other'
);

-- Nothing has ever written a channel (no payment was recorded before this), but retyping a
-- populated column would silently reinterpret it, so refuse rather than guess.
do $$
begin
  if exists (select 1 from public.event_billing_events where channel is not null) then
    raise exception 'event_billing_events.channel already has values; map them before retyping';
  end if;
end;
$$;

-- The old function signature references the old channel type.
drop function public.apply_event_billing_transition(
  uuid, public.event_billing_status, text, text, numeric, text,
  public.delivery_method, integer, text, uuid, timestamptz
);

alter table public.event_billing_events
  alter column channel type public.record_package_channel using null;

alter table public.event_billing_events
  add column payment_method public.billing_payment_method null;

-- A payment is all-or-nothing: records, channel, amount and method together, and it always
-- lands on `paid`. A gift is a payment of exactly 0, so it can never be mistaken for money
-- received (Partner qualification relies on that, ADR 0020).
alter table public.event_billing_events
  add constraint event_billing_events_payment_complete check (
    (record_count is null and channel is null and payment_method is null)
    or (
      record_count is not null
      and channel is not null
      and payment_method is not null
      and amount is not null
      and to_status = 'paid'
    )
  ),
  add constraint event_billing_events_gift_is_free check (
    payment_method is distinct from 'gift' or amount = 0
  );

create index idx_event_billing_events_payments
  on public.event_billing_events(event_id)
  where record_count is not null;

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
  p_payment_method public.billing_payment_method default null
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
    channel, record_count, note, created_by, occurred_at, payment_method
  )
  values (
    p_event_id, p_to_status, p_provider, p_provider_ref, p_amount, p_currency,
    p_channel, p_record_count, p_note, p_created_by, p_occurred_at, p_payment_method
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
  public.record_package_channel, integer, text, uuid, timestamptz, public.billing_payment_method
) from public, anon, authenticated;

grant execute on function public.apply_event_billing_transition(
  uuid, public.event_billing_status, text, text, numeric, text,
  public.record_package_channel, integer, text, uuid, timestamptz, public.billing_payment_method
) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Bonus override
-- ---------------------------------------------------------------------------

alter table public.events
  add column bonus_records_override integer null,
  add constraint events_bonus_records_override_non_negative
    check (bonus_records_override is null or bonus_records_override >= 0);

comment on column public.events.bonus_records_override is
  'Operator-set Bonus Records for this Event; null means the automatic rule (ADR 0027).';

-- ---------------------------------------------------------------------------
-- 3. Reached Guest Records
-- ---------------------------------------------------------------------------

create table public.event_reached_records (
  event_id         uuid        not null references public.events(id) on delete cascade,
  -- No foreign key: the row must outlive the Guest Record it counts.
  guest_id         uuid        not null,
  first_reached_at timestamptz not null default now(),
  primary key (event_id, guest_id)
);

alter table public.event_reached_records enable row level security;

-- Read-only to the people who can see the event's package. Writes come only from the
-- triggers below (security definer).
create policy "event_reached_records_select" on public.event_reached_records
  for select to authenticated
  using (
    event_id in (select id from public.events where user_id = (select auth.uid()))
    or public.user_is_event_owner(event_id)
    or exists (
      select 1 from public.event_collaborators ec
      where ec.event_id = event_reached_records.event_id
        and ec.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.is_admin = true
    )
  );

create or replace function public.mark_guest_reached(p_guest_id uuid, p_at timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.event_reached_records (event_id, guest_id, first_reached_at)
  select g.event_id, g.id, coalesce(p_at, now())
  from public.guests g
  where g.id = p_guest_id and g.event_id is not null
  on conflict (event_id, guest_id) do nothing;
$$;

revoke execute on function public.mark_guest_reached(uuid, timestamptz)
  from public, anon, authenticated;

create or replace function public.mark_delivery_reached()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.mark_guest_reached(new.guest_id, new.sent_at);
  return null;
end;
$$;

create or replace function public.mark_attempt_reached()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.mark_guest_reached(d.guest_id, new.sent_at)
  from public.message_deliveries d
  where d.id = new.delivery_id;
  return null;
end;
$$;

create or replace function public.mark_call_reached()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.mark_guest_reached(new.guest_id, new.called_at);
  return null;
end;
$$;

-- The delivery and its attempts are both watched: attempts are the source of truth, but the
-- delivery row is what older send paths wrote directly. Marking is idempotent.
create trigger mark_delivery_reached
  after insert or update of sent_at on public.message_deliveries
  for each row when (new.sent_at is not null)
  execute function public.mark_delivery_reached();

create trigger mark_attempt_reached
  after insert or update of sent_at on public.message_delivery_attempts
  for each row when (new.sent_at is not null)
  execute function public.mark_attempt_reached();

create trigger mark_call_reached
  after insert or update of called_at on public.call_logs
  for each row when (new.called_at is not null)
  execute function public.mark_call_reached();

-- Backfill from everything already sent. Deleted guests took their deliveries with them, so
-- those are lost - the count starts from the records that still exist.
insert into public.event_reached_records (event_id, guest_id, first_reached_at)
select g.event_id, g.id, min(r.at)
from (
  select d.guest_id, d.sent_at as at
  from public.message_deliveries d
  where d.sent_at is not null
  union all
  select d.guest_id, a.sent_at
  from public.message_delivery_attempts a
  join public.message_deliveries d on d.id = a.delivery_id
  where a.sent_at is not null
  union all
  select c.guest_id, c.called_at
  from public.call_logs c
  where c.called_at is not null
) r
join public.guests g on g.id = r.guest_id
where g.event_id is not null
group by g.event_id, g.id
on conflict (event_id, guest_id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Guard: every guest that was ever sent to is now Reached
-- ---------------------------------------------------------------------------

do $$
declare
  v_missing integer;
begin
  select count(*) into v_missing
  from public.guests g
  where g.event_id is not null
    and (
      exists (select 1 from public.message_deliveries d
              where d.guest_id = g.id and d.sent_at is not null)
      or exists (select 1 from public.call_logs c
                 where c.guest_id = g.id and c.called_at is not null)
    )
    and not exists (
      select 1 from public.event_reached_records r
      where r.event_id = g.event_id and r.guest_id = g.id
    );

  if v_missing > 0 then
    raise exception 'event_reached_records backfill missed % reached guests', v_missing;
  end if;
end;
$$;

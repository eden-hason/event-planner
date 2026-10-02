-- HELD MIGRATION - not in supabase/migrations on purpose.
--
-- Move it there (renamed to a fresh YYYYMMDDHHMMSS_retire_comped.sql, later than every
-- applied migration) only after an Operator has recorded a payment or a gift for every
-- comped Event in production. Until then the guard in step 1 makes it fail, and a failing
-- migration in the folder blocks every push behind it. The code that stops offering
-- `comped` ships after this runs.
--
-- ---------------------------------------------------------------------------
--
-- `comped` retires (ADR 0027). It meant "Kululu granted sending without a payment", and it
-- carried no package: no records, no channel. Under the Record Package every Event that
-- sends needs a package, and the only way to get one is a recorded payment, so a free Event
-- is now a payment of ₪0 with method `gift`. `paid` changes meaning from "money was
-- received" (ADR 0021) to "a payment was recorded".
--
-- 1. Refuse while any comped Event has no recorded payment: moving it to `paid` would give
--    it sending with a package of zero.
-- 2. Move the remaining comped Events (all of which have a payment) to `paid`, logged.
-- 3. Relabel the historical 'comped' rows in the billing log as 'paid', with a note saying
--    what they were. They carry no records, so they add nothing to Paid Records and can
--    never pass for money received (Partner qualification reads payment rows, ADR 0020).
-- 4. Rebuild event_billing_status without 'comped', which means dropping and recreating
--    everything that names the type or the column: can_create_schedules (generated), the
--    enable-on-billing trigger, apply_event_billing_transition and the payment check.
-- 5. Recreate the two functions that compared against the literal 'comped'. Left alone
--    they would fail at run time on the missing enum label.
-- 6. Guard: the set of Events that can send is exactly what it was before.

-- Remember who could send, for the guard in step 6.
create temporary table _pre_retire_send_gate on commit drop as
  select id from public.events where can_create_schedules = true;

-- ---------------------------------------------------------------------------
-- 1. Guard: every comped Event already has a package
-- ---------------------------------------------------------------------------

do $$
declare
  v_missing integer;
  v_sample  text;
begin
  select count(*), string_agg(e.id::text, ', ' order by e.created_at)
    into v_missing, v_sample
  from public.events e
  where e.billing_status = 'comped'
    and not exists (
      select 1 from public.event_billing_events b
      where b.event_id = e.id and b.record_count is not null
    );

  if v_missing > 0 then
    raise exception
      'retire_comped: % comped events have no recorded payment. Record a payment or a gift for each first: %',
      v_missing, v_sample;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Remaining comped Events move to paid
-- ---------------------------------------------------------------------------
-- Normally none: recording a payment already moves an Event to paid. This catches one an
-- Operator set back to comped afterwards.

insert into public.event_billing_events (event_id, to_status, provider, note)
select id, 'paid', 'manual', 'comped retired, moved to paid (ADR 0027)'
from public.events
where billing_status = 'comped';

update public.events
  set billing_status = 'paid'
  where billing_status = 'comped';

-- ---------------------------------------------------------------------------
-- 3. Relabel the history
-- ---------------------------------------------------------------------------

update public.event_billing_events
  set to_status = 'paid',
      note = left('Legacy comp, before ADR 0027' || coalesce(' - ' || note, ''), 500)
  where to_status = 'comped';

-- ---------------------------------------------------------------------------
-- 4. Rebuild the enum
-- ---------------------------------------------------------------------------

drop trigger enable_schedules_on_billing_change on public.events;

alter table public.events drop column can_create_schedules;

drop function public.apply_event_billing_transition(
  uuid, public.event_billing_status, text, text, numeric, text,
  public.record_package_channel, integer, text, uuid, timestamptz, public.billing_payment_method
);

alter type public.event_billing_status rename to event_billing_status_old;

create type public.event_billing_status as enum (
  'free',
  'payment_pending',
  'paid',
  'canceled'
);

-- The payment check compares to_status with 'paid', so it is bound to the old type too.
alter table public.event_billing_events drop constraint event_billing_events_payment_complete;

alter table public.events alter column billing_status drop default;
alter table public.events
  alter column billing_status type public.event_billing_status
  using billing_status::text::public.event_billing_status;
alter table public.events alter column billing_status set default 'free';

alter table public.event_billing_events
  alter column to_status type public.event_billing_status
  using to_status::text::public.event_billing_status;

drop type public.event_billing_status_old;

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
  );

alter table public.events
  add column can_create_schedules boolean
  generated always as (billing_status = 'paid') stored;

create trigger enable_schedules_on_billing_change
  after update of billing_status on public.events
  for each row
  execute function public.enable_schedules_on_billing_change();

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
-- 5. Functions that named 'comped'
-- ---------------------------------------------------------------------------

create or replace function public.enable_schedules_on_billing_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.billing_status = 'paid'
     and old.billing_status <> 'paid' then
    -- Only ever 'disabled' -> null. A row the organiser cancelled stays
    -- cancelled, and one already sent or in flight is untouched (which is also
    -- what prevent_sent_schedule_mutation would insist on).
    update public.schedules
       set status = null
     where event_id = new.id
       and status = 'disabled';
  end if;
  return null;
end;
$function$;

create or replace function public.seed_event_default_schedules(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event      public.events;
  v_can_send   boolean;
  v_status     public.schedule_completion_status;
  v_inserted   integer;
begin
  select * into v_event from public.events where id = p_event_id;

  if not found
     or v_event.event_date is null
     or v_event.event_type_id is null then
    return 0;
  end if;

  -- Idempotent by design: this runs from an AFTER trigger that can fire on any
  -- update touching the two columns, and the whole point is that the set is
  -- seeded exactly once.
  if exists (select 1 from public.schedules where event_id = p_event_id) then
    return 0;
  end if;

  -- An Event that can already send when its date lands (paid first, dated
  -- later) is seeded active. Seeding it 'disabled' would leave it inert
  -- forever, because the enable trigger only fires on a billing change that
  -- has already happened.
  v_can_send := v_event.billing_status = 'paid';
  v_status := case when v_can_send then null else 'disabled'::public.schedule_completion_status end;

  -- The Due Time is one instant, authored as an Israel wall clock
  -- (docs/adr/0015-a-due-time-is-a-request-not-an-instruction.md). `event_date`
  -- is a calendar date pinned at 00:00 UTC, so the day is shifted in UTC and
  -- only the clock face is read in Israel - mirroring calculateScheduledDate in
  -- src/features/schedules/utils/index.ts.
  insert into public.schedules
    (event_id, schedule_type_id, template_id, scheduled_date, target_status, status)
  select
    p_event_id,
    d.schedule_type_id,
    d.template_id,
    ((((v_event.event_date at time zone 'UTC')::date + d.days_offset)
      + d.default_time) at time zone 'Asia/Jerusalem'),
    d.target_status,
    v_status
  from public.event_type_default_schedules d
  where d.event_type_id = v_event.event_type_id
  order by d.sort_order;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 6. Guard: nobody gained or lost sending
-- ---------------------------------------------------------------------------

do $$
declare
  v_mismatch integer;
begin
  select
    (select count(*) from (
       select id from public.events where can_create_schedules = true
       except select id from _pre_retire_send_gate) gained)
    +
    (select count(*) from (
       select id from _pre_retire_send_gate
       except select id from public.events where can_create_schedules = true) lost)
  into v_mismatch;

  if v_mismatch > 0 then
    raise exception 'retire_comped changed the send gate for % events', v_mismatch;
  end if;
end;
$$;

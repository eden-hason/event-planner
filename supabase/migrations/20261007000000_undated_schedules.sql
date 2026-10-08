-- Initial Invitations and Confirmations are seeded without a Due Time
-- (docs/adr/0029-kululu-does-not-guess-when-to-ask.md).
--
-- Every Schedule used to be seeded with a date computed from the Event date. For
-- the two Schedule types that open a conversation with Guests, that date was a
-- decision nobody had made: when an Event started paying, the whole set went
-- active at once, and an invitation already due went out without warning
-- (backlog 0014, 99 guests). When to invite and when to ask for an answer is the
-- Owner's call. The Event Reminder and the Thank You hang off the Event date
-- itself, and call plans are started by a person (ADR 0004), so those keep a
-- proposed date.
--
-- What changes:
--   1. `schedules.scheduled_date` may be null - an Undated Schedule. The
--      Dispatcher selects `scheduled_date <= now()`, which a null never
--      satisfies, so an undated row can never be sent.
--   2. `event_type_default_schedules.days_offset` may be null, meaning "the
--      Owner dates it". The rule lives in the catalog beside every other seed
--      default rather than as type keys in the seed function.
--   3. The seed writes a null Due Time for those catalog rows.
--   4. Backfill: outstanding 'disabled' Invitations and Confirmations lose their
--      seeded date. Their Owners could never edit them (editRejection refuses a
--      locked row), so the date was never theirs. Active rows on Events that can
--      send are left exactly as they are - those Owners may rely on them.

-- ---------------------------------------------------------------------------
-- 1. A Schedule may be undated
-- ---------------------------------------------------------------------------

alter table public.schedules
  alter column scheduled_date drop not null;

comment on column public.schedules.scheduled_date is
  'The Due Time: one instant, authored as an Israel wall clock (ADR 0015). Null for an Undated Schedule, which the Owner has not dated yet and which is never sent (ADR 0029).';

-- ---------------------------------------------------------------------------
-- 2. The catalog says which Schedules the Owner dates
-- ---------------------------------------------------------------------------

alter table public.event_type_default_schedules
  alter column days_offset drop not null;

comment on column public.event_type_default_schedules.days_offset is
  'Days from the Event date the seeded Schedule is due, negative before. Null means the Owner dates it: the Schedule is seeded undated (ADR 0029).';

update public.event_type_default_schedules d
   set days_offset = null
  from public.schedule_types st
 where st.id = d.schedule_type_id
   and st.key in ('initial_invitation', 'confirmation');

-- ---------------------------------------------------------------------------
-- 3. The seed
-- ---------------------------------------------------------------------------

-- Unchanged from 20261002000003_retire_comped.sql except for the Due Time
-- expression, which is null when the catalog row has no offset.
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
  -- src/features/schedules/utils/index.ts. A catalog row with no offset is one
  -- the Owner dates, so it is seeded undated (ADR 0029).
  insert into public.schedules
    (event_id, schedule_type_id, template_id, scheduled_date, target_status, status)
  select
    p_event_id,
    d.schedule_type_id,
    d.template_id,
    case
      when d.days_offset is null then null
      else ((((v_event.event_date at time zone 'UTC')::date + d.days_offset)
        + d.default_time) at time zone 'Asia/Jerusalem')
    end,
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
-- 4. Backfill: locked Invitations and Confirmations lose their seeded date
-- ---------------------------------------------------------------------------

-- Captured first so the guard can prove no active row was touched.
create temporary table _active_dated on commit drop as
  select s.id, s.scheduled_date
    from public.schedules s
   where s.status is null
      or s.status <> 'disabled';

-- Past-dated rows are included on purpose: a locked Invitation whose seeded date
-- has already passed is exactly the row that would go out the moment its Event
-- started paying.
update public.schedules s
   set scheduled_date = null
  from public.schedule_types st
 where st.id = s.schedule_type_id
   and st.key in ('initial_invitation', 'confirmation')
   and s.status = 'disabled'
   and s.dispatched_at is null
   and s.sent_at is null
   and s.scheduled_date is not null;

-- ---------------------------------------------------------------------------
-- Guard: the change landed where it was meant to, and nowhere else
-- ---------------------------------------------------------------------------

do $$
declare
  v_catalog_dated integer;
  v_locked_dated  integer;
  v_active_moved  integer;
begin
  select count(*) into v_catalog_dated
    from public.event_type_default_schedules d
    join public.schedule_types st on st.id = d.schedule_type_id
   where st.key in ('initial_invitation', 'confirmation')
     and d.days_offset is not null;

  select count(*) into v_locked_dated
    from public.schedules s
    join public.schedule_types st on st.id = s.schedule_type_id
   where st.key in ('initial_invitation', 'confirmation')
     and s.status = 'disabled'
     and s.dispatched_at is null
     and s.sent_at is null
     and s.scheduled_date is not null;

  select count(*) into v_active_moved
    from _active_dated a
    join public.schedules s on s.id = a.id
   where s.scheduled_date is distinct from a.scheduled_date;

  if v_catalog_dated > 0 then
    raise exception 'undated_schedules: % catalog Invitation/Confirmation row(s) still carry an offset', v_catalog_dated;
  end if;

  if v_locked_dated > 0 then
    raise exception 'undated_schedules: % locked Invitation/Confirmation row(s) still dated', v_locked_dated;
  end if;

  if v_active_moved > 0 then
    raise exception 'undated_schedules: % active schedule(s) had their Due Time changed', v_active_moved;
  end if;
end;
$$;

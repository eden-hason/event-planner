-- Every Event gets its outreach plan the moment it can be computed, instead of
-- waiting for the organiser to run a setup wizard.
--
-- The schedules page is being rebuilt as a timeline the organiser lands on
-- rather than a wizard they have to complete, and that only works if the rows
-- are already there. Before this migration the only writer of `schedules` was
-- `createSchedulesFromSelection`, reachable from exactly one place: the empty
-- state's wizard, whose call to action is hidden when the Event cannot send.
-- A free Event therefore had no schedules at all and nothing to render.
--
-- The seed cannot run at INSERT on `events`. An Event row is born the instant
-- the couple picks a type and collects its answers one screen at a time
-- (docs/adr/0003-events-exist-before-they-are-complete.md), so `event_date` and
-- `event_type_id` are both nullable and arrive later - while
-- `schedules.scheduled_date` is NOT NULL and every offset is relative to the
-- Event date. So the seed fires on the first moment both are known, whichever
-- writer supplies them.
--
-- Seeded rows are inert. `status = 'disabled'` (added in the previous
-- migration) means "created but never enabled", distinct from 'cancelled'
-- ("the organiser turned this off"). The Dispatcher selects `status is null`,
-- so nothing seeded can be sent, and an Event that later starts paying has its
-- whole set enabled in one move by the second trigger below.

-- ---------------------------------------------------------------------------
-- 1. The seed itself
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER because the writers differ: the organiser's own UPDATE on
-- `events` during onboarding, and the Back Office acting through the billing
-- RPC. Both must produce the same rows, and neither should have to satisfy
-- `schedules_insert` for a seed it did not ask for.
create or replace function public.seed_event_default_schedules(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
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
  v_can_send := v_event.billing_status in ('paid', 'comped');
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
$$;

comment on function public.seed_event_default_schedules(uuid) is
  'Inserts the Event type''s default outreach set for an Event that has a type and a date and no schedules yet. Returns the number of rows inserted, 0 when there was nothing to do. Idempotent.';

create or replace function public.seed_schedules_on_event_ready()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.event_date is not null and new.event_type_id is not null then
    perform public.seed_event_default_schedules(new.id);
  end if;
  return null;
end;
$$;

-- AFTER, not BEFORE: the seed reads the committed row and inserts into another
-- table, and must not run for an update that is about to fail.
create trigger seed_schedules_on_event_ready
  after insert or update of event_date, event_type_id on public.events
  for each row
  execute function public.seed_schedules_on_event_ready();

-- ---------------------------------------------------------------------------
-- 2. Paying enables the set
-- ---------------------------------------------------------------------------

-- Keyed on `billing_status` rather than on the generated `can_create_schedules`
-- so the rule is legible next to the enum it depends on. The two cannot
-- disagree - the column is GENERATED ALWAYS from exactly this test.
create or replace function public.enable_schedules_on_billing_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.billing_status in ('paid', 'comped')
     and old.billing_status not in ('paid', 'comped') then
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
$$;

create trigger enable_schedules_on_billing_change
  after update of billing_status on public.events
  for each row
  execute function public.enable_schedules_on_billing_change();

-- ---------------------------------------------------------------------------
-- 3. Backfill
-- ---------------------------------------------------------------------------

-- Without this, the new behaviour would depend on who happens to edit what:
-- an existing dated Event would stay empty until something touched its date.
create temporary table _seed_candidates on commit drop as
  select e.id,
         (select count(*)
            from public.event_type_default_schedules d
           where d.event_type_id = e.event_type_id) as expected
    from public.events e
   where e.event_date is not null
     and e.event_type_id is not null
     and not exists (select 1 from public.schedules s where s.event_id = e.id);

do $$
declare
  r record;
begin
  for r in select id from _seed_candidates loop
    perform public.seed_event_default_schedules(r.id);
  end loop;
end;
$$;

-- Guard: every candidate now holds exactly the number of rows its Event type
-- defines. A candidate whose type has no defaults (expected = 0) is left empty
-- on purpose and passes trivially.
do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
    from _seed_candidates c
   where c.expected <> (select count(*) from public.schedules s where s.event_id = c.id);

  if v_bad > 0 then
    raise exception
      'seed backfill did not land: % event(s) have a schedule count that does not match their event type defaults', v_bad;
  end if;
end;
$$;

comment on column public.schedules.status is
  'null = outstanding, ''disabled'' = seeded but never enabled (the Event cannot send yet), ''cancelled'' = the organiser turned it off, ''sent'' = dispatched, ''expired'' = the Dispatcher decided its moment had passed (ADR 0015).';

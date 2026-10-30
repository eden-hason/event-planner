-- An Event on the WhatsApp Plan stops carrying Call Rounds it did not buy.
--
-- Every wedding is seeded two phone_call Schedules (20260814000000) the moment
-- it has a type and a date (20260920000001). That is before the Owner pays, so
-- before anyone knows the Plan. Paying for WhatsApp (ADR 0034: no Call Rounds)
-- never took them away, and an Operator working the Back Office's call queue
-- saw a Call Round planned for an Event that had not paid for one. Two Events
-- on prod carried them; one was cleaned up by hand on 2026-10-30.
--
-- The rule: a Call Round is planned only while the Plan can include one. With
-- no payment yet it can (the Owner has not chosen, and the full plan is what is
-- on offer); on WhatsApp + calls it does; on WhatsApp (or the retired SMS) it
-- does not. Enforced where the rows are written, the same way the seed works:
--   1. a payment on a Plan without calls removes the Event's unworked Call
--      Rounds, whichever entry point records it,
--   2. the seed leaves them out for an Event that paid before it was dated, and
--   3. no Call Round is planned or started for such an Event afterwards.
--
-- Only a plan nobody has worked is removed. A phone_call Schedule with a
-- call_rounds row is a record of calls made (and call_rounds_schedule_id_fkey
-- is ON DELETE RESTRICT), so it stays.

-- --------------------------------------------------------------------------
-- 1. Which Plan the Event is on
-- --------------------------------------------------------------------------

-- The Plan is the channel of the latest payment that carries one (a Plan or a
-- Top-up, ADR 0042/0045), ordered as applyBillingTransition reads it.
create or replace function public.event_plan_includes_calls(p_event_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select b.channel = 'whatsapp_calls'
       from public.event_billing_events b
      where b.event_id = p_event_id
        and b.channel is not null
      order by b.occurred_at desc, b.created_at desc
      limit 1),
    true);
$$;

comment on function public.event_plan_includes_calls(uuid) is
  'False when the Event''s Plan (its latest payment''s channel) has no Call Rounds - WhatsApp or the retired SMS. True on WhatsApp + calls, and before any payment, when no Plan has been chosen.';

-- The same answer as a PostgREST computed field, so the app selects and filters
-- `plan_includes_calls` on `events` instead of keeping its own copy of the rule.
create or replace function public.plan_includes_calls(public.events)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.event_plan_includes_calls($1.id);
$$;

comment on function public.plan_includes_calls(public.events) is
  'events.plan_includes_calls for PostgREST - see event_plan_includes_calls.';

-- --------------------------------------------------------------------------
-- 2. A Plan without calls removes the unworked Call Rounds
-- --------------------------------------------------------------------------

create or replace function public.remove_unworked_call_schedules(p_event_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.schedules s
   where s.event_id = p_event_id
     and not public.schedule_type_is_message(s.schedule_type_id)
     and not exists (select 1 from public.call_rounds cr where cr.schedule_id = s.id);
$$;

comment on function public.remove_unworked_call_schedules(uuid) is
  'Deletes the Event''s phone_call Schedules that no call round has executed.';

revoke execute on function public.remove_unworked_call_schedules(uuid) from public, anon, authenticated;

create or replace function public.remove_call_schedules_on_plan_without_calls()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.event_plan_includes_calls(new.event_id) then
    perform public.remove_unworked_call_schedules(new.event_id);
  end if;
  return new;
end;
$$;

create trigger event_billing_events_remove_call_schedules
  after insert on public.event_billing_events
  for each row
  when (new.channel is not null)
  execute function public.remove_call_schedules_on_plan_without_calls();

-- --------------------------------------------------------------------------
-- 3. The seed leaves them out for an Event already on such a Plan
-- --------------------------------------------------------------------------

-- Unchanged from 20261007000000 but for the last condition of the insert.
create or replace function public.seed_event_default_schedules(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_event      public.events;
  v_can_send   boolean;
  v_calls      boolean;
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

  -- The same Event, paid first on a Plan without calls, gets no Call Rounds.
  v_calls := public.event_plan_includes_calls(p_event_id);

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
    and (v_calls or public.schedule_type_is_message(d.schedule_type_id))
  order by d.sort_order;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- --------------------------------------------------------------------------
-- 4. Nothing plans or starts a Call Round on such a Plan
-- --------------------------------------------------------------------------

-- The Back Office's call plan and Start actions refuse it with a reason; these
-- are the backstop for any other writer. A round already made stays (only new
-- rows are checked), and the seed and section 2 never trip them.
create or replace function public.refuse_call_without_calls()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.event_plan_includes_calls(new.event_id) then
    raise exception 'Event % is on a Plan without Call Rounds', new.event_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger refuse_call_schedule_without_calls
  before insert or update of schedule_type_id, event_id on public.schedules
  for each row
  when (not public.schedule_type_is_message(new.schedule_type_id))
  execute function public.refuse_call_without_calls();

create trigger refuse_call_round_without_calls
  before insert on public.call_rounds
  for each row execute function public.refuse_call_without_calls();

-- --------------------------------------------------------------------------
-- 5. Backfill
-- --------------------------------------------------------------------------

select public.remove_unworked_call_schedules(e.id)
  from public.events e
 where not public.event_plan_includes_calls(e.id);

-- Guard: no Event on a Plan without calls still has a Call Round nobody worked.
do $$
declare
  v_left integer;
begin
  select count(*) into v_left
    from public.schedules s
   where not public.schedule_type_is_message(s.schedule_type_id)
     and not public.event_plan_includes_calls(s.event_id)
     and not exists (select 1 from public.call_rounds cr where cr.schedule_id = s.id);

  if v_left > 0 then
    raise exception
      'call schedule backfill did not land: % unworked phone_call schedule(s) remain on Plans without calls', v_left;
  end if;
end;
$$;

-- A call round is the execution of a planned phone_call schedule.
--
-- Legacy rounds predate the plan, so this mints the plan each one would have
-- had and links it. Doing that here rather than tolerating orphans in the read
-- model is the point: the schedules page then has exactly one shape to render -
-- plan first, round optional - instead of a permanent "round without a plan"
-- branch. See docs/adr/0004-call-schedules-are-plans-call-rounds-are-executions.md.

alter table public.call_rounds
  add column schedule_id uuid references public.schedules (id) on delete restrict;

comment on column public.call_rounds.schedule_id is
  'The phone_call schedule this round executes. Nullable only as an escape hatch; the backfill below leaves no nulls behind, and nothing in the app creates a round without a plan.';

-- --------------------------------------------------------------------------
-- Backfill: every existing round gets the plan it would have had
-- --------------------------------------------------------------------------

-- Dated at the round's own created_at, and marked 'sent' because the round did
-- in fact start. target_status is 'pending' because that is what the old
-- startCallRound hardcoded when it snapshotted the guests.
do $$
declare
  v_type_id uuid;
  r record;
  v_schedule_id uuid;
begin
  select id into strict v_type_id
    from public.schedule_types
   where key = 'phone_call';

  for r in
    select id, event_id, created_at
      from public.call_rounds
     where schedule_id is null
     order by created_at
  loop
    insert into public.schedules
      (event_id, schedule_type_id, template_id, scheduled_date, scheduled_time,
       target_status, status, sent_at, created_at)
    values
      (r.event_id, v_type_id, null, r.created_at,
       to_char(r.created_at, 'HH24:MI')::time,
       'pending', 'sent', r.created_at, r.created_at)
    returning id into v_schedule_id;

    update public.call_rounds
       set schedule_id = v_schedule_id
     where id = r.id;
  end loop;
end $$;

-- Fail the migration rather than leave an orphan the read model would have to
-- tolerate forever.
do $$
declare
  v_orphans int;
begin
  select count(*) into v_orphans
    from public.call_rounds
   where schedule_id is null;

  if v_orphans > 0 then
    raise exception
      'link_call_rounds_to_schedules: % round(s) still without a plan', v_orphans;
  end if;
end $$;

-- --------------------------------------------------------------------------
-- One round per plan
-- --------------------------------------------------------------------------

-- This, not the sent-schedule freeze, is what stops two admins starting the
-- same planned round twice.
create unique index call_rounds_schedule_id_key
  on public.call_rounds (schedule_id)
  where schedule_id is not null;

-- --------------------------------------------------------------------------
-- round_number is superseded by the plan
-- --------------------------------------------------------------------------

-- Ordering and labelling now come from the linked schedule's scheduled_date.
-- Keep the historical data, stop requiring and stop generating it. Dropping the
-- unique constraint also removes the read-then-insert race two concurrent
-- admins could hit when allocating the next number.
alter table public.call_rounds alter column round_number drop not null;
alter table public.call_rounds drop constraint call_rounds_event_id_round_number_key;

comment on column public.call_rounds.round_number is
  'Deprecated. Ordering and labelling come from the linked schedule. Null on rounds created after 2026-08-14; retained for historical rows.';

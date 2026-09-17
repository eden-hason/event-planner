-- One Due Time per Schedule.
--
-- A Schedule held two answers to "when": scheduled_date, a real instant, and
-- scheduled_time, a timezone-naive clock face. Three places wrote them and only
-- one did it correctly - updateScheduledDate wrote the two columns
-- independently, and calculateScheduledDate applied the catalog's "10:00" with
-- setHours, which on Vercel means 10:00 UTC and so 13:00 in Israel. The two
-- disagree on most rows.
--
-- None of it mattered while a single daily cron sent everything at 10:05 Israel
-- regardless. A per-minute Dispatcher honours the instant, so the two columns
-- have to become one first.
--
-- scheduled_time is what a human typed, so it wins: scheduled_date is rewritten
-- to that wall clock on its own Israel calendar date, then the column is
-- dropped.
--
-- See docs/adr/0015.

-- --------------------------------------------------------------------------
-- Rewrite the instant from the wall clock the Operator actually entered
-- --------------------------------------------------------------------------
-- Only Schedules that can still send. A Schedule already marked sent or
-- cancelled is a historical record: its Due Time describes something that has
-- already happened, so correcting it changes nothing about what anyone
-- receives. The prevent_sent_schedule_mutation trigger (20260506000000)
-- rejects the update outright, and that trigger is what makes a send final -
-- working around it to tidy history would be the wrong trade entirely.
--
-- The date part of scheduled_date is read in Asia/Jerusalem, not UTC: a
-- Schedule stored at 2026-10-05T22:00Z is the 6th in Israel, and that is the
-- day the Owner picked.
--
-- Plain temp table, dropped explicitly below: ON COMMIT DROP would vanish
-- mid-file if the runner does not wrap the migration in one transaction.
create temporary table _due_time_before as
select id,
       scheduled_time,
       ((scheduled_date at time zone 'Asia/Jerusalem')::date + scheduled_time)
         at time zone 'Asia/Jerusalem' as expected
from public.schedules
where scheduled_time is not null
  and status is null;

update public.schedules s
set scheduled_date = b.expected
from _due_time_before b
where b.id = s.id
  and s.scheduled_date is distinct from b.expected;

-- --------------------------------------------------------------------------
-- Guard: every rewritten row now reads back as the wall clock it was given
-- --------------------------------------------------------------------------
-- Scoped to the same rows the update touched. A sent Schedule keeps whatever
-- instant it had, which is the point above, so including it here would fail a
-- correct migration.

do $$
declare
  v_wrong bigint;
begin
  select count(*) into v_wrong
  from public.schedules s
  join _due_time_before b on b.id = s.id
  where (s.scheduled_date at time zone 'Asia/Jerusalem')::time <> b.scheduled_time;

  if v_wrong > 0 then
    raise exception
      'one_due_time: % schedule(s) do not read back as their authored wall clock', v_wrong;
  end if;
end $$;

drop table _due_time_before;

alter table public.schedules drop column scheduled_time;

comment on column public.schedules.scheduled_date is
  'The Schedule''s Due Time: a single instant, authored as Israel wall clock and stored as UTC. A request, not an instruction - the Dispatcher holds it outside the Send Window and expires it when too late. See docs/adr/0015.';

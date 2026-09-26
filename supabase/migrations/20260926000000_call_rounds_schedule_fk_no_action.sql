-- Deleting an event that has a call round failed.
--
-- call_rounds.schedule_id was `on delete restrict`, and restrict is checked the
-- moment the schedule row goes, not at the end of the statement. Deleting an
-- event cascades to schedules and to call_rounds, and the schedules cascade
-- fires first (its constraint is older), so the phone_call schedule was
-- removed while its round still pointed at it and the whole delete rolled back.
--
-- `no action` is checked at the end of the statement, by which point the event
-- cascade has removed the round as well. Deleting a schedule on its own is
-- still refused while a round executes it, which is what restrict was for
-- (docs/adr/0004-call-schedules-are-plans-call-rounds-are-executions.md).

alter table public.call_rounds
  drop constraint call_rounds_schedule_id_fkey;

alter table public.call_rounds
  add constraint call_rounds_schedule_id_fkey
  foreign key (schedule_id) references public.schedules (id) on delete no action;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'call_rounds_schedule_id_fkey'
       and conrelid = 'public.call_rounds'::regclass
       and confdeltype = 'a'
  ) then
    raise exception 'call_rounds_schedule_id_fkey is not on delete no action';
  end if;
end $$;

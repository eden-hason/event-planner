-- 'guest_will_update' is retired. The Back Office stopped offering it some time
-- ago, only a handful of calls ever ended that way, and the Owner's results now
-- show three outcomes. Keeping a fourth value that nothing can record would
-- leave every reader handling a case that cannot happen any more.
--
-- The calls that did end that way become 'no_answer': like it, they never moved
-- the guest's rsvp_status, so the RSVP each guest has today is untouched. The
-- caller's note, if any, stays on the call log.
--
-- call_logs.outcome is the only column of this type, and no function, policy or
-- default refers to it, so the enum is rebuilt the same way
-- 20260530000003_remove_call_back_wrong_number_outcomes.sql did.
update call_logs set outcome = 'no_answer' where outcome = 'guest_will_update';

alter type call_outcome rename to call_outcome_old;
create type call_outcome as enum ('no_answer', 'confirmed', 'declined');
alter table call_logs alter column outcome type call_outcome using outcome::text::call_outcome;
drop type call_outcome_old;

do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'call_outcome' and e.enumlabel = 'guest_will_update'
  ) then
    raise exception 'call_outcome still has guest_will_update';
  end if;
end $$;

-- Reassign any existing rows with removed outcomes before altering the enum
update call_logs set outcome = 'no_answer' where outcome in ('call_back', 'wrong_number');

-- Recreate the enum without 'call_back' and 'wrong_number'
alter type call_outcome rename to call_outcome_old;
create type call_outcome as enum ('no_answer', 'confirmed', 'declined');
alter table call_logs alter column outcome type call_outcome using outcome::text::call_outcome;
drop type call_outcome_old;

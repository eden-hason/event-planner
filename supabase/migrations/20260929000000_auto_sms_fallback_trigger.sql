-- The automatic SMS Fallback (ADR 0016) and the Back Office button used to
-- record their attempts identically, as triggered_by = 'fallback', so nobody
-- could tell afterwards whether an Operator or the sweeper had sent an SMS.
-- The sweeper now records 'fallback_auto'.
--
-- The one-fallback-per-delivery index is what stops the button and the sweeper
-- both sending when they run at the same moment: each claims a delivery by
-- inserting its attempt first. It must cover both values, or the two paths
-- would stop colliding and a guest could get two SMS.

alter table public.message_delivery_attempts
  drop constraint message_delivery_attempts_triggered_by_check;

alter table public.message_delivery_attempts
  add constraint message_delivery_attempts_triggered_by_check
    check (triggered_by in ('scheduled', 'manual', 'fallback', 'fallback_auto'));

drop index public.message_delivery_attempts_one_fallback_key;

create unique index message_delivery_attempts_one_fallback_key
  on public.message_delivery_attempts (delivery_id)
  where triggered_by in ('fallback', 'fallback_auto');

comment on column public.message_delivery_attempts.triggered_by is
  'Who started the attempt: scheduled, manual, or an SMS Fallback - fallback from the Back Office button, fallback_auto from the sweeper.';

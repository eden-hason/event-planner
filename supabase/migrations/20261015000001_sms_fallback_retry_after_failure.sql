-- An Operator may now retry the SMS Fallback for a Delivery whose SMS failed
-- (ADR 0038). The SMS poll learns after the fact that an SMS never arrived, and
-- until now that guest was out of every remedy: the classifier skipped any
-- Delivery with an SMS attempt, and this index allowed one fallback attempt per
-- Delivery for ever.
--
-- The index exists so the Back Office button and the sweeper cannot both send
-- at once: each claims a Delivery by inserting a pending attempt first. That
-- only needs one *live* fallback at a time. A failed one has finished and holds
-- nothing, so it leaves the index and a retry can claim the Delivery again -
-- while two presses at the same moment still collide on the pending row.

drop index public.message_delivery_attempts_one_fallback_key;

create unique index message_delivery_attempts_one_fallback_key
  on public.message_delivery_attempts (delivery_id)
  where triggered_by in ('fallback', 'fallback_auto')
    and status <> 'failed';

-- Guard: the index is back, unique, and leaves failed attempts out.
do $$
declare
  v_def text;
begin
  select indexdef into v_def
  from pg_indexes
  where schemaname = 'public'
    and indexname = 'message_delivery_attempts_one_fallback_key';

  if v_def is null or v_def not ilike 'create unique index%' or v_def not ilike '%failed%' then
    raise exception 'sms_fallback_retry_after_failure: one-fallback index is not as intended: %', v_def;
  end if;
end $$;

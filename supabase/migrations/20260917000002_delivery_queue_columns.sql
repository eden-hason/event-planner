-- message_deliveries becomes the send queue.
--
-- There is no second queue table. A Delivery already exists before its message
-- goes out - the RSVP token has to be inside the message - and it is already
-- one row per Guest per Schedule, so a Delivery waiting to be sent is precisely
-- a Delivery with no attempt yet. Adding a parallel queue would mean a second
-- row per Guest that has to agree with the one owning the token.
--
-- next_attempt_at is the whole of "queued": set by the Dispatcher at dispatch,
-- by the Worker when a transient rejection earns a retry, and by an Operator's
-- resend. Nulled the moment the Delivery is claimed. One column, so first
-- dispatch, retry and resend are the same mechanism rather than three rules.
-- It is scheduling, not state: nothing here writes the Delivery's status, which
-- is still rolled up from its attempts (ADR 0011).
--
-- send_payload is the Dispatcher/Worker seam. The Dispatcher renders the entire
-- message - parameters resolved, table variant chosen, RSVP link embedded - and
-- the Worker posts exactly those bytes without knowing what they mean.
--
-- See docs/adr/0013 and docs/adr/0014.

alter table public.message_deliveries
  add column next_attempt_at timestamptz null,
  add column send_payload    jsonb       null;

comment on column public.message_deliveries.next_attempt_at is
  'When this Delivery should next be sent, or null when it is not queued. Set by the Dispatcher, by a retry, or by an Operator resend; cleared by claim_delivery_batch. Scheduling only - never the Delivery''s status.';

comment on column public.message_deliveries.send_payload is
  'The fully rendered message the Worker will post, written at dispatch. Carries the Guest''s phone number and name, so the Worker nulls it in the same update that writes a terminal attempt result: it exists only while a Delivery is in flight, which bounds both the column and the personal data in it.';

-- The claim query lives on this index. Partial because the queue is a tiny
-- fraction of the table at any moment - a few hundred rows during a send, zero
-- the rest of the time - and a partial index over the rest of a growing table
-- keeps the claim's cost proportional to what is actually waiting.
create index message_deliveries_queued_idx
  on public.message_deliveries (next_attempt_at)
  where next_attempt_at is not null;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'message_deliveries'
      and column_name in ('next_attempt_at', 'send_payload')
    group by table_name having count(*) = 2
  ) then
    raise exception 'delivery_queue_columns: next_attempt_at and send_payload were not both added';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'message_deliveries_queued_idx'
  ) then
    raise exception 'delivery_queue_columns: the queue index was not created';
  end if;
end $$;

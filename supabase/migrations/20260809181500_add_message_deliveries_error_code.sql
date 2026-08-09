-- buildDeliveryRecord() (src/features/schedules/utils/send-helpers.ts) has
-- always written an `error_code` field on every message_deliveries
-- upsert, and the app schema (MessageDeliveryDbSchema) has always expected
-- to read one back - but the column itself was never created. PostgREST
-- rejects writes referencing an unknown column, so every delivery upsert
-- since this code was introduced failed silently (the error was caught and
-- only console.error'd, never surfaced), regardless of RLS or trigger
-- method. This adds the column the app has been assuming exists all along.
alter table public.message_deliveries
  add column error_code integer;

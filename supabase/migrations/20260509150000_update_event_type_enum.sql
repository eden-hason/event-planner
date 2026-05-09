-- Migrate existing rows with deprecated event types to 'wedding'
UPDATE events
SET event_type = 'wedding'
WHERE event_type IN ('birthday', 'corporate', 'other');

-- Replace the old unused enum with the new set of values
DROP TYPE IF EXISTS "public"."event_type";
CREATE TYPE "public"."event_type" AS ENUM ('wedding', 'henna', 'bar_mitzva', 'bat_mitzva');

-- Enforce valid values at the DB level
ALTER TABLE events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('wedding', 'henna', 'bar_mitzva', 'bat_mitzva'));

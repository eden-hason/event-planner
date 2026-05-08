ALTER TABLE "public"."schedules"
  ADD COLUMN "scheduled_time" TEXT;

UPDATE "public"."schedules"
  SET scheduled_time = to_char(scheduled_date AT TIME ZONE 'UTC', 'HH24:MI');

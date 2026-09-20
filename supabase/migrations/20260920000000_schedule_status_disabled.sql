-- A Schedule that was created but never enabled.
--
-- Every Event is about to have its outreach plan seeded the moment a type and a
-- date exist (see the next migration), including Events that cannot send yet.
-- Those rows need a resting state that is not 'cancelled': nobody cancelled
-- them, they have simply never been switched on, and the difference is what the
-- organiser reads off the timeline - "off" is a choice they made, "locked" is
-- one they have not been offered.
--
-- The Dispatcher selects `status is null`, so a 'disabled' Schedule is inert
-- without the cron needing to learn the value.
--
-- Alone in its own migration because Postgres refuses to use an enum value in
-- the same transaction that adds it, and the next migration's backfill writes
-- this one.

alter type public.schedule_completion_status add value if not exists 'disabled';

-- A Guest's answer to the optional transportation question.
--
-- An Owner can switch on a transportation question for the Event
-- (events.guests_experience.ask_transportation, a key in the existing jsonb, so
-- no migration for the setting). A confirming Guest is then asked, in the
-- Confirmation Conversation and on the RSVP page, whether they want
-- transportation to the Event: yes or no. The answer belongs to the Guest
-- Record, beside amount and meal_counts.
--
-- Nullable on purpose, with no default: null is "not answered", which is not
-- the same as an explicit "no" - the Owner's summary counts the two apart. Every
-- existing record starts unanswered, so there is nothing to backfill, and
-- adding a nullable column without a default does not rewrite the table.
--
-- Additive only: the running app selects guests with `*` and ignores the new
-- column, so pushing this before the matching deploy breaks nothing.

alter table public.guests
  add column needs_transportation boolean;

comment on column public.guests.needs_transportation is
  'Answer to the Event''s optional transportation question: true = yes, false = no, null = not answered.';

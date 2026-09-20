# Changing the Event date leaves the whole outreach plan behind

Status: open

## The problem

Every Schedule's Due Time is computed from `events.event_date` once - at seed time - and
then stands on its own. Move the wedding two weeks later and all seven Schedules stay
pointed at the old date. The invitation still goes out on the original day, the "day of"
reminder arrives a fortnight early, and the Dispatcher expires them one by one as the old
date passes (`expiryReason`, ADR 0015).

Nothing warns the organiser, and nothing on the timeline says the plan no longer matches
the Event it belongs to.

This was a deliberate call when the timeline was built: the seed trigger and the billing
enable trigger were both worth having, a third trigger that rewrites dates was not, and
the safest default was to touch nothing the organiser had not asked to be touched.

## What is known

- The seed is a trigger on `events` (`seed_schedules_on_event_ready`) that fires once and
  is idempotent - it returns early when the Event already has Schedules. So a date change
  today does nothing at all, rather than doing something wrong.
- The arithmetic already exists twice over: `seed_event_default_schedules` does it in SQL,
  `offsetDays`/`calculateScheduledDate` do it in TypeScript, and both are tested.
- A shift must skip `sent`, `expired` and dispatched rows: `prevent_sent_schedule_mutation`
  raises on any update to a row with `status = 'sent'` or `dispatched_at` set, so a naive
  `update ... where event_id = ...` would fail the whole transaction.
- The date is now editable from `DateTimeCard` on the event details page, which before this
  change it was not. So the scenario went from "essentially unreachable outside onboarding"
  to "one tap away".

## Options already considered

- **Shift every unsent Schedule by the same delta.** Preserves whatever the organiser had
  adjusted by hand, and keeps each Schedule's relation to the Event. The option that was
  recommended and not taken.
- **Recompute unsent Schedules from the catalog offsets.** Simpler rule, but it silently
  discards manual adjustments - and adjusting a date is one of the few things this page
  lets an organiser do.
- **Leave the dates and flag the mismatch on the timeline.** No surprise writes, but it
  leaves the organiser to fix seven rows by hand, which is the work the seed exists to
  avoid.

## Still unknown

- How often an Event date actually changes after schedules exist. Worth measuring before
  building a trigger: if it is rare, a warning banner may be the whole fix.
- Whether a shift should also move Schedules the organiser cancelled. They keep their
  relative position under a delta shift, which seems right, but it has not been thought
  through.

## Done means

Changing an Event's date either moves its outstanding Schedules with it, or tells the
organiser plainly that it has not, with the one action that would.

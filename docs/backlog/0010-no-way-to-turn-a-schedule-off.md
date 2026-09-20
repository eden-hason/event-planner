# 0010 - There is no way to turn a Schedule off

Status: open

## The problem

The Schedules screen was rebuilt to match the Schedules Mobile design
(`feat/schedules-mobile-timeline`). The design has no status card, and the
decision was to follow it: the switch that cancelled and re-enabled a Schedule
is gone from the UI. Nothing replaced it.

## What is true today

- `updateScheduleStatus(scheduleId, enabled)` still exists in
  `src/features/schedules/actions/schedules.ts`, and still enforces
  `editRejection` (sent and locked Schedules cannot change). Nothing calls it.
- A Schedule with `status = 'cancelled'` reads as "off" on the timeline and is
  read-only in its detail: its date and note cannot be edited, and it cannot be
  turned back on. Only rows cancelled before the change, or by the Back Office,
  can be in that state.
- An organiser who does not want a given reminder has no way to skip it. The
  audience filter (`target_status`) does not cover this either - it narrows who
  gets a message, it cannot switch the message off.

## Ruled out

- Keeping the old status card: the design deliberately has none, and it was a
  card of its own for one switch.
- A slim switch row under the settings, or an overflow menu in the header, were
  offered and declined for this change. Both remain the obvious ways to bring
  the control back if it is missed.

## Done means

An Owner can turn an editable Schedule off and back on from its detail, the
timeline shows the "off" chip for it, and the control follows the same lock
rules as the other fields (absent when the plan is locked or the Schedule has
gone out). The action already does the server-side half.

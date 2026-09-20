# 0011 - The Owner cannot reschedule a call round

Status: open

## The problem

The Call Rounds design (Claude Design project 20592c22, `Call Rounds.dc.html`,
frame 1b) shows a planned round with an editable date and time, a green
"can be changed" badge, and a primary "save the date" button. The note under it
says the date can move until the round starts, after which it locks.

That is not built. The call pane is read-only in every state, because
ADR 0004 makes the plan the Back Office's and enforces it with a restrictive
RLS policy on `schedules`, and the handoff for the design said not to design a
reschedule control. The design and the ADR disagree, and the decision taken when
the pane was built was to follow the ADR: no migration, fields drawn as plain
text, no Save.

## What building it would take

- A migration through `npx supabase db push`, never the Supabase MCP: an Owner
  UPDATE policy on `schedules` limited to `phone_call` rows that have no
  `call_rounds` row yet, and a guard (trigger or column privilege) so only
  `scheduled_date` can change.
- An amendment to ADR 0004, which currently says the Owner is view-only.
- The message pane's settings form, sticky Save and Send Window hour picker
  reused for calls - though a call's hours are the team's working hours, not the
  message Send Window, so the picker's range is a separate question.
- A rule for what a valid new date is (before the Event, not in the past) and
  what happens to a plan that was seeded from the Event date when that date
  later moves (see 0008).

## Ruled out

- Making the fields look editable and rejecting the write: the RLS policy would
  refuse it, and an input that fails on save is worse than no input.

## Done means

An Owner can move the date and time of a call round that has not started, the
control disappears the moment the Operator presses Start, and ADR 0004 says why.

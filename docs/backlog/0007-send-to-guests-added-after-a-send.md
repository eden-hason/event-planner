# A guest added after a Schedule went out never receives it

Status: open

## The problem

A Schedule's audience is resolved once, at dispatch. A guest added to the list the
following day is simply not in it, and nothing on the schedules page says so. For an
Initial Invitation this is the common case, not the edge case: the list is still being
assembled while the first invitation goes out.

The organiser's only recourse today is the Back Office quick-send, which they cannot
reach.

## What is known

- `message_deliveries` holds one row per guest record the Schedule actually targeted, so
  "who was in the audience at send time" is already recorded and does not need inferring.
  The gap is `filterGuestsByTarget(guests, targetStatus)` minus the guests that table
  names for this Schedule.
- The send engine already knows how to send to a chosen subset of a Schedule's audience:
  `sendSelectedDeliveriesAdmin` (`features/schedules/actions/manual-send.ts`) takes guest
  ids and is gated on `events.can_create_schedules`. A Owner-facing path would be a second
  entry point to the same service, not new send machinery.
- The Schedule row itself is frozen once sent: `prevent_sent_schedule_mutation` raises on
  any update to a row with `status = 'sent'` or `dispatched_at` set. So a top-up send must
  create Deliveries without touching the Schedule.
- The mobile design this was cut from (Claude Design project `20592c22`, `Schedules
  Mobile.dc.html`, board `1f`) draws it as a secondary action in the detail footer:
  `שליחה לאורחים שנוספו מאז (4)`.

## Options already considered

- **A top-up action on the sent Schedule.** Closest to the design. Needs a decision on
  what the button does when the organiser presses it twice, and on whether a guest who was
  targeted but `not_sent` (no phone at the time, phone added since) counts as "added since".
- **Fold it into the next Schedule instead.** A guest who missed the invitation still gets
  the first reminder, which already targets `pending`. Costs nothing to build and is what
  happens today - but the reminder's copy assumes the guest has already been invited.
- **Re-resolve the audience continuously until the send window closes.** Removes the
  concept of "added since" entirely, but a Schedule's audience would stop being a fact and
  the results tab would have a moving denominator.

## Still unknown

- How many guests are actually added after the first invitation, and how late. Measure
  before choosing between the top-up action and doing nothing.
- Whether a top-up should be manual or automatic. An automatic one is a second, silent
  send against a Schedule the organiser believes is finished.

## Done means

An Owner can see that N guests joined after a Schedule was sent, and either reach them
deliberately or be told plainly which later Schedule will.

# A guest added after a Schedule went out never receives it

Status: in progress - the Back Office half is built; the Owner-facing half is open

## The problem

A Schedule's audience is resolved once, at dispatch. A guest added to the list the
following day is simply not in it, and nothing on the schedules page says so. For an
Initial Invitation this is the common case, not the edge case: the list is still being
assembled while the first invitation goes out.

The organiser cannot reach them on their own. An Operator can, from the Back Office (below).

## Built: the Back Office late-guest send

The event workspace's outreach band has a "שליחה לאורחים שנוספו" dialog: pick a sent
message Schedule, tick up to ten guest records, confirm, send. It answers the "Options
already considered" questions this way, which an Owner-facing version can reuse or
revisit:

- **Only a Schedule that went out** (`status = 'sent'` or `dispatched_at` set). A planned
  one will include everyone on the list when it sends, so a manual send now would be the
  duplicate. Cancelled, expired and disabled Schedules are refused, and so is any
  Schedule but the Thank You once the Event day has ended - the Dispatcher's expiry rule.
- **Offered:** audience guests (same `target_status` predicate as the engine) with no
  Delivery, a `not_sent` Delivery whose cause is gone, or a reservation nothing ever
  attempted. Guests added after the send are badged and listed first.
- **Not offered:** guests already reached (`sent`/`delivered`/`read`), guests mid-send
  (queued, or an attempt still `pending`), failures (they have their own resend on the
  timeline row, beside the error), records outside the Record Package, and records with
  no usable phone for the channel. The last three are listed with the reason.
- **Pressing twice is safe:** eligibility is recomputed in the Server Action before
  sending, so a picked guest reached in between is dropped and counted, and the send
  itself is `sendSelectedDeliveries` - same renderer, package gate and scoped claim.

Code: `features/admin/utils/late-guests.ts` (the rules, tested),
`features/admin/services/late-guest-plan.ts`, `features/admin/actions/late-guests.ts`,
`features/admin/components/late-guests-dialog.tsx`.

## What is known

- `message_deliveries` holds one row per guest record the Schedule actually targeted, so
  "who was in the audience at send time" is already recorded and does not need inferring.
  The gap is `filterGuestsByTarget(guests, targetStatus)` minus the guests that table
  names for this Schedule.
- The send engine already knows how to send to a chosen subset of a Schedule's audience:
  `sendSelectedDeliveries` (`features/schedules/services/manual-send.ts`) takes guest ids,
  and the Back Office late-guest send is built on it. An Owner-facing path would be another
  entry point to the same service and the same `buildLateGuestPlan`, not new send
  machinery - but it would sit behind the ten-record cap (ADR 0013), which suits an
  Operator topping up a few guests and not an Owner who imported 80 the day after.
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

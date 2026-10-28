# A Confirmation's audience does not follow plan order

Status: open

## The problem

An Event's Confirmations are told apart in two ways, and only one of them keeps up when
a Due Time moves.

- **The audience is stored on the row.** `schedules.target_status` is set when the plan is
  seeded (the first Confirmation to every guest, the next ones to `pending`, per
  `20260921000000_first_outreach_targets_all_guests.sql`). It is set again only by the Back
  Office's invitation-to-Confirmation conversion (ADR 0036). The Owner cannot edit it, and
  nothing changes it when a Due Time changes.
- **The role is worked out from the dates.** The number on the card ("Confirmation 1 of
  3", `numberPlan`) and whether a Confirmation sends the opening ask or the "we haven't
  heard from you" follow-up copy (`isFollowUpConfirmation`) both come from
  `comparePlanOrder`, that is, from the Due Times as they stand now.

So when a Due Time edit moves the to-every-guest Confirmation behind a `pending` one, the
two disagree, and nothing tells the Owner or the Operator:

- The new **first** Confirmation sends the opening ask, but only to guests who have not
  answered. Anyone who answered early (the RSVP link, a call, a text) never gets the
  opening ask.
- The **later** Confirmation sends the follow-up copy, "we haven't heard from you", to
  **every guest**, including everyone who has already confirmed or declined. This is the
  part guests notice.

On the Owner's schedules page, Confirmation 1 reads "מי שלא ענה" (not responded) and
Confirmation 2 reads "כל האורחים" (all guests), which is the wrong way round.

## Evidence

**Event `e23df661-5c7c-4d8b-a877-ac8f17cf8c37` (production, reported 2026-10-28).** Three
rows were seeded on 2026-10-26: the Initial Invitation `7585fe78` (all guests), the first
Confirmation `205087a8` (all guests) and the follow-up `6ddbe5a1` (`pending`). From the
`edge_logs` PATCH and RPC requests (UTC):

| When | Who | What |
|---|---|---|
| 10-27 17:40-17:42 | Owner | dated all three. `205087a8` got 3.11, and that date was never changed again |
| 10-27 17:47 | Operator | `admin_convert_invitation_to_confirmation` on `7585fe78`. It returned `1`: `205087a8` was narrowed from all guests to `pending` |
| 10-27 17:57, 18:46 | Owner | edited the text on all three, no dates |
| 10-28 06:49 | Owner | moved `7585fe78` to 8.11 (two saves) and `6ddbe5a1` to 12.11 |

The end state was 3.11 `pending`, 8.11 all guests, 12.11 `pending`. The 8.11 one would
have sent the follow-up copy to every guest. The edge logs keep which row changed and
when, but not the values. So it is unknown whether `7585fe78` was already dated after 3.11
when it was converted (the case the convert dialog warns about) or whether the Owner's
06:49 move swapped them. Either path ends in the same state. The data was fixed by hand on
2026-10-28: the two rows' audiences were swapped, and the Due Times were left as the
Owner set them.

**A sweep on 2026-10-28** looked for an unsent `pending` Confirmation due before an unsent
to-every-guest Confirmation of the same Event. It found one more Event, not yet touched:

- Event `40abe63c-8f00-4e44-8a3a-3b5e6e7e2e97` (paid, Event on 2026-11-19):
  `db3c7470` is `pending` on 8.11 and `2623c22e` goes to all guests on 15.11. The Event has
  no Initial Invitation, so a conversion is likely. Both rows were last updated on
  2026-10-14, which is past log retention, so how it got there is not known.

## What is known about the moving parts

- **How the order is decided.** `comparePlanOrder` (`src/features/schedules/utils/timeline.ts`)
  puts dated rows by Due Time, then Undated ones (ADR 0029). Among Undated Confirmations it
  puts the to-every-guest row before `pending`. So before anything is dated, the order and
  the audience agree. They can only drift apart once Due Times are set.
- **Where each one is read.**
  - The audience is read by `filterGuestsByTarget` in `services/render-deliveries.ts`,
    when the send happens. A `pending` audience is evaluated on the day of the send.
  - Follow-up copy is decided by `isFollowUpConfirmation`, which the page calls for the
    preview and `services/confirmation-round.ts` calls for the send. It ignores `expired`
    siblings.
- **Who can move a Due Time.**
  - The Owner can, through `updateScheduledDate` in `actions/schedules.ts`, which sends a
    bare `scheduled_date` PATCH.
  - The Operator can, from the Back Office outreach timeline.
  - Changing the Event date is a separate path that leaves the plan behind
    (backlog 0008).
- **What already warns about it.** Only the convert dialog
  (`src/features/admin/components/schedule-controls.tsx`, `convertsToFollowUp`), and only
  at the moment of conversion. A Due Time edit made afterwards, from either side, has no
  check.
- **Audience and copy are meant to go together.** Both
  `20260921000000_first_outreach_targets_all_guests.sql` and ADR 0036 tie "goes to every
  guest" to "the opening ask". Nothing enforces it once the plan exists.
- **Sent rows are frozen.** `prevent_sent_schedule_mutation` refuses changes to a
  dispatched or sent row. Once the first round has gone out, a later Due Time edit can
  no longer change which round came first.

## Open questions

- Is a Confirmation's audience a property of the row, or of its place in the plan? The
  code treats it as the first, and the copy and the seed assume the second.
- Can an Owner or Operator ever deliberately want a to-every-guest Confirmation after a
  `pending` one, or two to-every-guest Confirmations? If so, is it allowed, and how does
  the copy read?
- Calls (`phone_call`) and the Event Reminder also carry a `target_status`. Do they have
  the same kind of mismatch, or is this only about Confirmations?
- What happens to the second Event above, and to any others that show up, before a fix
  ships?

## Done means

- After any change to the plan's Due Times, from the Owner's page or the Back Office, a
  Confirmation never sends the follow-up copy to every guest, and never sends the opening
  ask to non-responders alone, unless that was a deliberate choice.
- The Owner's schedules page shows each Confirmation's real audience next to its real
  place in the plan.
- The decision is written up in `docs/adr/`, and ADR 0036's "Consequences" section points
  to it.

# An existing Event cannot move onto the new message plan

Status: in progress (the move for an Event with nothing sent was decided on 2026-11-12, see ADR 0053; an Event that has already sent still cannot move)
Area: schedules / outreach
Related: `docs/adr/0053-the-plan-is-invitation-follow-ups-reminder-thank-you.md`,
`docs/adr/0054-a-personal-message-is-the-owners-whole-message.md`

## The problem

ADR 0053 seeds the new plan (an asking Invitation, two Follow-ups, one Reminder, a Thank You,
Kululu Wording or a whole-message Personal Message) on new Events only. An Event created
before launch finishes on the old catalog. If its Owner asks for the new Personal Message,
or an Operator wants one system, there is no way to move it.

## Evidence

On 2026-11-07, Events still ahead held these unsent Schedules (active + disabled):
2 + 29 Initial Invitations, 35 + 61 Confirmations, 13 + 30 Event Reminders,
13 + 30 Thank Yous, and 2 Advance Reminders. Events are booked up to about a year ahead,
so the old system lives that long unless Events are moved.

## What is known

- The mapping considered during the grilling: old Confirmation 1 becomes the Invitation,
  later Confirmations become pending-only Follow-ups, a non-asking Initial Invitation is
  dropped if a Confirmation exists, an Advance Reminder becomes the single Reminder, and
  Due Times the Owner chose are kept.
- The option considered was a one-way Back Office action, allowed only while none of the
  Event's Asks has been sent. The same function would be the tool for a mass migration.
- Moving an Event whose Ask has already gone out is the hard case: answers recorded
  against a Confirmation would sit beside a plan with no Confirmation.

- Decided 2026-11-12: an Operator moves an Event only while none of its Schedules has been
  sent, and the move reseeds from scratch. The mappings above were rejected for that case:
  no Due Time, wording or Extra Schedule is carried.

## Unknown

- Whether Owners will ask for it at all.
- What a moved Event's old Personal Message paragraph becomes, if anything.

## Done means

An Event that has already sent can be moved, or it is decided that such Events always
finish on the Classic Message Plan and this is dropped.

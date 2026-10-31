# An Advance Reminder is its own Schedule Type

Date: 2026-10-31

## Status

Accepted. Not built yet.

## Context

Some Events need their reminder before the Event day rather than on it: a morning
ceremony that a 10:00 day-of reminder would arrive too late for, or an Event the day after
Shabbat. Others want one before the day as well as the usual one on it. The Event Reminder
cannot be moved to do this. Its copy opens on `event.todayLine` ("...מתקיימת היום"), and
`pinnedDueDay` locks every `event_reminder` Schedule to the Event day so that line stays true.

## Decision

**A reminder sent before the Event day is an Advance Reminder: a fifth message Schedule
Type (`advance_reminder`, "תזכורת מוקדמת") that sits between Confirmation and Event
Reminder. It is not a second Variant or family of the Event Reminder.**

- Its copy names the Event's day (weekday and date) instead of saying "today" or
  "tomorrow", so it reads right on any day before the Event. It may be due on any day up
  to the day before the Event, but never on the Event day itself. The Event Reminder keeps
  its pin.
- It is added to one Event at a time by an Operator from the Back Office, at most one per
  Event. The add dialog proposes the day before at 10:00. It is in no Event Type's
  defaults. For "instead of the day-of reminder", the Operator also deletes that Event's
  Event Reminder: the Back Office's delete, until now for an unsent Initial Invitation
  only, takes either reminder too.
- It is always included in the Plan and is never an Extra Schedule, whether it stands in
  for the Event Reminder or sits beside it.
- It goes to confirmed and pending Guests, never to declined ones. Each Guest's form is
  chosen per Guest, the way the table-number row is: confirmed Guests get a message with no
  buttons, and pending Guests get the same message plus the Confirmation's two RSVP quick
  replies, which open the existing Confirmation Conversation.
- At first it has no table number, no gift button and no Personal Message.

## Considered Options

- **A second family of `event_reminder`.** Rejected. Everything that tells messages apart
  does so by Schedule Type: the day pin, the gift-button default, the Personal Message
  frame (found by Schedule Type, and opening on `event.todayLine`), the outstanding-plan
  warning, labels and icons. Each would have had to start telling two families apart. The
  Personal Message frame would have sent "today" days early, and the Owner would have seen
  two rows both called "תזכורת אירוע".
- **A Variant of the Event Reminder.** Rejected. A Variant is a tone (the same message said
  differently), and a different send day is not a tone.
- **Pinned to the day before, saying "tomorrow".** Rejected. Kululu sends on Shabbat (ADR
  0018), so a Sunday Event's reminder would land on Saturday with no way to move it to
  Friday.
- **Pending Guests told to answer in the earlier Confirmation message.** Rejected. It is
  untrue for a Guest whose Confirmation went by SMS Fallback, failed, was never sent, or
  who was added afterwards. Buttons on the Advance Reminder itself work for every pending
  Guest, because each Delivery carries its own token and the RSVP Cutoff is the end of the
  Event day.

## Consequences

- An RSVP given through an Advance Reminder is recorded against that Schedule, not against
  a Confirmation.
- The audience filter, which today targets one RSVP status or everyone, needs a value for
  "everyone except declined".
- It is never offered as a Catch-up Send, which already covers only Initial Invitations and
  Confirmations (ADR 0050).
- Moving the Event date strands it like any other dated Schedule (backlog 0008).

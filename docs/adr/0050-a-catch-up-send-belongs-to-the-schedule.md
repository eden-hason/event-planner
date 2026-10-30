# A Catch-up Send belongs to the Schedule and goes when pressed

Date: 2026-10-30

## Status

Accepted. Revised the same day, before it shipped: the offer moved from the latest
Confirmation to the latest Invitation or Confirmation (see "The latest Confirmation only"
under Considered Options).

## Context

A Schedule's audience is resolved once, at dispatch (backlog 0007). A Guest Record added
the day after a message went out, or one that had no phone number then, never gets it, and
until now only an Operator could reach them, from the Back Office.

The guest drawer is being split into Details and Communication tabs, and the Communication
tab shows every Outreach Item with what it means for this one Guest. That makes a missed
message visible to the Owner, so the Owner needs a way to act on it.

## Decision

**A Catch-up Send gives the Guest their Delivery on the latest message that already went
out. It is not a new kind of message, and it goes the moment the Owner presses it.**

- It adds a Delivery to the sent Schedule. It never touches the Schedule row, which stays
  frozen (`prevent_sent_schedule_mutation`). The Schedule's results count the Guest like
  anyone else in the audience.
- Only the **latest Initial Invitation or Confirmation that went out** is offered
  (`pickCatchUpSchedule`). While only the Invitation has gone, that is the Invitation;
  once a Confirmation has, the latest Confirmation. From the Event Reminder on, nothing is
  caught up on: those messages are about the day itself, so once one has gone out the
  offer stays on the last Invitation or Confirmation. What is still planned reaches the
  Guest by itself, because each Schedule resolves its audience when it sends.
- It covers a Guest still in that Schedule's audience, inside the Record Package, with a
  usable phone, whose Delivery for it is missing or Not sent. A Failed Delivery is not
  offered: a Guest-level failure would fail again, and SMS Fallback stays with the
  Operator (ADR 0012).
- It is offered until the **RSVP Cutoff**, the same limit the Back Office uses.
- It is pressed in the guest drawer only, for one Guest at a time. It is sent synchronously
  through the same path as the Back Office late-guest send (`sendSelectedDeliveries`), so
  it has the same renderer, package gate and scoped claim (ADR 0014).
- **The Send Window does not apply.** The Send Window exists so that Kululu, acting on its
  own, never puts a message in front of a Guest at night. A Catch-up Send is the Owner's
  act for one Guest they are looking at. The Owner chose the hour.

## Considered Options

- **A direct message that belongs to no Schedule**, like a Test Message. Rejected: every
  button in a Confirmation carries its Delivery token (ADR 0017), so the Confirmation
  Conversation, the results and billing would all have to learn a second kind of record
  to support one Guest.
- **An Added Schedule aimed at the late Guests.** Rejected: it would be Purchased or
  Granted for what is really the same message the Owner already paid for, and it fills the
  plan with Schedules that each go to one Guest.
- **Every Schedule Type, latest per stage.** Rejected: it lets one missed guest be sent
  two or three messages in a row, and a Reminder or Thank You caught up on alone makes no
  sense without the ask before it.
- **The latest Confirmation only** (the first version of this decision). Rejected: an Event
  that has sent only its Initial Invitation offered nothing at all, and the Owner of a guest
  added that week had to wait for a Confirmation that might not even be dated yet.
- **Bulk from the Schedules page** ("12 guests added since"). Deferred. Drawer only to
  begin with; the "didn't get the latest message" filter on the guest list is how the Owner
  finds them.
- **Queue it and hold it to 09:00 outside the Send Window.** Rejected: it would make a
  deliberate one-Guest send wait overnight for a rule written for unattended sends.

## Consequences

- An Owner can message a Guest at 23:00. That is their choice and their relationship with
  the Guest. Kululu sending by itself still never does.
- It bypasses the Throughput Governor. That is defensible for the same reason as the Back
  Office single send: one Guest per press is bounded by how fast a person can press.
- A Catch-up Send pressed while the Schedule is still dispatching finds the Guest
  already reserved in the queue, so it is not offered. Eligibility is recomputed in the
  Server Action, so pressing twice sends once.
- The Results denominator of a sent Schedule can grow after it went out. It still
  counts only Guests who actually have a Delivery, so it stays a fact rather than a moving
  target.

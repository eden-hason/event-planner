# A Guest who said yes before the Transportation Group existed is never sent it

Status: open

## Problem

The **Transportation Group** link (`guests_experience.transportation_group_url`) is shown
to a confirmed Guest Record whose transportation answer is yes, but only where the Guest
next looks: the Confirmation Conversation's summary, and the RSVP page's success state
(`transportationGroupFor` in `src/features/events/utils/transportation-question.ts`).

So these Guests never see it unless they come back on their own:

- Those who answered yes before the Owner added the link (or before the Owner replaced it,
  after resetting the group's invite in WhatsApp).
- Those an Operator marked yes on a Call Round, or the Owner marked yes in the guest list,
  who never reopen their RSVP link.

An Owner who sets the group up late has to share it with those Guests by hand.

## Why it was deferred

Kululu sending the link to a Guest who did not just tap anything is an outbound message,
not a reply in a Confirmation Conversation: it is a Delivery, it is billed against the
Record Package, the Send Window applies, and outside WhatsApp's 24-hour session it needs an
approved Template. None of that was in scope for the change that added the link
(2026-11-22), which kept to surfaces the Guest is already looking at.

## What is known

- Who should get it is already one rule: `transportationGroupFor` (confirmed, answer yes,
  question on, a valid group link).
- A Guest Record does not record whether it was ever shown the link, so "has not seen it
  yet" cannot be told apart from "saw it and did not join".

## What is open

- Is this a new kind of Schedule, an Owner Message-like one-off the Owner launches, or a
  line in an existing Ask (the Event Reminder)?
- Whether to record that a Guest was sent the link, so a later send skips them.
- A Template for it, and its Meta approval.

## What done would mean

An Owner who adds or replaces the Transportation Group can have it reach every Guest who
already said yes, within the usual sending rules, without sharing it by hand.

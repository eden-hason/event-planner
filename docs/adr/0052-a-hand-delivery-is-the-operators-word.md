# A Hand Delivery is the Operator's word

Date: 2026-11-06

## Status

Accepted. Makes one exception to ADR 0011 (a Delivery Attempt keeps its own result).

## Context

Some Guests can be reached by no means Kululu sends itself. Of the 163 Failed Deliveries in
production on 2026-11-06, across 13 Events, 142 had already had an SMS that failed too, and
an Event under an SMS Fallback Opt-out gets no SMS at all. Some of those Guests still read
WhatsApp - `130472` and `131049` are Meta holding back marketing messages from Kululu's
number, not a missing account - and a person's phone reaches them. Operators were already
doing this by hand, with nothing to record it, so the Owner kept seeing the Guest as not
reached.

## Decision

A **Hand Delivery** is a WhatsApp Delivery Attempt recorded as Delivered on an Operator's
confirmation that the message reached the Guest. The Back Office offers it on every Failed
Delivery. The button opens WhatsApp on the Operator's device, pre-filled with the Schedule's
SMS Rendition, rendered with the Delivery's own RSVP token.

- **Not a sixth state.** The Delivery is Delivered and the Guest is Reached. "By hand" is an
  attribute of the attempt, the way the channel is an attribute of the Delivery. Every
  reader of the five states - results, Signals, the SMS sweeper, the roll-up - stays correct
  without learning a new value.
- **Never Read, and out of the seen rate.** No receipt can arrive for a message Kululu did
  not send, so a Hand Delivery is treated like an SMS: left out of the seen rate's
  denominator and never shown as unseen. The Owner sees it as delivered by the Kululu team,
  after the failed attempts before it.
- **Only the confirmation is recorded.** Opening WhatsApp records nothing, since Kululu
  cannot see whether the Operator pressed send. A Sent attempt written on open would
  outrank the failure in the roll-up and leave an abandoned Guest "on its way" for good.
- **WhatsApp only.** The channel enum is shared with a Schedule's own channel and with
  billing Entitlements, so it does not grow. Reaching a Guest by phone stays what Call
  Rounds are for.
- **The SMS Rendition is the text.** It is already the WhatsApp body with its buttons as
  plain links, so a Hand Delivery adds no authored copy and the RSVP link comes with it. No
  intro line is added; the Operator can edit the text in WhatsApp before sending.
- **Withdrawing erases it.** A Hand Delivery recorded by mistake is deleted, and the
  Delivery rolls back to Failed. It is the one Delivery Attempt that can be erased: a
  provider attempt records something that happened, while a mistaken Hand Delivery records
  something that did not. An answer the Guest gave in between stays, because the answer is
  theirs.

## Considered

- **A new `delivery_status` value.** Rejected: every switch over the five states would have
  to rank it and decide whether it counts as Reached, for what is a Delivered Guest.
- **Composing the WhatsApp body and appending the RSVP link.** Rejected: URL buttons
  (`/nav`, `/r`) would need their own rule, and the wording would live in code instead of in
  the Template.
- **Withdrawing by marking the attempt failed.** It would keep the trail, but it was
  rejected so that a mis-click leaves nothing in the Owner's timeline.
- **Hiding the button for `131026` (not on WhatsApp).** Rejected: the error is shown next to
  it, and a number can join WhatsApp after the send.

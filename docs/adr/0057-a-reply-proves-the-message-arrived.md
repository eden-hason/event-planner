# A reply proves the message arrived

Date: 2026-11-23

## Status

Accepted. Makes a second exception, after ADR 0052, to ADR 0011 (a Delivery Attempt keeps its
own result): the attempt keeps it, but the Delivery no longer follows it alone.

Amended by ADR 0058: an answer on the Delivery's own RSVP link counts as a reply too.

## Context

On 2026-11-23 WhatsApp reported a Schedule's message to a Guest as failed with `131026`
("Message Undeliverable"). Three minutes later the Guest tapped that same message's RSVP button
and confirmed. The Delivery stayed Failed, so the Owner's results showed "delivery failed" next
to a confirmation, with "SMS on its way" under it, and the SMS Fallback would have sent the
Guest an SMS they did not need. In production that day four Failed Deliveries had a reply, two
of them a button tap.

## Decision

A reply that quotes one of our WhatsApp messages - a quick-reply tap always does - proves the
message reached the Guest. This is **Reached by Reply**.

- **WhatsApp's report is kept.** The attempt keeps its status, error code and message exactly
  as they came; the Back Office still shows them. The reply is a second fact beside them,
  `message_delivery_attempts.replied_at`, written once, by the first quoting reply.
- **Not a sixth state.** The roll-up reads an attempt with a reply as Delivered, at the reply's
  time when no receipt came. The Delivery is Delivered and every reader of the five states -
  results, counts, the SMS Fallback, the Marketing Cap Retry - is right without learning a new
  value, as with a Hand Delivery.
- **The Owner sees an ordinary delivered message.** The table reads it like any Guest who
  answered. The activity shows it delivered, with "the guest replied to the message" where a
  receipt would say "the phone confirmed it", and no failure step: the provider's mistake is an
  Operator fact.
- **Not the Freeze's concern.** A failure the Guest replied to was no failure of their number,
  so it does not count toward the Fallback Freeze.
- **Only a quoting reply counts.** A typed text is attributed to the Guest's latest Delivery by
  their number, which proves nothing about that message. Answering on the RSVP page proves
  nothing about WhatsApp either: the link may have come from anywhere. (Since ADR 0058, an answer on the
  Delivery's own link does count - that link goes out only in its messages.)

## Alternatives rejected

- **Overwrite the attempt's status with Delivered.** Simplest, but it erases what WhatsApp
  said, and ADR 0011 keeps provider facts as they came. A false `131026` is itself worth
  seeing in the Back Office.
- **Derive it in the app from `whatsapp_inbound_messages`.** Every reader of the Delivery's
  state - the SMS Fallback engine and its sweeper included - would have to join the inbound
  log, and each one that forgot would tell a different story.

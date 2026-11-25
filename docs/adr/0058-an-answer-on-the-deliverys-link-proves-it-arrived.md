# An answer on the Delivery's link proves it arrived

Date: 2026-11-25

## Status

Accepted. Amends ADR 0057, which ruled answers on the RSVP page out as proof of anything.

## Context

On 2026-11-25 a Schedule's WhatsApp message to a Guest failed with `131026`, the SMS Fallback
sent an SMS, and ActiveTrail never reported on it - the SMS status poll found neither
delivered nor errored. Five and a half hours later the Guest declined through the SMS's
link. The Delivery stayed Sent, so the Owner saw "on the way" next to the Guest's answer.

ADR 0057 made a WhatsApp reply proof the message arrived, and left the RSVP page out: "the
link may have come from anywhere". That holds for the Guest's own invitation link. It does
not hold for the link a Schedule's messages carry, which holds the Delivery's
`confirmation_token` and goes out only in that Delivery's messages. SMS has no reply we can
read, so for an SMS that link is the only proof there will ever be. In production four
Deliveries were in this state that day, all SMS.

## Decision

An answer on a Delivery's own RSVP link is **Reached by Reply** too.

- **The same fact, in the same place.** The answer sets `message_delivery_attempts.replied_at`,
  once, and the roll-up reads the Delivery as Delivered exactly as for a WhatsApp reply.
  Nothing downstream learns anything new; the provider's report stays on the attempt.
- **Credited to the latest message sent before the answer.** The token is in every message
  of the Delivery, so the answer proves one of them arrived without naming it. The latest is
  the likeliest carrier - an SMS Fallback follows a WhatsApp message that did not land - and
  the Delivery is Delivered whichever it was. A message that never went out is skipped.
- **The first proof stands.** A Delivery that already has a reply, of either kind, is left as
  it is.
- **Only the Delivery's link.** An answer on the Guest's invitation link is tied to no message
  and still proves nothing. Neither does opening the page without answering.
- **Best effort.** The answer is saved first; a failure to record the proof is only logged.

## Alternatives rejected

- **Leave SMS to the status poll.** It stays the source for SMS receipts, but some carriers
  never answer, and the Owner would keep seeing "on the way" for a Guest who answered.
- **Credit every message of the Delivery.** It would mark a failed WhatsApp message as
  reached when the Guest clearly answered from the SMS that replaced it, and the Back Office
  would show a reply on a message nobody received.
- **Count opening the page.** Link previews and scanners open links without a person.

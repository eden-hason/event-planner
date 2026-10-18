# A typed button label is the tap

Date: 2026-10-18

## Status

Accepted.

## Context

Some Guests' WhatsApp sends a template's quick reply as text. The Guest taps "נגיע בשמחה" and
the button looks pressed, but Meta reports a `text` message with the label as its body, quoting
the template, instead of a `button` tap. ADR 0017 does not interpret typed text, so the answer
was not recorded and the Guest was told to use the buttons, which they believed they had. By
2026-10-18, 19 Guests had answered this way and 13 of them were still pending. Every one of
these texts was the exact label and quoted the template.

## Decision

Text that quotes one of our template sends, and is exactly one of that template's RSVP button
labels, is handled as the tap it stands for. The quoted message is a WhatsApp attempt, which
names the Delivery and with it the token a real tap carries. The labels come from the
template's own `buttonPlaceholders`, so a new or renamed template needs no code change.
Whitespace and direction marks are ignored. Anything else, even close to a label, is still
typed text.

## Considered Options

Matching the label without the quote was rejected: the quote is what ties the text to one
Delivery, and without it a phone on two Events would need a guess. Matching looser text ("כן",
"מגיעים") was rejected because it is the free-text interpretation ADR 0017 chose not to do.

## Consequences

The answer is claimed and replied to exactly like a tap, so the conversation continues with the
count question. Test Messages are not covered, since they have no attempt to quote.

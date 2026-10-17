# The post-event Owner Message says thank you but not what Kululu did

Status: open
Area: owner messages / growth
Related: `docs/adr/0039-owner-messages-are-not-schedules.md`

## The problem

The post-event **Owner Message** (ADR 0039) thanks the Owner, points to the gifting page
and asks for a Google review. It says nothing about what Kululu actually did for them. A
number ("Kululu reached 230 of your guests, 180 confirmed") makes the value concrete just
before the review ask, and is likely to raise the share of Owners who write one.

## What is known about the moving parts

- **Reached** Guest Records and RSVP answers are already counted for the Record Package and
  the Schedule Results tab, so the numbers exist.
- Adding variables means resubmitting the Meta template, and a new name or version, per
  the template naming convention.
- More numbers make the message read more like a report and less like a thank-you. One or
  two figures is probably the limit.
- Very small numbers ("Kululu reached 4 guests") read worse than none, so the line may need
  a floor below which it is left out. That means two templates, with and without numbers.

## Open questions

1. Which figures? Guests reached, guests confirmed, calls made (WhatsApp + calls Plan only)?
2. Is there a floor below which the numbers line is dropped?
3. Does it change Meta's classification? It should not. Facts about the Owner's own Event
   are utility, but resubmitting reopens the review.

## Done means

The post-event message carries one or two real figures when they are worth showing, and
the review-rate effect is measurable. That means tagging the review button link, or
comparing review counts from before and after.

# Owner Messages are not Schedules

Date: 2026-10-17

## Status

Accepted. Built on this branch; the Meta templates are specified in `docs/design/owner-message-templates.md`.
The "links in the text, not buttons" point is superseded by ADR 0049: links are quick-reply
buttons answered with the link.

## Context

Kululu has only ever messaged Guests, through Schedules, apart from the Owner's own
**Test Message**. We want Kululu to speak to the Owner too, starting with two messages: a
welcome when the Event is first paid, and a post-event note pointing to the gifting page and
asking for a Google review. A **Thank You** Schedule already exists and is sent "after the
Event", so reusing the Schedule machinery is the obvious path.

## Decision

An **Owner Message** is its own concept, not a Schedule Type and not a Template.

- **Audience and sender.** It goes to the Event's creator only, not every Owner and never a
  Seating Manager. It is Kululu speaking, not the Owner speaking to their Guests.
- **No planning, no package.** The Owner does not see, choose, date or edit it, and it does
  not count against the Record Package. It has no Variant and no SMS Rendition.
- **WhatsApp only, Hebrew only.** No SMS Fallback. If it fails it stays failed, visible to
  an Operator.
- **Two kinds for now:**
  - **Welcome.** Sent the first time the Event ever becomes `paid`, gifts (0-amount
    payments) included. It is sent immediately, ignoring the Send Window, because the Owner
    has just paid and is expecting it. It is never sent again, not on a top-up and not on a
    re-payment after `canceled`. Events already paid when this ships count as welcomed.
  - **Post-event.** Sent at 18:00 Israel on the day after the Event, or on Sunday if that
    day is a Saturday. Every Event type gets it, if the Event's billing status is `paid`
    when it falls due. It follows the Event date if the date moves.
- **Lateness.** Either kind not sent within 48 hours of when it was due is recorded as
  expired and never sent, matching an **Expired Schedule**.
- **Operator override.** The Back Office Event page lists the Event's Owner Messages and
  their status, and offers "send now" for each kind. A manual send ignores the once-only and
  48-hour rules, because an Operator is choosing it.
- **Meta category.** Both are submitted as `UTILITY`. If Meta reclassifies the post-event
  one as marketing, because of the review ask, we accept that.
- **Links in the text, not buttons.** WhatsApp opens a template button in its own in-app
  browser, where the Owner is not signed in. A link in the body opens in the phone's own
  browser. So the app and the review are plain links in the body, on short paths of our
  own (`/app`, `/review`) that redirect onward. Only the Welcome's support button remains,
  because it opens WhatsApp, not a page.

## Considered

- **A new Schedule Type with the Owner as its audience.** Rejected. Every Schedule rule
  assumes the audience is Guests: Deliveries per Guest, the Record Package cap, Reached,
  Variants, the SMS Rendition requirement, the Owner's schedules page. Each would need an
  exception, and "Thank You" would come to mean two different messages.
- **Operator-sent only.** Rejected as the main path, because it depends on someone
  remembering. Kept as the override.
- **Every Owner, or whoever paid.** Rejected for the MVP. Most payments are recorded by an
  Operator, so "whoever paid" is usually unknown.
- **Holding the welcome to the Send Window.** Rejected. A late-night payment is rare, and the
  Owner expects confirmation at that moment.

## Consequences

- **Owner Messages skip Saturday even though Schedules send on weekends (ADR 0018).** This is
  deliberate. A Schedule has a reason to arrive on Shabbat (a Saturday-night Event's
  reminder). A thank-you and a review ask do not, and Sunday evening reads better.
- **The Guest-facing Thank You is unchanged.** The two may land the same day, from the same
  WhatsApp number, to different people.
- **Their WhatsApp statuses need their own correlation**, in the way ADR 0019 tags a
  Delivery Attempt or a Test Message, so the webhook never mistakes them for a Guest's.
- **Replies are not read.** Inbound text from an Owner is only ever treated as a Guest's
  RSVP answer. The welcome points to a separate, staffed support number instead (backlog
  0023).
- **The welcome's package line is a snapshot.** It states the Plan and records at first
  payment and is never resent, so it goes out of date after a top-up.

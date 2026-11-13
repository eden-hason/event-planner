# The Message Plan's messages are written in code, not in the catalog

Date: 2026-11-12

## Status

Accepted. Not built.

## Context

On the Classic Message Plan a Schedule points at a `message_templates` row, and the send
picks a sibling row of the same family through six boolean axes (table numbers, gifting,
note, follow-up, invitation image, RSVP ask) plus a Variant, a Personal Message flag and a
Bespoke Event id. Each axis was added by a migration when a new need arrived, and every
wording change is a migration too. The current Message Plan (ADR 0053, ADR 0054) has one
Kululu Wording per stage and picks its Meta template from the message's shape: the stage,
the attachment, the day, the table line, the gift switch and the number of paragraphs.

## Decision

Schedules on the current Message Plan stay rows in `schedules`, under two new Schedule
Types (`invitation`, `follow_up`) beside the existing `event_reminder` and `post_event`,
and the Event records which Message Plan it is on. Their messages are defined in code: one
typed module per stage holding the Kululu Wording, the Wrapper, the buttons, and which
Meta template name goes with which shape. Such a Schedule has no `template_id`. What it
chose (Kululu Wording or Personal Message, attachment, gift switch) is stored on the
Schedule itself.

The queue, Deliveries, Delivery Attempts, SMS Fallback, webhooks and Results are shared by
both plans and do not change shape.

## Considered Options

- **New rows in `message_templates`, with a second resolver.** Rejected: the current plan
  would inherit the catalog's axis columns, its wording would still change by migration,
  and the SMS text, which is now derived from the WhatsApp text, would still be stored
  twice.
- **Separate tables for the current plan's Schedules.** Rejected: Deliveries, the queue,
  Results, Hand Delivery, Extra Schedules and the Back Office all key on `schedules.id`,
  and each would need a second path.

## Consequences

- A wording change on the current plan is a code change and a deploy, checked by the type
  system and unit tests. An Operator cannot edit it from the database. The same definitions
  are what gets submitted to Meta, so the two cannot drift.
- Everything that reads `schedules.template_id` or a template's key has to tell the two
  plans apart first. That branch is the price of running both, and it goes when the Classic
  plan does.
- `message_templates` is frozen: no new families are added to it.
- Amended 2026-11-13, from building the send path: a current-plan message Schedule's
  channel is WhatsApp (with the SMS Fallback behind it), since there is no catalog row to
  read it from; a quick reply a Guest's WhatsApp sends as typed text is read against the
  plan's own two labels; and the Gifting page's per-message switches write the Reminder's
  and Thank You's `gift_button` on the current plan instead of `event_settings`, because
  the send reads only the Schedule.


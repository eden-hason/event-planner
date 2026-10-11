# Two Plans: WhatsApp, and WhatsApp with calls

Date: 2026-10-09

## Status

Accepted. Supersedes the three published rates in ADR 0024.

## Context

The homepage simulator sold Guest Records on three channels: SMS 1 ₪, WhatsApp 1.5 ₪ and
WhatsApp + calls 2 ₪ (ADR 0024). Each tile said only how a Guest is contacted and what a
record costs, never what the Owner actually gets for it.

SMS was never bought. When this was decided, every recorded payment was WhatsApp (3) or
WhatsApp + calls (9). An SMS-only package also sits badly with the product: every
Schedule is attempted over WhatsApp first, and SMS exists as a fallback (ADR 0012/0016),
not as a way to run an Event.

## Decision

Kululu sells two **Plans**, and each one says what it includes:

**WhatsApp** (1.5 ₪ per record)
- Initial Invitation - which an Owner who invites on paper can swap for a Confirmation
  round (ADR 0029)
- Two Confirmation rounds
- Event Reminder
- Thank You after the Event

**WhatsApp + calls** (2 ₪ per record)
- Everything in WhatsApp
- Two Call Rounds, made by a Kululu representative, with each Guest's answer showing to the
  Owner as it is recorded

Price stays `records × rate` (ADR 0002) and Bonus Records follow ADR 0035. A Plan
is what the records are bought for, not how many: it has no size, so it does not bring back
the tiers ADR 0002 retired.

The Plans are shown on the homepage simulator and, in a leaner form, inside the app where a
free Owner decides to upgrade, so the choice can be seen again at the moment of paying.

SMS stops being sold, but `sms` stays in the `record_package_channel` enum and in
`RECORD_PACKAGE_CHANNELS`/`RECORD_PACKAGE_RATES` for now. Removing it is a migration with no
payment to carry, worth doing when the channel is enforced (backlog 0016), not before.
The homepage hides it.

## Consequences

**Good.** The Owner compares what they get, not just a price per record. Call Rounds read
as the one thing the dearer Plan adds, which is what they are.

**Bad.** A WhatsApp Event gets no Call Rounds, but nothing stops an Operator from running
one for it: the Plan is recorded on the payment and not enforced (backlog 0016). Until it
is, keeping to the Plan is the Operator's job.

SMS Fallback still runs on both Plans. It rescues failed WhatsApp sends and is not part of
what either Plan sells, so customer copy should neither promise it nor deny it.

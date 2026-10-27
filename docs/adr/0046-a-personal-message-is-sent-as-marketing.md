# A Personal Message is sent as Marketing

Date: 2026-10-27

## Status

Accepted. Not built.

## Context

A **Personal Message** lets the Owner write a Schedule's message in their own words: one
paragraph inside a fixed frame Kululu writes, which opens on a greeting and keeps the
Event's date and place, a table number on a reminder, and the stage's buttons. On WhatsApp the
paragraph is a template variable whose content Kululu does not author.

Every Guest-facing template Kululu has today is `UTILITY`. Meta's categorization rules say
a template whose content is unclear (their example is a body of only `{{1}}`) is Marketing.
Meta also checks what is actually sent: a Utility template that carries promotional text is
recategorized, and a misuse flag can move *every* Utility template on the account to
Marketing at once, without the usual day's notice. Kululu's RSVP flow rests on those Utility
templates.

## Decision

The Personal Message families are submitted to Meta as `MARKETING` on purpose, for every
Schedule Type.

- **Why.** Kululu does not control what the Owner writes, so it cannot promise Meta the
  content is non-promotional. Registering it as Marketing means Meta has nothing to
  recategorize, and the rest of the account's Utility templates are never at risk because
  of what one Owner wrote.
- **No content rules.** With the category no longer at stake, the Owner may write anything,
  links and phone numbers included, within 300 characters.
- **Same price.** A Personal Message is part of every Plan at the flat per-record price
  (ADR 0002). Kululu absorbs the higher Marketing rate and the extra SMS Fallback it causes.
- **Shipped before approval.** The option appears for a Schedule Type as soon as its family
  is in the catalog, accepting that an early send may hit a template Meta has not approved
  yet.

## Considered Options

- **Utility, with guardrails** (no links, a length cap, an alert on recategorization).
  Cheaper and with no marketing caps, but it bets the account's Utility standing on
  Owners' writing, and the guardrails only lower that risk.
- **Utility, no guardrails.** The same bet with nothing lowering the risk.

## Consequences

- **Some Guests miss the WhatsApp.** Meta caps how many marketing messages a user
  receives (error 131049) and lets users opt out of marketing (131050). A Personal Message
  Confirmation will reach fewer Guests on WhatsApp than Kululu's Variant would.
- **The Fallback Freeze is unchanged.** A 131049 on a Personal Message counts toward the
  Freeze like any other. On a large audience a Personal Message may freeze its own SMS
  Fallback and need an Operator, which was accepted over teaching the Freeze a second rule.
- **A Personal Message left blank sends the Variant,** so the Marketing rate and its caps
  apply only to Schedules the Owner actually wrote.

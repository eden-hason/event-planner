# 0016 - The channel a Record Package was bought for is not enforced

Status: open

## The problem

The homepage sells records at three rates: SMS 1 ₪, WhatsApp 1.5 ₪, WhatsApp + calls 2 ₪
(`src/app/(main)/[locale]/_components/pricing.ts`). ADR 0027 records the channel on each
payment and shows it to the Owner, but sending never checks it. An Event that paid the SMS
rate can still send WhatsApp Schedules and run Call Rounds.

## What is true today

- Price is `records × rate`, and the rate depends only on the channel (ADR 0002).
- The channel exists only on the recorded payment. The send queue (ADR 0013), SMS Fallback
  (ADR 0012/0016) and Call Rounds know nothing about it.
- Payment is manual, so an Operator choosing the wrong channel is caught by a person, not
  by the system.

## Open questions

- Is the channel a property of the package, or of each payment? A top-up on a different
  channel (150 on WhatsApp, then 50 on WhatsApp + calls) has no defined meaning yet.
- Does SMS Fallback count as "SMS" for a WhatsApp-only package? It is operator-launched and
  exists to rescue failed WhatsApp sends, so it probably should not.
- Is an upgrade (SMS → WhatsApp) the rate difference on the records already paid for?

## Done means

Each Schedule type and Call Round declares the channel it needs, a send is refused (with a
reason the Owner sees) when the package's channel does not cover it, and the Plan & Billing
page explains the upgrade path.

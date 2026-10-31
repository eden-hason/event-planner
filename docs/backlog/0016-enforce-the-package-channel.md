# 0016 - The channel a Record Package was bought for is not enforced

Status: open

## The problem

Kululu sells two Plans (ADR 0034): WhatsApp 1.5 ₪ and WhatsApp + calls 2 ₪
(`src/app/(main)/[locale]/_components/pricing.ts`). ADR 0027 records the Plan on each
payment as its channel and shows it to the Owner, but sending never checks it. An Event on
the WhatsApp Plan can still have Call Rounds run for it.

SMS was sold at 1 ₪ until ADR 0034 and never bought. `sms` is still a value of
`record_package_channel`; drop it as part of this work.

## What is true today

- Price is `records × rate`, and the rate depends only on the channel (ADR 0002).
- The channel exists only on the recorded payment. The send queue (ADR 0013), SMS Fallback
  (ADR 0012/0016) and Call Rounds know nothing about it.
- The one exception is Call Rounds, which follow the Plan
  (`20261030000001_call_schedules_follow_the_plan.sql`): a payment on a Plan without calls
  removes the planned ones nobody has worked, an Event paid before it is dated is seeded
  without them, and none can be planned or started afterwards - the Back Office hides "add
  a call round" and its actions refuse with a reason, with database triggers underneath. A
  round already made stays. Moving a WhatsApp Event onto WhatsApp + calls does not plan its
  Call Rounds back; an Operator adds them.
- Payment is manual, so an Operator choosing the wrong channel is caught by a person, not
  by the system.

## Open questions

- ~~Is the channel a property of the package, or of each payment?~~ Of the package
  (ADR 0042): a top-up is bought on the package's own Plan, and recording one on another is
  refused.
- Does SMS Fallback count as "SMS" for a WhatsApp-only package? It is operator-launched and
  exists to rescue failed WhatsApp sends, so it probably should not.
- Is an upgrade (WhatsApp → WhatsApp + calls) the rate difference on the records already
  paid for? The in-app upgrade view (ADR 0034) will need the answer.

## Done means

Each Schedule type and Call Round declares the channel it needs, a send is refused (with a
reason the Owner sees) when the package's channel does not cover it, and the Plan & Billing
page explains the upgrade path.

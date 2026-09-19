# A refunded Event leaves its Partner Commission standing

Status: open

## The problem

A Referral qualifies when the referred account's first Event reaches `paid` (ADR 0020), and
the Commission goes on the next monthly Payout Statement. If that Event is later refunded
(`paid` -> `canceled`), nothing happens on the Partner side. The Commission stays earned,
and if the statement has already been paid, the money is gone.

This was deliberately left out of v1 to keep the payout model to one rule: qualified in
month M, paid at the start of M+1.

## What is known

- Weddings are paid at schedule kick-off, typically weeks to months before the date, so a
  cancellation after payment is realistic, if rare.
- The refund arrives as a `canceled` billing transition (`docs/billing-webhook-contract.md`),
  so there is a single place to react to it.
- The Referral Gift (a Granted Schedule) may already have been sent by then. It costs
  agorot and doesn't need reversing.

## Options already considered

- **Hold the Commission until the Event date has passed.** No clawback is ever needed, but
  Partners wait months to be paid. Rejected for v1 as too slow.
- **Fixed 30-day hold.** Faster, but it still needs a clawback for later cancellations.
- **Pay now, claw back.** A refunded Referral becomes a negative line on the Partner's next
  statement. This is the most Partner-friendly option, but it makes an awkward conversation
  and needs a rule for a Partner with no future Commissions to offset.

## Still unknown

- How often paid Events are actually refunded. Measure this before building anything.
- Whether the partnership agreement with Partners should say something about refunds
  before the first one happens, whatever the software does.

## Done means

A refunded Event's Commission is either never paid or recovered, by a rule written down in
an ADR and stated to Partners in their agreement.

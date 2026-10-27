# A payment says what it bought

Date: 2026-10-27

## Status

Accepted. Builds on ADR 0021 (an Operator may record a payment), ADR 0027 (the Record
Package) and ADR 0042 (a Top-up stays on the Plan).

## Context

A payment was "a billing log row that carries records". Whether it opened the package or
topped it up was worked out from its place in the list, and the Back Office form grew one
patch at a time around that. Operators now sell an **Extra Schedule**: a Schedule beyond
what the Plan includes. It is money received, but it carries no records, so the old model
had nowhere to put it. More upsales are likely.

## Decision

Every payment carries a **kind** (`event_billing_events.kind`, `billing_payment_kind`):

- **`plan`** opens the Record Package: records on a Plan. One per Event, enforced by a
  unique index.
- **`top_up`** adds Paid Records on the package's Plan, with no bonus (ADR 0042).
- **`extra_schedule`** buys one or more Schedules beyond the Plan (`schedule_count`). It
  leaves the package alone. The Operator creates the Schedule by hand; nothing links the
  payment to it.

A row with no kind is a status change, not a payment. A check constraint says which fields
each kind carries. Paid Records are still the sum of `record_count`, so a Top-up grows the
package exactly as before. Both upsales need the Plan first, which
`apply_event_billing_transition` enforces and `paymentKindBlocker` explains to the Operator.
Every kind lands the Event on `paid`, as every payment always has.

The Back Office form asks what was bought first, then how it was paid. The Owner's payments
list shows Extra Schedules beside the record payments.

## Considered Options

- **Keep inferring Plan vs Top-up from order, and add only `extra_schedule`.** Rejected:
  a list of payments where some kinds are stored and some are derived is harder to read
  than one where every row says what it is, and the derived rule would have to skip the
  upsales that carry no records.
- **Link an Extra Schedule to the Schedule it paid for.** Rejected for now: the Operator
  sets the Schedule up by hand, often later, and nothing reads the link yet.
- **Refuse an upsale unless the Event is `paid`.** Rejected: `paid` only comes from a
  recorded payment, so a canceled Event with a Plan would have no way back. The form warns
  that the payment turns sending back on instead.

## Consequences

- Production had 19 payments on 18 Events when this landed: 18 became `plan`, 1 `top_up`.
- Revenue on the Overview counts every non-gift payment, upsales included.
- A new upsale is a new enum value, a branch in `RecordEventPaymentSchema` and the
  constraint, and its fields in the form.

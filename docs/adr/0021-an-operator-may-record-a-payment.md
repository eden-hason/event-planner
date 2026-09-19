# An Operator may record a payment

The payment webhook contract (`docs/billing-webhook-contract.md`) made `paid` reachable only
from a confirmed payment at an external provider, and deliberately left it out of the Back
Office billing control. No provider has been chosen, so nothing in the system ever becomes
`paid`. Any payment taken today happens outside the system, and the Event can only reflect it
by being comped.
That was harmless while `paid` and `comped` behaved the same. It stops being harmless with
Kululu Partners (ADR 0020), because only a real payment qualifies a Referral.

An Operator can now **record a payment** in the Back Office: amount, method and reference,
moving the Event to `paid` through the same `applyBillingTransition` seam with
`provider = 'manual'` and the reference as `providerRef`. It is a separate, deliberate
action, not an extra option in the status control, so recording money is never confused
with granting sending. Referral qualification hangs off the transition to `paid` whatever
the provider, so when the webhook arrives nothing on the Partner side changes.

**Considered Options:** waiting for the payment provider before launching Partners was
rejected because it blocks the programme on an unrelated vendor decision. Letting an
Operator tick "qualified" on a Referral directly was rejected because the Referral and the
Event's billing status could then disagree.

**Consequences:** `paid` now means "money was received", not "a provider confirmed a
payment". The `event_billing_events` row records who recorded it, and `provider = 'manual'`
keeps manual payments distinguishable from provider ones in every report.

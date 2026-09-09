# Payment webhook contract

Status: **not wired**. Checkout happens in an external service that is not yet
chosen. This note fixes the shape of the integration so that turning it on is a
small, contained change.

## The one seam

Every billing transition - manual or paid - goes through one function:

```
applyBillingTransition(supabase, {
  eventId,
  toStatus,       // 'paid' for a confirmed payment
  provider,       // the payment service's name, e.g. 'paybox'
  providerRef,    // the payment's id in that service - makes the call idempotent
  amount,         // total charged
  currency,       // 'ILS'
  channel,        // 'whatsapp' | 'sms' - the rate that was quoted
  recordCount,    // guest records billed
  occurredAt,     // the payment timestamp from the provider
})
```

`src/features/billing/services/apply-billing-transition.ts`. It advances
`events.billing_status` and appends an `event_billing_events` row in one
transaction (the `apply_event_billing_transition` Postgres function). A repeat
call with the same `provider` + `providerRef` is a no-op that returns the
existing row, so at-least-once webhook delivery is safe.

`events.can_create_schedules` is generated from `billing_status` in the database
(`paid | comped` => can send), so nothing else has to be updated.

## The route to add

`src/app/api/webhooks/payments/route.ts` (see `src/app/api/` for the existing
route-handler pattern, e.g. the WhatsApp webhook):

1. Read the raw body and verify the provider's signature against a shared
   secret in an env var. Reject with 401 on failure. **Do not** parse first.
2. Map the provider's event to `BillingTransitionInput`. Only act on a
   settled/succeeded payment event; ignore the rest with a 200.
3. Resolve which event was paid for. The checkout link must carry our
   `eventId` (or `events.short_code`) as metadata - this is the one thing to
   confirm when the provider is chosen.
4. `const supabase = createServiceClient()` then `applyBillingTransition(...)`.
5. Return 200 on success, 200 on a duplicate (idempotent), 500 only on an
   unexpected failure so the provider retries.

## Refunds

A refund event maps to `toStatus: 'canceled'`, `provider` + a new
`providerRef` (the refund's id). `canceled` turns the send gate back off.

## Manual operation until then

The Back Office event workspace has a **Billing** control
(`EventBillingStatusControl`) that sets `comped`, `payment_pending`, `canceled`,
or `free` by hand, with a note. `paid` is deliberately not offered there - a
confirmed payment only ever comes from this webhook.

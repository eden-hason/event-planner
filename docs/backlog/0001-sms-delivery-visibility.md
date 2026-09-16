# SMS delivery is invisible after the provider accepts it

Status: open
Area: schedules / outreach
Related: `docs/adr/0011-a-delivery-is-rolled-up-from-its-attempts.md`,
`docs/adr/0012-sms-fallback-is-operator-launched-and-guest-level-only.md`

## The problem

An SMS Delivery Attempt is recorded as `sent` the moment ActiveTrail's HTTP endpoint
returns 2xx (`buildAttemptRecord` in `src/features/schedules/utils/send-helpers.ts`), and
it never moves again. That is one hop out of four: Kululu to ActiveTrail, then aggregator,
then the Israeli carrier's SMSC, then the handset. Everything downstream is unobserved -
a disconnected number, a landline, a handset off past the SMSC validity window, carrier
spam filtering (our body carries a shortened link with an alphanumeric sender, the exact
profile that gets filtered), or provider-side suppression of an SMS opt-out.

So `sent` on SMS is an acceptance receipt being read as a delivery receipt.
`getScheduleInteractionData` maps SMS + `sent` to **reached by SMS**
(`src/features/schedules/queries/guest-interactions.ts`), which is an assumption, not an
observation, and one the Owner cannot tell apart from a WhatsApp `delivered`.

### Evidence (production, 2026-09-16)

| SMS attempts | count |
|---|---|
| `sent` | 774 |
| `failed` | 1 |

The single failure is `SMS API error: Not Found`, with `external_message_id` null and
`sent_at` null - an HTTP-level rejection of the API call itself. **No post-acceptance SMS
failure has ever been recorded**, not because none occurred but because no path exists for
one to reach us. On SMS, `failed` today can only mean "ActiveTrail refused the request".

Compare WhatsApp over the same period: 22 failures, **all 22** accepted with a `wamid`
first and only reported failed by webhook afterwards, on average 7s later and up to 122s
later. There is no reason to expect the SMS channel to be cleaner than the one we can see.

## Why it matters

SMS is the *last resort* channel - it is what an Operator reaches for when WhatsApp has
already failed a guest (ADR 0012). A silent failure there means the guest received nothing
at all for that Schedule, while the Back Office and the Owner's results both show them as
reached. There is currently no signal, anywhere, that would contradict that.

It also compounds: `classifySmsFallbackCandidates` excludes any Delivery that has an SMS
attempt (`already_sms`), so a guest whose SMS silently failed is permanently out of the
fallback batch.

## What is known about the provider

ActiveTrail (`https://webapi.mymarketing.co.il`) offers **no delivery webhook for SMS** -
this is why ADR 0012 stops an SMS attempt at accepted. Sending goes through
`POST /api/smscampaign/OperationalMessage` (`src/features/schedules/actions/sms.ts`).

Pull-based endpoints that look like the way in (found by search, **not yet verified** -
the session that wrote this had `webapi.mymarketing.co.il` blocked by an egress proxy and
could not open the docs):

- `GET /api/smscampaign/OperationalMessage/{id}` - per-message lookup. Promising, because
  we already store a **distinct provider id on all 774 SMS attempts, zero nulls**, so
  every attempt is individually addressable.
- `GET /api/smscampaign/Campaign?IsIncludeNotSent={bool}&FromDate=&ToDate=` - account SMS
  campaigns including operational ones, with a not-sent flag.
- `GET /api/contacts/unsubscribers/sms` - SMS opt-outs.

Docs: https://webapi.mymarketing.co.il/api/docs/

## Open questions - answer these before building

1. **Does `GET /api/smscampaign/OperationalMessage/{id}` actually return a per-recipient
   delivery state, or only the campaign's own metadata?** The whole design depends on this.
   If it does not, fall back to the `Campaign` report with `IsIncludeNotSent=true` and
   match recipients by phone number, which is weaker and needs a different key.
2. What are the provider's state names, and do they distinguish *undelivered* from
   *pending*? A poller that reads "not yet delivered" as failed is worse than no poller.
3. Is there a rate limit on these endpoints? 774 attempts today and growing sets the shape
   of the polling loop (per-message vs one campaign report per Schedule).
4. Does `OperationalMessage` silently suppress recipients on the SMS unsubscribe list
   while still returning 200? If so those guests are being counted as reached right now,
   and `GET /api/contacts/unsubscribers/sms` is a cheaper fix than the whole poller.
5. How long does ActiveTrail retain per-message status? That sets the polling cutoff.

Question 4 is worth answering on its own even if the rest is deferred.

## Sketch, once the questions are answered

A cron-driven poller, mirroring the existing one rather than inventing a shape:

- `src/features/schedules/services/poll-sms-status.ts` - the engine, taking its Supabase
  client as a parameter like the other services do, so a route, an action and a test can
  all drive it.
- `src/app/api/cron/poll-sms-status/route.ts` - thin route, `Bearer ${CRON_SECRET}` guard,
  copying `src/app/api/cron/process-messages/route.ts`.
- A `crons` entry in `vercel.json`. Frequency follows question 5; SMS status is not
  urgent, and hourly for a bounded window is likely enough.

Candidate set: attempts where `channel = 'sms'` and `status = 'sent'` and `sent_at` is
inside the retention window. Advance each to `delivered` or `failed` and let the existing
`roll_up_message_delivery` trigger carry it to the parent Delivery - nothing new is needed
on the roll-up side, which is exactly what ADR 0011 bought.

Two traps worth naming:

- **Stop polling.** Without a cutoff the candidate set only grows. Either bound it by
  `sent_at` alone, or add a `provider_checked_at` column if per-attempt backoff turns out
  to be needed - prefer the former, it needs no migration.
- **A failed SMS currently leaves the guest with no remedy.** Once SMS attempts can fail
  after the fact, the `already_sms` exclusion in `classifySmsFallbackCandidates` will hold
  guests who genuinely got nothing. Decide then what re-opens for them (a Call Round, a
  second SMS, a WhatsApp retry) - that is a product decision and belongs in an ADR, not in
  the poller.

Also note: `STATUS_RANK` in `process-whatsapp-webhook.ts` is the in-attempt ranking
(`failed` terminal, outranks everything). A poller should reuse that ordering rather than
write its own, and must keep the `message_delivery_attempts_sent_at_check` constraint
satisfied.

## Done means

- An SMS attempt that the carrier did not deliver is visibly `failed` in the Back Office,
  with whatever reason the provider gives.
- The Owner's results stop counting those guests as reached.
- The Failed Delivery Signal picks them up like any other failure.
- A decision recorded in `docs/adr/` covering what happens to a guest whose SMS failed.

## Not in scope

- Switching SMS providers.
- Delivery receipts for SMS in real time - there is no webhook to have them from.
- Any change to the WhatsApp path, which already reports properly.

# A WhatsApp that failed on a media download is never retried

Status: open

## The problem

When a template has an image header, Meta fetches the image from our URL (`image.link`,
built by `parameter-resolvers.ts`) at delivery time, not at send time. If that fetch fails,
Meta has already accepted the send call and returned a `wamid`. The failure arrives a second
or so later through the webhook as `131053` ("Downloading media from weblink failed with
http code 500").

Nothing picks such a Delivery up again:

- **Retry ladder.** `isTransient` and `RETRY_BACKOFF_MINUTES` (1, 5, 15 min) apply only in
  `drain-queue.ts`, to a *synchronous rejection* of the send call. A failure that arrives
  through the webhook (`process-whatsapp-webhook.ts`) only stamps the attempt `failed` and
  never schedules another one.
- **SMS Fallback.** `131053` is not in `GUEST_LEVEL_CODES`, so `classifyWhatsAppFailure`
  calls it System-level and the automatic fallback (ADR 0016) excludes it. That is correct
  and should stay: if the image is truly broken, every Guest on the Schedule would get a
  paid SMS.

The only remedy today is an Operator noticing and pressing **Resend selected** on the
event's Back Office page (`sendSelectedDeliveries`, `services/manual-send.ts`).

## Evidence

- Schedule `cc1ed60d-7ca9-40f7-9d88-31f280201e2d` ("Save the Date - 1, invitation image, no
  buttons"), 2026-09-23 13:14 UTC: 1 of 99 Deliveries failed with `131053`, HTTP 500 from
  the image host. The other 98 used the same image URL and were sent, delivered or read, so
  the image was fine and the 500 was momentary. An Operator's manual resend delivered it.
- Across production WhatsApp attempts since 2026-08-16 (1,337 attempts), that is the only
  `131053`. For scale: `131026` x11, `130472` x7, `131049` x5.

So this is rare today. It becomes more likely as more templates carry an image header and
as Schedules grow, since each guest is a separate fetch from Meta.

## What is known

- The two causes look the same to us: the host blipped (a retry works), or the URL is
  broken or gone (a retry just fails again). The HTTP code in the message text (`500` vs
  `404`/`403`) is the only hint, and it lives in `error_message`, not in a structured field.
- A retry of a webhook-reported failure is safe from duplicates in a way a thrown fetch is
  not (ADR 0014): Meta told us the message was *not* delivered.
- The manual path already does the right thing (re-render, claim through
  `claim_delivery_batch`, new attempt on the same Delivery), so an automatic retry can
  probably reuse the queue by setting `next_attempt_at` rather than add a send path.
- `isTransient` and `classifyWhatsAppFailure` are deliberately independent (see the comment
  on `TRANSIENT_CODES`). Retrying `131053` must not make it SMS-eligible.

## Open questions

- Where is the retry decided? Options: in the webhook handler when it stamps `failed`, or
  in the sweep before `sweepSmsFallback` looks at the Schedule. The sweep can see the whole
  Schedule, which matters for the next point.
- Burst guard. If most of a Schedule fails with `131053`, the image is broken and retrying
  everyone just triples Meta traffic for the same result. Something like the Fallback
  Freeze (ADR 0016) should stop the retry and surface it to an Operator instead.
- Parse the HTTP code out of the message and retry only 5xx? Or retry any `131053` once?
- Does the ADR 0016 settle window (no attempt activity for ten minutes) need to wait for a
  pending media retry? It should, or a Schedule can be judged "finished" mid-retry.
- Should `131052` (media upload/unsupported type) be treated alongside it? Probably not -
  that is a content problem, not a fetch.

## Done means

A Delivery whose WhatsApp failed with a transient media-download error is retried
automatically, a bounded number of times, without an Operator. A Schedule whose image is
genuinely broken does not retry everyone and is surfaced to an Operator. `131053` stays
out of the SMS Fallback. The decision is recorded in an ADR.

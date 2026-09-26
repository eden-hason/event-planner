# Raw webhook payloads are kept forever, guest phone numbers included

Status: open
Area: schedules / privacy
Related: `supabase/migrations/20260914000002_webhook_events.sql`, `src/lib/webhooks/inbox.ts`,
`docs/adr/0011-a-delivery-is-rolled-up-from-its-attempts.md`

## The problem

`public.webhook_events` stores every verified WhatsApp notification as its raw body, before
processing. Those bodies carry guest phone numbers, and inbound replies carry what the
guest wrote. Nothing ever deletes a row. The migration that created the table says so
itself: the rows are working data, not an archive, but "no purge runs yet".

This also means deleting an Event does not delete everything about its guests. Everything
derived from a notification cascades away with the Event (`message_deliveries`,
`message_delivery_attempts`, `whatsapp_inbound_messages`), but the raw notification that
produced those rows stays in `webhook_events` indefinitely.

### Evidence (production, 2026-09-26)

| | |
|---|---|
| rows | 1,533 |
| oldest row | 2026-09-13 (the table's first day) |
| unprocessed | 0 |
| highest `process_attempts` | 8 |
| total size | 2,192 kB |

That is roughly 120 rows a day, so size is not the reason to act - retention is.

## Ruled out: cascading from `events`

Checked and rejected, 2026-09-26. A foreign key from `webhook_events` to `events` does not
fit the table:

- A row has no single Event. One Meta notification can batch statuses for guests of several
  Events, and template-status or quality-rating notifications belong to no Event at all.
- The Event is not known when the row is written. The inbox stores first and parses second,
  on purpose, so a failed parse is a row to retry rather than a lost notification. Resolving
  an `event_id` at insert time would put parsing back in front of the store.
- It would only cover deleted Events. Guests of Events that are never deleted would keep
  their raw payloads forever just the same.

## What is already known

- `webhook_events_received_at_idx` on `received_at` exists, and its comment names "a future
  purge" as one of its reasons.
- Unprocessed rows (`processed_at is null`) are the retry queue. `webhook_events_unprocessed_idx`
  covers them and they must survive a purge, however old they are.
- The natural home is the Sweeper, `src/app/api/cron/sweep/route.ts`, which already runs the
  inbox pass every five minutes. The project runs its periodic work as Vercel crons, not
  `pg_cron`, so a fourth pass there fits better than a database job.
- The docstring on `sweepUnprocessedWebhookEvents` in `src/lib/webhooks/inbox.ts` still says
  "there is no cron". It predates the Sweeper and is stale.

## Open questions

- **The window.** 30 days after `processed_at` is the working proposal: long enough to
  answer "what did Meta send on the night of the send" for a recent Event, short enough
  that phone numbers do not linger. Nothing in the app reads a processed row, so the
  window only serves an Operator debugging by hand.
- **Unprocessed rows that never succeed.** A row that keeps throwing is kept forever as
  well. It needs either an attempt cap that marks it given up, or an Operator alert, before
  a purge could safely skip it.

## Done means

- Processed rows older than the chosen window are deleted on a schedule, in bounded
  batches.
- Unprocessed rows are untouched.
- The retention window is written down in an ADR, and the table comment and the stale
  "no cron" docstring say what actually happens.

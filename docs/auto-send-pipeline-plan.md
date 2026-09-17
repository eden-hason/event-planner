# Implementation plan: the automatic send pipeline

The build order for ADRs 0013-0016. One branch, one merge - there are no upcoming Events
with pending Schedules, so there is nothing to strangle.

**Deadline.** The 2026-11-05 Event has 274 Guest Records and `initial_invitation` sits at
`days_offset: -30`, so the first real automated send is around **2026-10-05**. It will be
the largest send Kululu has ever made (previous maximum: 206).

**Prerequisite.** Vercel Pro. Steps 1-2 can be built and tested locally without it;
nothing past step 3 can actually run on a once-a-day cron.

---

## Step 0 - Configuration

New environment variables, all read through one module (`src/lib/config/sending.ts`) so
nothing reaches for `process.env` inline:

| Variable | Default | Used by |
|---|---|---|
| `WHATSAPP_MAX_MPS` | `50` | Worker governor |
| `WHATSAPP_MAX_IN_FLIGHT` | `20` | Worker governor (added during the build: the governor bounds concurrency as well as rate, and the ceiling needed a name) |
| `SEND_WINDOW_START` / `SEND_WINDOW_END` | `09:00` / `21:00` | Dispatcher |
| `SMS_FALLBACK_SETTLE_MINUTES` | `10` | Sweeper |
| `SMS_FALLBACK_FREEZE_PCT` / `SMS_FALLBACK_FREEZE_MIN` | `30` / `10` | Sweeper |
| `SCHEDULE_MAX_LATENESS_HOURS` | `48` | Dispatcher |
| `ATTEMPT_REAPER_MINUTES` | `10` | Sweeper |
| `MAX_MANUAL_RECIPIENTS` | `10` | Manual send path |
| `CRON_SECRET` | existing | all three routes |

`WHATSAPP_MAX_MPS` exists so that a bad night is fixed from the Vercel dashboard, not from
a deploy.

---

## Step 1 - Migrations

Four files, `supabase/migrations/`, each with the leading `--` comment block explaining
*why*. Apply with `npx supabase db push`, never the MCP.

**1a. One Due Time.** Drop `schedules.scheduled_time`. Before dropping, rewrite
`scheduled_date` from it - `scheduled_time` is what a human typed, `scheduled_date` is what
the bug computed, and 55% of rows disagree. Historical rows do not matter, but a consistent
starting point costs one statement.

**1b. Dispatch state.** `schedules.dispatched_at timestamptz null`; add `expired` to
`schedule_completion_status`. New table `schedule_dispatch_attempts`:

```
id, schedule_id (fk, cascade), attempted_at, outcome, reason, deliveries_queued
outcome check in ('dispatched','held','expired','failed')
index on (schedule_id, attempted_at desc)
index on (attempted_at desc)              -- the Heartbeat reads this
```

Service-role only, RLS enabled with no policies, matching `webhook_events`.

**1c. The queue columns.** `message_deliveries.next_attempt_at timestamptz null` and
`send_payload jsonb null` - the fully rendered message, written by the Dispatcher and read
by the Worker (see step 4). Plus the partial index the claim query lives on:

```sql
create index message_deliveries_queued_idx
  on public.message_deliveries (next_attempt_at)
  where next_attempt_at is not null;
```

Partial because the queue is a tiny fraction of the table at any moment.

`send_payload` carries a Guest's phone number and name, so the Worker nulls it in the same
update that writes a terminal attempt result. It exists only while a Delivery is in flight,
which keeps both the table and the personal data in it bounded. Comment the column to say
so, as `webhook_events` does.

**1d. The claim.** `claim_delivery_batch(p_limit int)` - security definer, one statement,
`for update skip locked`. It selects queued Deliveries, nulls `next_attempt_at`, inserts a
`pending` **Delivery Attempt** for each, and returns `(delivery_id, attempt_id,
send_payload)` - everything the Worker needs and nothing more. This function *is* ADR 0014;
nothing else may claim a Delivery.

Note the interaction with `roll_up_message_delivery`: inserting a `pending` attempt alongside
an existing `failed` one leaves the Delivery at `failed` (pending ranks 0, failed ranks 1),
which is correct - a Delivery being retried has not un-failed.

**Verify:** `npx supabase db reset` replays everything from scratch and the guards pass.
Every one of these four migrations is destructive or backfilling, so each also ends with a
`raise exception` guard per `CLAUDE.md`.

---

## Step 2 - Shared pieces, no I/O

Pure modules, testable without a database or a network.

- **`src/lib/config/sending.ts`** - reads and validates step 0.
- **`src/features/schedules/utils/send-window.ts`** - `nextOpenSlot(instant): instant`.
  Hours in `ADMIN_TIME_ZONE`, plus the crude Shabbat block (Friday 15:00 -> Saturday 20:00).
  Must use the existing `ADMIN_TIME_ZONE` / `israelWallClockToIso`, never a second timezone
  source. See `docs/backlog/0002` for what this approximates.
- **`src/features/schedules/utils/whatsapp-failures.ts`** - extend with
  `isTransient(errorCode, httpStatus)` for 429 / 5xx / `130429` / `131056` / `133016`, and
  a `RETRY_BACKOFF_MINUTES = [1, 5, 15]`. Keep `classifyWhatsAppFailure` as it is; transient
  codes are already `system`, which is what keeps them out of the SMS batch.
- **`src/features/schedules/utils/governor.ts`** - a paced release at N per second with
  bounded in-flight concurrency, `halve()` on 429, and no recovery within a run.

**Fix in place:** `sendWhatsAppTemplateMessage` must stop flattening a thrown `fetch` into
the same shape as an HTTP rejection. Return a discriminated result - `accepted` /
`rejected(httpStatus, metaCode)` / `unknown`. ADR 0014 depends entirely on that distinction.

---

## Step 3 - Dispatcher

`src/features/schedules/services/dispatch-schedules.ts`, taking its Supabase client as a
parameter like every other service. Route: `src/app/api/cron/dispatch/route.ts`,
`Bearer ${CRON_SECRET}`, copying the existing `process-messages` route.

Per due Schedule (`dispatched_at is null`, `status is null`, `scheduled_date <= now()`,
`execution_kind = 'message'`, oldest first):

1. **Expire?** Event Date passed and type is not `post_event`, or Due Time more than
   `SCHEDULE_MAX_LATENESS_HOURS` ago -> `status = 'expired'`, log `expired` with the reason.
2. **Hold?** Outside the Send Window -> log `held` with the reason, move on. Nothing else
   happens: the audience is deliberately *not* expanded yet, so a Schedule held over
   Shabbat sends to the audience as it stands when it finally goes, not as it stood 29
   hours earlier.
3. **Claim.** `update schedules set dispatched_at = now() where id = $1 and dispatched_at is null`.
   Lost the race -> skip.
4. **Resolve and expand.** Reuse `resolveTemplatesForEvent`, `filterGuestsByTarget`,
   `validatePhoneNumber`, `recordNotSent`, `reserveDeliveries` - lifted from `sendSchedule`
   steps 5 to 8, essentially unchanged.
5. **Render and queue.** Per Delivery set `template_id` (the per-Guest table / no-table
   variant), build the full `ParameterResolutionContext` and render `send_payload` - the
   exact body that will be POSTed - then set `next_attempt_at = now()`. A Delivery whose
   payload cannot be rendered is **not** queued: the Schedule's dispatch is logged `failed`
   with the reason. Rendering here rather than at send time moves every content error to a
   place that has a log row and an Operator, instead of scattering it across per-Guest
   attempt failures.
6. **Log** `dispatched` with `deliveries_queued`, then nudge the Worker route.

Anything that throws is caught per Schedule and logged as `failed` with the message. That
single change is what ends the class of bug currently keeping three Schedules at
`status = null` for 23 days with no record of why.

---

## Step 4 - Worker

`src/features/schedules/services/drain-queue.ts`. Route:
`src/app/api/cron/send/route.ts`, `maxDuration = 300`.

1. `select pg_try_advisory_lock(hashtext('whatsapp-worker'))`. Not acquired -> return
   `{skipped: true}`.
2. Loop until the queue is empty or ~80% of `maxDuration` is spent:
   - `claim_delivery_batch(n)`
   - release each `send_payload` through the governor
   - update each attempt to `sent` / `failed`; on a transient rejection also set the
     Delivery's `next_attempt_at = now() + backoff[attemptCount]`
3. Release the lock (and rely on connection teardown as the backstop).

**The Worker knows nothing about the domain.** It reads `send_payload`, POSTs it, records
the outcome. No guests, no events, no templates, no parameter resolution, no joins beyond
the claim itself. That is the whole point of rendering at dispatch: the Worker is a pipe
with a rate limiter, and every piece of Kululu's message-building logic stays on the
Dispatcher side of the seam where it can fail loudly and once per Schedule.

Three consequences worth holding onto:

- **A retry resends identical bytes.** Nothing is re-derived, so attempt three cannot
  differ from attempt one because seating changed in between.
- **The payload is frozen at dispatch.** A table assignment made in the intervening seconds
  is not picked up - which the old engine could not do either, since it resolved once per
  send.
- **`send_payload` is a discriminated union on channel**, because a Schedule whose own
  channel is SMS dispatches through the same path: `{channel: 'whatsapp', to, templateName,
  languageCode, components}` or `{channel: 'sms', to, body}`.

---

## Step 5 - Sweeper

`src/app/api/cron/sweep/route.ts`, `*/5`. Three services called **in this order**, because
each depends on the one before:

1. **`sweep-webhook-inbox.ts`** - process `webhook_events` where `processed_at is null`,
   reusing `processWhatsAppWebhook`. Today a stuck row is only retried when a later
   notification arrives, and the last webhook of a burst has nothing after it.
2. **`reap-stranded-attempts.ts`** - `pending` attempts older than `ATTEMPT_REAPER_MINUTES`
   -> `failed`, `error_code = null`, a clear `error_message`. Null code is load-bearing:
   `classifyWhatsAppFailure(null)` is `system`, which keeps a stranded send out of the
   automatic SMS batch and in front of an Operator.
3. **`sweep-sms-fallback.ts`** - for each Schedule with failed Deliveries and no
   outstanding SMS fallback:
   - **settled?** no queued Deliveries, no `pending` attempts, no Delivery with
     `next_attempt_at` set, and no attempt activity within `SMS_FALLBACK_SETTLE_MINUTES`
   - **frozen?** guest-level failures above `SMS_FALLBACK_FREEZE_PCT` of attempts **and**
     at least `SMS_FALLBACK_FREEZE_MIN` -> record and send nothing
   - otherwise call **`sendSmsFallback(supabase, scheduleId, { limit })` unchanged**

The Freeze lives here and never inside `sendSmsFallback`, which is what keeps the Back
Office button working as the override.

---

## Step 6 - Heartbeat

`src/app/api/health/pipeline/route.ts`. 503 when there is no `schedule_dispatch_attempts`
row and no Worker heartbeat inside N minutes; 200 otherwise. Public, no secret, no data in
the body beyond timestamps. Point a free external monitor at it. It is not a **Signal** and
must not be rendered in the Back Office as one.

---

## Step 7 - Rewire the entry points, delete the rest

**Keep, rewritten:**
- `executeSchedule` (Owner send-now, `send-confirm-dialog.tsx`) -> set the Due Time to now,
  dispatch immediately, nudge the Worker, return "sending to N guests".
- One new manual path replacing `resendScheduleToSelected` - at most
  `MAX_MANUAL_RECIPIENTS`, hard-refused above it, synchronous, **and still claiming each
  Delivery through the same protocol**. The claim is the only thing stopping an Operator
  and the Worker sending to the same Guest at once.

**Delete:** `sendSchedule`, `revertOrCancel`, `message-processor.ts`,
`api/cron/process-messages/`, `trigger-schedule.ts`, `resend-schedule.ts`,
`admin/actions/batch-send.ts`, `admin/actions/quick-send.ts`, `admin/actions/verify-send.ts`
and their dialogs, and the `crons` entry for `process-messages`.

**Untouched:** `send-test-message.ts` - it creates no Delivery and is not one.

**Back Office reads:** `admin/queries/overview.ts` and `admin/queries/events.ts` currently
infer "never sent" from a null status. Point them at `schedule_dispatch_attempts` so an
Overdue Schedule can finally say *why*.

---

## Step 8 - Verify before merging

1. `npx supabase db reset` from scratch; all migration guards pass.
2. `npm run lint`, `npx tsc --noEmit`, `npm run build`.
3. Against local Supabase with WhatsApp credentials pointed at a test number:
   - dispatch a Schedule with two Guests; confirm two Deliveries queued, one
     `schedule_dispatch_attempts` row, `dispatched_at` set
   - set the Due Time to 23:00; confirm `held`, no Deliveries, and release at 09:00
   - set the Due Time to Friday 18:00; confirm held to Saturday 20:00
   - set the Due Time 72 hours back; confirm `expired`
   - kill the Worker mid-batch; confirm stranded `pending` attempts and that **rerunning
     sends nothing more** - this is the ADR 0014 test and the one that must not be skipped
   - run the reaper; confirm `failed`, null code, excluded from the fallback plan
   - force a 429; confirm the governor halves and `next_attempt_at` moves out
   - fail 40% of a 25-Guest Schedule with guest-level codes; confirm the Freeze holds and
     the Back Office button still overrides it
4. Two Workers at once: the second must return `{skipped: true}`.

---

## Step 9 - Cutover

One deploy. `process-messages` must leave `vercel.json` in the same commit the dispatcher
enters it - two schedulers running together is the only way this change sends a Guest the
same invitation twice.

```json
"crons": [
  { "path": "/api/cron/dispatch", "schedule": "* * * * *" },
  { "path": "/api/cron/send",     "schedule": "* * * * *" },
  { "path": "/api/cron/sweep",    "schedule": "*/5 * * * *" }
]
```

Then create one Schedule on the 3-Guest test Event, let the Dispatcher find it, and watch
it through. Do that before 2026-10-05.

---

## As built - deviations from the plan above

Two things changed during implementation. Both are recorded here rather than
quietly absorbed, because the plan is what the next person will read.

**The Worker's mutex is a lease, not `pg_try_advisory_lock`.** Step 4 called for
a session advisory lock. A session advisory lock is held by the Postgres
*session*, and every call from the application arrives over a pooled PostgREST
connection - the lock would be taken on one connection and released on another,
leaking a lock nothing can clear until the pool recycles. A lock that can
permanently wedge the entire send pipeline is worse than the concurrency it
prevents. `public.pipeline_locks` holds a short lease per named worker instead:
a Worker extends it while draining and clears it on the way out, and a Worker
that dies simply stops extending, which is the self-healing backstop step 4
wanted from connection teardown. Verified: two simultaneous Workers, and the
second returns `{skipped: true}`.

**There are five migrations, not four.** The fifth is that lock table, plus the
Heartbeat. It also seeds a `dispatcher` row, because step 6's Heartbeat cannot
read `schedule_dispatch_attempts` alone: the Dispatcher writes a row only when
it *considers* a Schedule, so a quiet week with nothing due is indistinguishable
from a dead cron - which is the single failure the Heartbeat exists to catch.
Both crons now record a heartbeat on every run, whether or not they found work,
and `/api/health/pipeline` requires both to be fresh.

**Two things step 8 could not verify locally, and why.** No seeded Event has
`host_details` or `invitations`, so the WhatsApp templates resolve their body
parameters to empty strings and Meta rejects the payload with `131008`. That is
seed data, not the pipeline - the renderer produces exactly what the old engine
produced - but it means a genuinely successful send cannot be observed against
the seed. The SMS Fallback reaches `sendSmsFallback` correctly and stops at "No
SMS version of invitation_casual", for the same reason. Everything either
side of the provider call is verified: dispatch, hold, expire, claim, retry
classification, the reaper, the settle gate and the lease.

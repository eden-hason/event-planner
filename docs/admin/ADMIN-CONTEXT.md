# Back Office - working context

Read this before touching anything under `src/app/(admin)/` or `src/features/admin/`.
It is durable: it describes how the Back Office works and what is not negotiable about it,
not what is currently being built. For vocabulary, `CONTEXT.md` at the repo root is
authoritative - **Back Office**, **Operator**, **Signal** and **Overview** are all defined
there and this document does not redefine them.

---

## What the Back Office is

The internal app Kululu staff use to run the business. It lives under `/admin`, routed by
subdomain through `src/proxy.ts`, and shares nothing with the Owner-facing app except the
database.

It does three jobs, and every page belongs to exactly one of them:

| Job | Question it answers | Route |
|---|---|---|
| **Overview** | What needs an Operator's attention right now? | `/admin` |
| **Operations** | What is happening on this one Event, and what can I do about it? | `/admin/operations`, `/admin/events/*`, `/admin/users/*` |
| **Configuration** | What do the catalogs contain, and what do they make the product generate? | `/admin/configuration` |

If a new page does not obviously belong to one of the three, that is a signal the design is
wrong, not that a fourth job is needed.

---

## The security law

**Every Back Office read and write, without exception:**

```ts
'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';

export async function someAdminQuery() {
  await assertAdmin();              // 1. gate, always first
  const supabase = createServiceClient();  // 2. only after the gate
  // ...
}
```

This is load-bearing and is not a style preference:

- `createServiceClient()` uses the **service role key and bypasses RLS entirely**. It is the
  only way to read across every user's Events, and it is also a loaded gun. A service client
  constructed before or without `assertAdmin()` is a full database leak.
- `assertAdmin()` is wrapped in React `cache()`, so calling it in the layout *and* in every
  query costs one round trip per render. There is no performance argument for skipping it.
- The layout gate (`src/app/(admin)/admin/layout.tsx`) is **not** sufficient on its own.
  Server Actions and route handlers are independently reachable and do not pass through the
  layout. Gate at the query, every time.

The rule is per-function, not per-file. A new export in an already-gated file still calls
`assertAdmin()` itself.

> **Known issue, deliberately out of scope here:** `public.profiles` has RLS *disabled*,
> so it is readable with the anon key by anyone. That is a real problem but it is a separate
> decision - do not "fix" it as a side effect of Back Office work, and do not rely on it.

---

## Where code goes

Standard feature layout (see root `CLAUDE.md`), with one Back Office-specific rule:

```
src/features/admin/
  queries/     server-only reads. 'use server'. assertAdmin + service client.
  actions/     Server Actions for mutations. Same gate.
  components/  Back Office UI only.
  types.ts     view models. No Zod.
  index.ts     barrel - components, types, actions. NEVER queries.
```

`src/features/admin/index.ts` currently re-exports `./queries`, which violates the barrel
rule in `CLAUDE.md` - server-only modules must not be reachable from a barrel a client
component can import. Do not copy that pattern in new code; import queries directly from
`@/features/admin/queries`.

The Back Office is a **UI surface, not a domain owner**. Where a domain already exists
elsewhere (`@/features/calls`, `@/features/schedules`), admin re-exports its types rather
than redefining them. `src/features/admin/types.ts` already does this for the call domain and
says so in a comment. Keep it that way.

---

## Signals are derived, never stored

This is the single most important thing to understand about the Overview.

There is no `signals` table, no `is_resolved` column, and no dismissal. A Signal is computed
at read time from a predicate over existing rows. It appears when the predicate becomes true
and disappears when the situation is fixed. Nothing tracks whether an Operator saw it.

Consequences that catch people out:

- **Never** add a "dismiss" or "mark as read" affordance. Dismissing a Signal would mean
  storing state about a thing that has no identity of its own.
- Signal identity is a **derived composite key**, `${kind}:${sourceRowId}`, used as a React
  key and nothing else. It is not stable across a fix-then-regress cycle, and must not be
  persisted or used in a URL.
- A Signal must always link somewhere an Operator can *act*. A Signal you cannot act on is
  a metric wearing a costume, and belongs in the count strip instead.

### Presentation rules that carry meaning

Two behaviours are part of what a Signal *means*, not styling, so they live here
rather than in a design file:

- **Above 6 Signals the list groups by kind** in rank order, capped at 4 per group, with
  the remainder as a "N more in Operations" link. A flat wall of 20 rows is a failure of the
  page, not of the data. The overflow is always a link - never a dismiss.
- **Severity is carried by icon, weight and order, not by colour.** There is `--destructive`
  and `--success` and no `--warning`. Only the two failure kinds take colour; a Stale Call
  Round is bookkeeping and stays grey. A page where everything is red teaches the Operator to
  scroll past it.

### The three predicates

These are the definitions. If a page shows something that does not match one of these
exactly, the page is lying to the Operator.

| Signal | Predicate | Why it means something |
|---|---|---|
| **Overdue Schedule** | `schedules.status IS NULL AND scheduled_date < now()` | The send should have gone out and did not. Almost always a failure in cron or message processing - the product silently let a paying customer down. |
| **Failed Delivery** | `message_deliveries.status = 'failed'`, created within the last 30 days, grouped by Event | Specific Guests never received the message. `error_code` carries the WhatsApp reason. |
| **Stale Call Round** | `call_rounds.completed_at IS NULL AND created_at < now() - interval '3 days'` | A round somebody started and walked away from. Round Completion is a deliberate act (see `CONTEXT.md`), so an old open round means a human forgot, not that Guests are unreachable. |

No grace period on Overdue Schedule: if the clock has passed and the row is not `sent`, it is
overdue. The 3-day threshold on Stale Call Round is a judgement call, not a fact - it lives in
one named constant so it can be changed in one place.

---

## What the schema actually supports

Read this before inventing a metric. Several enum values exist but are never written, and a
page built on them renders a confident zero.

**`schedules.status` is `schedule_completion_status`, whose only values are `sent` and
`cancelled`.** There is no `pending`, `scheduled`, `failed`, or `overdue`. `NULL` means "not
yet completed". This is why Overdue Schedule has to be derived - the database has no concept
of it. The type name is honest: it records *completion*, not lifecycle.

**`message_deliveries.status` is `delivery_status`: `pending, sent, delivered, read,
failed`.** In practice only `sent` and `failed` are ever written. `delivered`, `read` and
`clicked_at` are not wired to anything. **Do not build read rates, open rates, or engagement
funnels** - they would all report 0% and be believed.

**Draft Events are excluded from business counts.** `events.status` is `draft` or `published`.
A Draft Event is interest, not an Event the user has (see `CONTEXT.md`), and folding the two
together overstates the business. `listUsers` in `queries/users.ts` already counts them
separately and comments on why - follow it.

**`events` has no foreign key to `profiles`.** `events.user_id` points at `auth.users`, so
PostgREST cannot embed the owner - `events?select=...,profiles(...)` fails with `PGRST200`.
Look the owner up separately and key by `user_id`. `getUpcomingEvents` does this and says so.

**Guest Record vs Guest.** One row in `guests` is one **Guest Record** and is the billable
unit. `guests.amount` is how many actual **Guests** that record covers. `count(*)` gives
Guest Records; `sum(amount)` gives Guests. Label counts with the word that matches the query,
because the two numbers differ by a large factor and mixing them up misstates revenue.

---

## Conventions

- **Rendering:** Back Office pages are dynamic, never cached. The Operator is looking at the
  Back Office precisely because they need to know the current state. Correctness over
  freshness tricks.
- **Direction:** the Owner app is RTL; the Back Office is explicitly `dir="ltr"` and is not
  localised. Back Office copy is English and hardcoded - do not add it to `messages/`.
- **Copy:** repo rules apply - no em dashes, no trailing periods on single-line UI text.
- **Empty states are designed states.** "Nothing needs your attention" is the *good* outcome
  and should look like one, not like a failed fetch.
- **Numbers get their unit.** "1,011 guest records", not "1,011".

---

## Deliberately not here

Things that are real but are separate decisions, recorded so nobody re-derives them:

- Editing Configuration catalogs (`event_types`, `schedule_types`, `message_templates`,
  `event_type_default_schedules`) through the UI. Today these change only through migrations.
  `message_templates.whatsapp_template_name` must match a Meta-approved template exactly, and
  nothing on our side can validate that - a form field there breaks live sends silently.
- Enabling RLS on `public.profiles`.
- Any Signal that needs a business-health threshold ("event soon, confirmation too low").
  Every predicate above is a system-failure fact, not a judgement about a campaign, and mixing
  the two makes the queue arguable instead of actionable.

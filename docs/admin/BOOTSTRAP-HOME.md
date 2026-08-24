# Bootstrap: Back Office shell + Overview

One-shot build spec. Once the work is done and merged this document has served its purpose -
the durable rules live in `docs/admin/ADMIN-CONTEXT.md` and the vocabulary in `CONTEXT.md`.

**Read first:** `docs/admin/ADMIN-CONTEXT.md`, then the Back Office / Operator / Signal /
Overview entries in `CONTEXT.md`. This spec assumes both.

---

## Goal

An Operator opens `/admin` and, without clicking anything, knows whether the business needs
them today.

The Overview is an **attention queue with counts for context** - not a metrics dashboard.
At current scale (13 users, 10 published events) a wall of KPI tiles and trend lines is theatre;
"3 deliveries failed on the Cohen wedding" is not. Build the queue well and let the counts be
a thin strip.

---

## Scope

| | |
|---|---|
| **Build** | New Back Office shell (layout + nav), and `/admin` Overview in full |
| **Delete** | `/admin/users/*`, `/admin/events/*` and every component, query and action serving them. Superseded by a later decision: the Operations logic is being rebuilt separately. |
| **Stub** | `/admin/operations`, `/admin/configuration` - a heading and a one-line "not built yet", nothing more |
| **Do not touch** | `public.profiles` RLS. Any migration. The catalog tables. |

`/admin` currently `redirect()`s to `/admin/events`. That redirect goes away - `/admin`
becomes a real page.

Discard freely: `admin-sidebar.tsx` and the current layout's styling. Carry forward without
question: the `assertAdmin()` + `createServiceClient()` pattern in every query.

---

## Files

```
src/app/(admin)/admin/
  layout.tsx                    rewrite - new shell
  page.tsx                      rewrite - was a redirect, becomes the Overview
  operations/page.tsx           new - stub
  configuration/page.tsx        new - stub

src/features/admin/
  queries/overview.ts           new - getOverviewCounts, getSignals, getUpcomingEvents
  components/
    back-office-nav.tsx         new - replaces admin-sidebar
    count-strip.tsx             new
    signal-list.tsx             new
    signal-row.tsx              new
    upcoming-events.tsx         new
  types.ts                      extend - view models below
```

Export the new components and types through `src/features/admin/index.ts`. Do **not** export
`queries/overview.ts` through the barrel - import it directly from
`@/features/admin/queries/overview`.

---

## Data layer

`src/features/admin/queries/overview.ts`. Three exported functions, each opening with
`await assertAdmin()` then `createServiceClient()`. Page-level `export const dynamic =
'force-dynamic'`.

Put the stale threshold in one named constant at the top:

```ts
const STALE_CALL_ROUND_DAYS = 3;
const FAILED_DELIVERY_LOOKBACK_DAYS = 30;
const UPCOMING_WINDOW_DAYS = 30;
```

### `getOverviewCounts(): Promise<OverviewCounts>`

| Field | Query | Note |
|---|---|---|
| `users` | `count(*)` on `profiles` | includes admins - excluding them would disagree with the Users page |
| `events` | `count(*)` on `events where status = 'published'` | Draft Events excluded |
| `guestRecords` | `count(*)` on `guests` joined to published events | Guest **Records**, the billable unit |

Label the third one "guest records", not "guests". `sum(amount)` would be a different and
much larger number (see `ADMIN-CONTEXT.md`).

### `getSignals(): Promise<Signal[]>`

Three independent queries, merged and sorted in TypeScript.

**Overdue Schedule** - `schedules` where `status IS NULL AND scheduled_date < now()`, joined
to its Event and `schedule_types` for the stage name. One Signal per schedule.

**Failed Delivery** - `message_deliveries` where `status = 'failed'` and
`created_at > now() - 30 days`. **Group by Event**, not one Signal per row: 40 failures on one
Event is one problem, not 40. Carry the count, the Event, and the distinct `error_code`s.

**Stale Call Round** - `call_rounds` where `completed_at IS NULL` and
`created_at < now() - 3 days`, joined to its Event. One Signal per round.

Sort: **severity rank, then oldest first.** Overdue Schedule (0) outranks Failed Delivery (1)
outranks Stale Call Round (2), because an unsent schedule means the whole campaign stalled
while a failed delivery affects some Guests and a stale round is only bookkeeping. Within a
rank, the thing that has been wrong longest goes on top.

### `getUpcomingEvents(): Promise<UpcomingEvent[]>`

Published events with `event_date` between `now()` and `now() + 30 days`, soonest first.
For each: title, date, event type name, owner name/email, Guest Record count, confirmed
count, and confirmation rate.

Confirmation rate is `confirmed / total` over **Guest Records** (`guests.rsvp_status =
'confirmed'`). Use one aggregate query over `guests` keyed by `event_id` rather than a query
per event.

---

## View models

Add to `src/features/admin/types.ts`:

```ts
export type OverviewCounts = {
  users: number;
  events: number;
  /** Guest Records - one row per guest list entry, the billable unit. */
  guestRecords: number;
};

export type SignalKind = 'overdue_schedule' | 'failed_delivery' | 'stale_call_round';

/**
 * Derived at read time, never stored. See docs/admin/ADMIN-CONTEXT.md.
 * `id` is a composite key for React only - do not persist it or put it in a URL.
 */
export type Signal = {
  id: string;                // `${kind}:${sourceRowId}`
  kind: SignalKind;
  eventId: string;
  eventTitle: string;
  /** What is wrong, in one line: "Confirmation was due 2 days ago" */
  headline: string;
  /** Supporting fact: "scheduled 22 Aug 09:00, never sent" */
  detail: string;
  /** When the condition began. Drives sort order and the age label. */
  occurredAt: string;
  /** Where the Operator goes to act on it. Always actionable. */
  href: string;
};

export type UpcomingEvent = {
  id: string;
  title: string;
  eventDate: string;
  eventTypeName: string;
  ownerName: string;
  guestRecords: number;
  confirmed: number;
  /** 0-1. Null when the guest list is empty - do not render 0% for "no list yet". */
  confirmationRate: number | null;
};
```

---

## Layout

```
Overview                                          Thursday, 24 August

[ 13 users ]  [ 10 events ]  [ 1,011 guest records ]

NEEDS ATTENTION (2)
  !  3 deliveries failed - Cohen wedding
     error 131049 x2, 63016 x1                              2 days ago
  !  Call Round 2 open 7 days - Levi henna
     40 of 120 guests called                                7 days ago

UPCOMING (3 in the next 30 days)
  Cohen wedding        12 Sep    184 records    62% confirmed
  Levi henna           19 Sep    120 records    31% confirmed
  Mizrahi bar mitzva    2 Oct     96 records     8% confirmed
```

Three bands, in this order and this proportion. The count strip is one line and visually
quiet - it is context, not the headline. Needs Attention is the visual centre of the page.

Each Signal row: severity marker, headline, detail line, relative age on the right, whole row
links to `href`. Rank order is meaningful, so do not let styling suggest otherwise.

Each upcoming row links to `/admin/events/[eventId]`. Show the confirmation rate as a number
with a small proportion bar; a rate under 30% within 14 days of the date may be de-emphasised
visually but is **not** a Signal - that judgement was deliberately left out.

### Empty and degenerate states

- **No Signals** - the good outcome, and it should read as one: "Nothing needs your attention"
  with calm styling. Not a blank area, not an error-coloured box.
- **No upcoming events** - "No events in the next 30 days".
- **Empty guest list** - `confirmationRate` is `null`; render "no guest list yet", never "0%".
- **A query fails** - that band shows it failed. Never render a zero count for a failed query;
  a false "0 users" is worse than a visible error.

---

## Done when

1. `/admin` renders the Overview. The old redirect is gone.
2. Every exported function in `queries/overview.ts` calls `assertAdmin()` before constructing
   a service client. No exceptions, including any helper added later.
3. The three Signal predicates match `ADMIN-CONTEXT.md` character for character.
4. Failed deliveries are grouped by Event, not listed per row.
5. Signals sort by severity rank, then oldest first.
6. Nav shows Overview, Users, Events, Operations, Configuration. Users and Events reach the
   existing pages and those pages still work.
7. `/admin/operations` and `/admin/configuration` render a stub without erroring.
8. Every Signal row links somewhere the Operator can act.
9. There is no dismiss, snooze, or mark-as-read affordance anywhere.
10. Nothing renders `delivered`, `read`, `clicked_at`, an open rate, or a read rate.
11. Counts exclude Draft Events; the guest number is labelled "guest records".
12. Empty states are designed, and a failed query never renders as a zero.
13. `npm run lint` and `npm run build` pass.

**Sanity check against production data as it stands:** the page should show 2 Signals (one
failed delivery, one Call Round open 7 days), 0 overdue schedules, and 3 upcoming events.
Counts read 13 users, 10 events, 1,011 guest records - 10 and not 11, because one of the
eleven events is a Draft Event. If you see 0 Signals or a wall of them, a predicate is wrong.

**Signal links 404 until Operations is rebuilt.** Every Signal points at
`/admin/events/[eventId]`, which is the correct destination but does not exist yet. This is
known and deliberate: pointing them at a stub would bake in a wrong target.

---

## Out of scope

New migrations. Editing catalogs. RLS changes. Restyling `/admin/users` or `/admin/events`.
Charts, trends, or growth over time. Any Signal needing a business-health threshold.

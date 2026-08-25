# Back Office Operations - Implementation Brief

**For:** the implementation pass
**Date:** 2026-08-25
**Product:** Kululu - event guest management for the Israeli market
**Design:** Claude Design project `8a7239cf-a2f6-4d32-91c5-ab7c27aa89a4`,
file `Back Office Operations.dc.html` (artboards `2a`, `2c`, `2d`, `2e`)

This is the sibling of
[`back-office-overview-brief.md`](./back-office-overview-brief.md) but not the
same genre. That one was a design brief written before anything was drawn. The
design now exists, so what is missing is a build plan. Art direction (§4),
constraints (§8) and out of scope (§10) of the Overview brief are **inherited by
reference** and are not restated here.

Vocabulary is binding and lives in [`CONTEXT.md`](../../CONTEXT.md). How the Back
Office works, the security law, and what the schema actually supports live in
[`docs/admin/ADMIN-CONTEXT.md`](../admin/ADMIN-CONTEXT.md). The plan-vs-execution
model for calls lives in
[`docs/adr/0004-call-schedules-are-plans-call-rounds-are-executions.md`](../adr/0004-call-schedules-are-plans-call-rounds-are-executions.md).
None of those are restated and none are overruled.

---

## 1. What this supersedes

The nine decisions behind the design came out of a grilling session on
2026-08-24 and were recorded in `uploads/operations-tab-handoff.md` inside the
Claude Design project, never in this repo. That handoff remains the record of
*why* the surfaces are shaped the way they are, and §2 decisions 1, 3, 4, 5, 6,
7 and 8 stand unchanged.

A second grilling session on 2026-08-25 compared the finished design against
that handoff and against the live schema. **This document is now binding where
the two disagree.** Section 3 lists every amendment and why it exists. Two
handoff decisions are amended:

- **Decision 2** - the 14-day horizon is dropped. See §3.1.
- **Decision 9** - scope grows by a top bar in the shared layout. See §3.2.

The handoff's `docs/design/back-office-operations-brief.md` instruction in its §8
is satisfied by this file.

---

## 2. The surfaces

`Back Office Operations.dc.html` is the visual spec. Build what it shows, subject
to section 3. Ignore any artboard belonging to the Events tab.

| Artboard | Route | What it is |
|---|---|---|
| `2a` | `/admin/operations` | Cross-event queue of planned work |
| `2c` | `/admin/events/[eventId]` | Event header plus one unified outreach timeline |
| `2d` | `/admin/events/[eventId]/rounds/[roundId]` | The calling surface |
| `2e` | - | Add call round, Start confirm, Send now confirm, Resend picker |

The design answers the four questions the handoff left open in its §4, and those
answers are now decisions:

1. **Call rows carry weight, message rows do not.** A call row is a card:
   `--card` background, `shadow-xs`, foreground-weight title, foreground icon,
   and a **primary** action button. A message row is flat: transparent
   background, `--fg2` title at normal weight, muted icon, **secondary** button.
   The reasoning is in handoff §3A - a call is the job, a message send is a
   rescue - and it is solved by weight rather than by a third colour.
2. **The queue groups by date**, not by event and not flat.
3. **The sent panel expands inline** in the timeline, keeping chronology.
4. **The calling surface is a dense table**, not a card stack.

---

## 3. Amendments to the design

Ten changes. Each one exists because the design shows something the schema
cannot support, or because it contradicts a binding rule.

### 3.1 No horizon. The queue lists all open planned work

The design subtitle reads "next 14 days and everything overdue". Drop the
horizon entirely: every `schedules` row with `status IS NULL` on a published
event, grouped by date, oldest first.

The 14 days was listed in the handoff under "assumptions stated and not
challenged" with no rationale, and production says it starves the page. Of nine
open items, **three** fall inside 14 days and all three are messages. The single
open call plan sits outside it. A page whose stated justification is "the row
Overview will never show, a call plan no cron will ever run" would have launched
without a single call row on it.

Rewrite the subtitle accordingly. "Every unsent message and unstarted call round,
across all events" is accurate; "next 14 days" is not.

Overdue rows still get their own pinned group above the dated ones, per handoff
§3A. Grouping is what keeps an unbounded list scannable.

### 3.2 The top bar goes in the shared layout

`src/app/(admin)/admin/layout.tsx` has no header today. The design puts a 56px
bar on every screen carrying search on the queue and a breadcrumb on the
drill-downs, plus the date on the right.

Build it in the shared layout, so it appears on Overview too. Handoff decision 9
scopes a header search across event title, owner name and owner email, and a
header that existed only on Operations would read as a bug. The Overview page's
existing title block has to reconcile with the new bar rather than duplicate it.

### 3.3 Stub badges: keep three, hide when active

The design drops the Stub badge from Users and Events. Both index pages still
render "Not built yet", so the badge stays on **Users, Events and Configuration**
and is dropped from **Operations** only, exactly as handoff decision 9 says.

Adopt the design's one improvement here: `navFor` suppresses the badge on
whichever item is active. `back-office-nav.tsx` renders it unconditionally today.
Gate it as `stub && !isActive`, so the Events item loses its badge while an
Operator is on the event workspace. The badge describes the index you would
reach by clicking, and you are not clicking it.

### 3.4 The event workspace is an Events destination

Artboard `2c` contradicts itself: the sidebar highlights Events, the breadcrumb
reads "Operations / Cohen wedding". The highlight is right.

`/admin/events/[eventId]` keeps its URL, **Events** lights up in the sidebar, and
the breadcrumb reads "Events / Cohen wedding" rooting at the Events index. That
index is a stub today and the breadcrumb root is therefore a dead end, which the
Stub badge already advertises.

This also makes four existing links correct for free:
`queries/overview.ts:136,180,227` and `components/upcoming-events.tsx:34` already
point at `/admin/events/${id}` and currently 404.

### 3.5 The sent panel shows sent and failed. Never skipped

The design renders "181 sent, 3 failed, 0 skipped" in both the timeline row and
the expanded panel. **`skippedCount` is never persisted.** It is computed at send
time at `services/send-schedule.ts:310` as targeted-minus-guests-with-valid-phones,
returned in the outcome, and thrown away. A guest skipped for a missing phone
leaves no row in `message_deliveries` at all.

Rendering it later means re-deriving "who was targeted" from today's guest list,
after phones were fixed and RSVPs moved. That is the confident-zero failure
`ADMIN-CONTEXT.md` warns about, and it is the same trap the handoff already
caught with the rendered message body in decision 6, where storing it was
offered and declined.

Show **sent** and **failed** only. Both are exact `message_deliveries` row counts.

### 3.6 The cancelled row carries attribution, not a date

The design reads "Cancelled by owner 10 Aug". `schedules` has no `cancelled_at`
and no `cancelled_by`. It has `updated_at`, which the `update_schedules_updated_at`
trigger bumps on every write, and cancellation is a **toggle** at
`actions/schedules.ts:137` (`enabled ? null : 'cancelled'`) that the owner can
flip back.

The attribution half is true by construction: only the owner can reach that
action, and `isMessageScheduleRow` blocks call rounds from it. Keep it, drop the
date. Render "Cancelled by owner". The left rail still shows `scheduled_date`,
which is the date a timeline actually wants. **Nothing on any screen may derive
from `updated_at`.**

### 3.7 "Sent by schedule" and "Sent manually"

The design reads "Triggered by cron". `message_deliveries.triggered_by` holds
`'scheduled'` or `'manual'` and nothing else. Map them to "Sent by schedule" and
"Sent manually".

### 3.8 No third alarm colour

`ADMIN-CONTEXT.md` is explicit: severity is carried by icon, weight and order,
not by colour, and there is `--destructive` and `--success` and no `--warning`.

The design puts an amber warning triangle on the stale-template caveat. Replace
it with a **bordered callout**: muted background, neutral info icon,
foreground-weight text, sized so it reads as a statement rather than fine print.
Handoff §3B requires that caveat be read rather than skipped, because an Operator
uses that panel to answer customer complaints, and structure carries it. Do not
use `--destructive` either - red inside a panel for a send that succeeded reads
as "this send failed", and it would compete with the failure list directly above.

The **RSVP tri-colour stays.** Pending amber, confirmed emerald, declined red is
categorical vocabulary the product already speaks: the Owner dashboard uses
`amber-400 / emerald-500 / red-400` inline and `guests-page.tsx:75-77` does the
same. It is a taxonomy, not a severity scale, and it needs no new tokens.

The resend picker's destructive warning about the missing double-send guard is
correct as designed. Keep it.

### 3.9 The count strip partitions the rows

The design's strip reads "3 call rounds to start, 5 messages scheduled, 2
overdue" above eight rows that are four calls and four messages. Nothing
reconciles, because it is ambiguous whether overdue is a third bucket or an
overlay on the first two.

Drop the overdue stat. The strip carries two buckets that sum exactly to the row
count, and the Overdue group header already says "2 items". Handoff decision 2
warns that a queue drifting into failure conditions becomes a second Overview and
the Operator stops trusting which page is authoritative. Overview already derives
Overdue Schedule as its top-ranked Signal; a headline stat here would make the
same row shout in three places.

Follow the existing `count-strip.tsx` doctrine: context, not the headline, one
quiet line rather than stat cards, and every number carries its unit.

### 3.10 Row titles come from the catalog, not from imagination

The design's titles are not producible. The catalog holds **one** `phone_call`
schedule type, `key: phone_call`, `name: "Call Round"`. There is no "Confirmation
round 2" and no "Table seating calls". The message types are Initial Invitation,
Confirmation, Event Reminder and Thank You, so "Save the date", "Table seating
reminder" and "Second save the date" do not exist either. `schedules` has no
`label` column.

Reuse the Owner app's convention verbatim, at
`components/schedules-page.tsx:207`: the catalog name, suffixed with a positional
index when an event has more than one of that type.

```
Call Round 1      Call Round 2      Confirmation 2      Event Reminder
```

This costs the design its expressiveness, and the icon and sub-line have to carry
more of the call-vs-message distinction as a result. It buys two things: no
migration, and the Back Office saying the same words the couple sees in their own
app, which matters when the Operator is on the phone with them.

---

## 4. Assumptions adopted

Stated so they are not re-litigated, and so they can be objected to in review.

- **Send now passes `skipAlreadyDelivered: true`.** The design's confirm copy
  promises "Guests who already received this send are skipped", and handoff
  decision 5 does not mention the flag. A `status IS NULL` schedule can still
  carry deliveries from an earlier selective resend, so this is the safe reading
  and the copy stays as designed.
- **Impersonation is not built and leaves the copy.** The current stub promises
  "call rounds, manual sends and impersonation". It is in neither the handoff's
  scope nor the design. Drop it from the copy rather than leave a promise
  hanging.
- **Reopen needs no decision.** Handoff §3C puts Finish, Reopen and Delete on the
  round surface; artboard `2d` shows Finish and Delete because it depicts an
  in-progress round. A completed round offers Reopen in Finish's place.
- Everything the handoff listed as stated-and-unchallenged still holds: Round
  Completion stays an explicit Finish, confirm dialogs show recipient counts,
  `recordCallOutcome` keeps writing `rsvp_status` with source `admin_call` and
  `guests.amount` on confirm, and the Back Office stays LTR, English, hardcoded
  and dynamically rendered.

---

## 5. Invariants the rewrite must re-derive

Handoff decision 7 is a from-scratch rewrite with the deleted implementation at
`git show c6335cb^:<path>` as reference only. These four were paid for once and
are the reason that carries risk.

1. **Start claims the plan with an optimistic `status IS NULL -> 'sent'` update**,
   not read-then-write. Two Operators clicking Start must not both get a round.
   Backstopped by `call_rounds_schedule_id_key`, the partial unique index at
   `20260814000001_link_call_rounds_to_schedules.sql:75`.
2. **The Start snapshot targets the plan's `target_status`**, never a hardcoded
   `'pending'`.
3. **Every mutation revalidates both surfaces**, and the Owner-side path must be
   the dynamic pattern **including its `[locale]` segment**:
   `revalidatePath('/[locale]/app/[eventId]', 'layout')`. The handoff recorded
   this as `/app/[eventId]` with `type: 'page'`, which is wrong twice - the real
   route is `src/app/(main)/[locale]/app/[eventId]`, so the locale segment is
   required, and `'page'` would miss `schedules`, `dashboard` and `guests`, which
   all sit below that segment and all read this data. A literal `'/app'` matches
   no route at all and fails silently. Existing Owner-side actions still use the
   literal `'/app'` (`actions/schedules.ts`, `actions/execute-schedule.ts`) and
   are therefore not revalidating anything - a pre-existing bug, out of scope
   here, worth fixing separately. Lives in
   `features/schedules/services/revalidate-outreach.ts` so both features share
   one implementation.
4. **`deleteCallRound` returns the plan to `status = NULL`** so it stays
   restartable rather than frozen.

   This is only possible because migration `20260814000000_add_phone_call_schedule_type.sql`
   **narrowed** the `prevent_sent_schedule_mutation` trigger to message schedules:

   ```sql
   IF OLD.status = 'sent'
      AND public.schedule_type_is_message(OLD.schedule_type_id) THEN
   ```

   The trigger is not bypassed by the service role, so before that narrowing
   this invariant was impossible. A sent message really is immutable; a claimed
   call plan is not. Verified against the local database: releasing a call plan
   succeeds, releasing a sent message raises.

And the law that outranks all of them, from `ADMIN-CONTEXT.md`: **`assertAdmin()`
first, `createServiceClient()` only after.** Per function, not per file. The
service client bypasses RLS entirely and the layout gate does not cover Server
Actions.

---

## 6. The data is real and it is small

A snapshot of production taken 2026-08-25:

| | |
|---|---|
| Published events | 9 (plus 1 draft, excluded everywhere) |
| Guest Records | 1,010, covering 1,508 Guests |
| Open planned work, all time | 9 items across 3 events |
| ...messages / call plans | 8 / 1 |
| ...overdue | 0 |
| ...inside 14 days | 3 |
| Open call rounds | 1 |

Two consequences, the same pair the Overview brief drew:

- **The queue holds nine rows and no overdue group.** A layout that needs volume
  to look right will look broken on day one. The design's eight-row mock is
  roughly the real size, which is lucky rather than intended.
- It still has to survive forty rows without redesign, which is what date
  grouping is for.

Draft Events are excluded from the queue and from every count. A Draft Event
cannot have schedules.

---

## 7. States to build

The design supplies the populated case for every surface. These are the ones it
does not draw and that must still exist:

- **Queue, nothing planned.** The good outcome, and it should look like one
  rather than a failed fetch, same doctrine as Overview's no-Signals state.
  "Nothing planned" plus a line explaining that sent and cancelled items live on
  each event page. Rare now that the horizon is gone, not impossible.
- **Queue, overdue group absent.** The common case today. The dated groups start
  straight away with no empty header.
- **Event workspace, empty timeline.** A published event with no schedules yet.
- **Round with every guest called.** Progress reads 120 of 120 without turning
  into a congratulation. Handoff §3C: progress without pressure.
- **Sent panel with zero failures.** The failure list disappears rather than
  rendering an empty heading, and the collapsed success count carries the panel.
- **Loading and error** for each band, matching the Overview's skeleton and
  "didn't load" conventions.

---

## 8. Route and file plan

Handoff decision 8 stands: code lands by domain, because the Back Office is a UI
surface and not a domain owner.

```
src/app/(admin)/admin/
  layout.tsx                              modify - add the top bar (§3.2)
  operations/page.tsx                     replace the stub
  events/[eventId]/page.tsx               new
  events/[eventId]/rounds/[roundId]/page.tsx  new

src/features/calls/actions/               startCallRound, finishCallRound,
                                          reopenCallRound, deleteCallRound,
                                          recordCallOutcome, createCallPlan,
                                          rescheduleCallPlan
src/features/schedules/actions/           triggerScheduleAdmin, sendManualMessages
                                          (beside the existing executeSchedule)
src/features/admin/queries/               the cross-event queue read, the event
                                          workspace read, the header search
src/features/admin/components/            all Back Office UI, new
```

`src/features/admin/index.ts` currently re-exports `./queries`, which violates the
barrel rule. Do not copy it. Import queries directly from
`@/features/admin/queries`.

Compose from `src/components/ui/`. The Overview brief §8 lists what is available.

**No migration.** Every decision in section 3 was chosen to avoid one.

---

## 9. Out of scope

Inherited from the Overview brief §10, plus:

- The Events index, the Users index, and per-event guest management
- Configuration, and any catalog editing
- Impersonation
- Any new schedule type, and any `schedules.label` column
- Anything in the Owner-facing app beyond the revalidation in invariant 3

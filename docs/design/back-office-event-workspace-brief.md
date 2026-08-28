# Back Office Event Workspace - Design Brief

**For:** Claude Design
**Date:** 2026-08-28
**Product:** Kululu - event guest management for the Israeli market

This is an **internal staff tool**, not the product. Nothing from
[`onboarding-flow-brief.md`](./onboarding-flow-brief.md) carries over: no Hebrew,
no RTL, no marketing brand, no emotional payoff.

Read [`back-office-overview-brief.md`](./back-office-overview-brief.md) first.
Its art direction, its density, and its rule about severity colour are binding
here and are not restated in full. This page lives inside the shell that brief
designed.

Vocabulary is binding and defined in [`CONTEXT.md`](../../CONTEXT.md) - in
particular **Operator**, **Signal**, **Guest** vs **Guest Record**, **Call
Round**, **Call Outcome**, and **Free to Plan, Pay to Send**. The structural
decisions behind this brief are
[ADR-0006](../adr/0006-back-office-event-page-is-tabbed-with-no-overview-tab.md)
and
[ADR-0007](../adr/0007-the-back-office-is-a-second-writer-of-the-guest-list.md);
this brief does not overrule them.

---

## 1. What we are designing

The Back Office page for a single Event, at `/admin/events/[eventId]`. It is
being restructured from one long stack of bands into a pinned header plus three
tabs.

Design:

1. **The workspace shell** - pinned Signals, pinned Identity, the tab bar
2. **The Guests tab** - the summary rollup and, new, a per-guest table
3. **The guest sheet** - the detail and edit surface behind a table row
4. **The Billing tab** - the commercial state of the Event
5. **The Draft Event** state, which has no tabs at all

The **Outreach tab inherits** its contents. See section 8.

## 2. Who this is for

Three or four Kululu staff, on a laptop. They know the product intimately.

The most common reason one of them opens an Event is **to check on an account** -
is this event healthy, did they pay, are they actually using it - with no
specific fix in mind. The second most common is to answer a question an Owner
just asked on the phone, usually about one guest.

Both of those are lookups. Design for reading first and acting second. That is a
change of emphasis from the Overview, which is a queue.

## 3. The thesis

**The header answers "how is this event", the tabs answer "show me".**

Everything needed to judge the account at a glance is pinned above the tab bar
and never moves: what the event is, when it is, who owns it, and whether
anything is broken. The tabs below are where an Operator goes to look something
up or do something.

This is why **there is no Overview tab**. Once the header carries the health
check, an Overview tab could only restate the other three, and two places that
say the same number will eventually say different numbers. Do not add one back.

The tab bar carries counts, and counts only: `Guests 240`, `Outreach 6`. Muted,
tabular, no dots and no colour. The counts exist so the account check finishes
without a click. **Signals are the only element on this page allowed to say
something is wrong** - the Overview brief's severity rule applies unchanged, and
a badge on a tab would be a second, competing vocabulary for trouble.

## 4. The pinned header

Two things, in this order, above the tab bar.

**Signals**, when there are any. Omitted entirely when there are none - this is
the common case and it should read as good news, not as a missing element. There
are exactly three kinds and they are defined in `CONTEXT.md`: Overdue Schedule,
Failed Delivery, Stale Call Round. Each links to the row that needs work, which
is now a navigation to another tab rather than a scroll.

**Identity.** Event title, event type, hosts, event date with countdown, venue,
ceremony and reception times, the `/r/{shortCode}` copy and open actions, the
Owner with email and phone, collaborators, and a quiet "Created" line.

Identity is doing more work than before: the dissolved "Event details" band has
moved into it. Resist letting it become a form. It is a masthead, and an
Operator reads it in about three seconds.

The header stays put while tabs change. It is the one stable thing on the page.

## 5. The Guests tab (default)

Two parts, top to bottom.

**The rollup**, which exists today and is good: guest records against actual
guests, the RSVP distribution bar, the phone-quality warning, and the "where the
answers came from" provenance table. Keep the Guest Record versus Guest
distinction rigorous - it is the billing unit and the brief that muddles it
causes real support cost.

Provenance gains a **fourth row, "Operator typed it in"**, which will read as
zero for a while. Design the table so a new row does not look like an error.

**The table**, which is new and is the reason for the whole restructure. One row
per Guest Record: name, phone, RSVP, amount, group. Search by name or phone and
a filter by RSVP status, both URL-backed, paginated at 50 to match the events
index.

The table is **read-only**. No interactive cells, no inline editing, no row
actions. It is a fast surface for scanning and it should feel like one.

## 6. The guest sheet

A row click opens a sheet at `?guest=<id>`. It is the only place a Guest Record
is edited, and the only place notes and call history appear.

It holds: the editable fields (RSVP, phone, amount, notes, group), this Guest's
call history across every Call Round, and a delete action.

Two things need real care.

**Delete is destructive on a billable row.** A Guest Record is the unit Kululu
charges for. Deleting one reduces what the Owner is billed, and there is no
audit trail behind it. The confirm has to say that in plain words rather than
asking "are you sure".

**An Operator editing an RSVP here is not the same act as a Call Outcome.** It
is recorded as a distinct provenance source precisely because it bypasses the
Call Round. The sheet should not make the two feel interchangeable, and the call
history sitting right there is part of how it does that.

Reuse the `?user=` sheet on the Users index as the pattern. It is already tuned
so the table behind it does not flash on row click.

## 7. The Billing tab

The commercial state of the Event, and today that is nearly empty: whether
sending is enabled, and the action to enable it.

`CONTEXT.md` calls this boundary **Free to Plan, Pay to Send** - planning is
free, payment unlocks outbound reach. That is what this tab is about, and the
copy should sound like it rather than like an admin settings screen.

Design it honestly at its current size. A tab holding one true fact and one
action is fine. Do not pad it with placeholder metrics for payment data that
does not exist yet, but do leave it obvious where that data will sit.

An Event without sending enabled is not broken and must not look it. Five of the
ten published events are in that state right now. It is the normal condition of
an event that has not paid yet.

## 8. Outreach: inherit, do not redesign

The outreach timeline works and is staying as it is. Design **one artboard**
showing it correctly framed by the new shell, and no more.

It encodes rules that took real work and that a fresh design would quietly lose:
cancelled rows stay at their original planned date and say only "Cancelled by
owner"; a failure summary counts persisted delivery rows rather than today's
guest list; a row with mixed origins is labelled "Includes manual resends"; Add
call round is hidden until sending is enabled and an eligible audience exists.
The full contract is in
[`back-office-events-brief.md`](./back-office-events-brief.md).

If the new shell makes something in the timeline sit badly, say so. Do not fix
it by redrawing it.

## 9. The Draft Event

A Draft Event has **no tab bar**. It gets the compact identity and one
explanation that onboarding was never finished, and that is the whole page.

This is an absent workspace, not an empty one. A Draft has no guest list and no
schedules, and `CONTEXT.md` is explicit that it is not yet a workspace. Three
tabs each saying "nothing here" would contradict that.

The Operator's question on this page is only ever "is this worth a call", so the
Owner's phone number and the step onboarding stopped at are the two things that
matter.

## 10. States to design

- Guests tab, populated, healthy event
- Guests tab, no guest list yet
- Guests tab, search or filter matching nothing (distinct from the above)
- Guest sheet, open and editable, with call history
- Guest sheet, delete confirm
- Billing, sending not enabled
- Billing, sending enabled
- Draft Event
- A tab whose data failed to load, with the header still intact
- Loading: the shell painted, counts and contents still streaming

That last one is not decoration. The layout paints the header and tab labels on
the first frame and streams everything else, so the half-loaded state is a state
an Operator sees on every navigation. It should look composed, not skeletal.

## 11. The data is real and it is small

Production today: 10 published Events, 1 Draft, 1,324 Guest Records, 1,956
actual guests. The average Event has 189 Guest Records and the largest has 306.
89 Guest Records have no usable phone number. 37 have notes. 5 of the 10
published Events have sending enabled.

RSVP provenance across all Guest Records: 747 still pending, 328 answered by the
Guest, 170 from Operators on the phone, 62 typed by an Owner, 17 from before
source tracking.

Two consequences. A guest table has to look right at 189 rows, which is more
than a screen and far less than a scroll problem. And the provenance table has
to hold five rows where one of them is zero.

## 12. Out of scope

- The events index at `/admin/events`
- The Call Round calling surface at `rounds/[roundId]`, which deliberately sits
  outside this shell and keeps its own focused layout
- The outreach timeline's interior, per section 8
- An activity or audit log. It was considered and deferred
- Any Signal beyond the three defined ones
- Dark mode
- Mobile. Laptop-first
- Anything in the Owner-facing app

## 13. Deliverable

`.dc.html` artboards in the Claude Design project, matching the convention used
by the Overview work:

1. Shell - pinned Signals and Identity, tab bar with counts
2. Guests tab, populated
3. Guests tab, no guest list yet
4. Guest sheet, open and editable
5. Outreach tab - inherited, framed only
6. Billing, sending not enabled
7. Billing, sending enabled
8. Draft Event, no tab bar
9. Loading and failed states

## 14. Open input

**How much weight Identity carries.** It absorbed the dissolved Event details
band and now holds event facts, owner, collaborators, guest page actions and a
created date, all while staying pinned above every tab. It may be too heavy to
sit on screen permanently. If it is, the interesting question is what drops out
of it rather than what shrinks, and this brief wants that answer.

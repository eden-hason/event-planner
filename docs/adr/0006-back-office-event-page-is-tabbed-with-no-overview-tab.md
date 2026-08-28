# 6. The Back Office event page is tabbed, and has no Overview tab

Date: 2026-08-28

## Status

Accepted

## Context

`/admin/events/[eventId]` renders five bands down one page: Signals, Identity,
then either a draft explanation or Guest list, Outreach timeline and Event
details. That is tolerable today. Only one band, the outreach timeline, grows
without bound, and nobody has complained about scrolling.

The page is being split anyway, for two reasons that have nothing to do with its
current length.

**Room to grow.** Two surfaces are coming that cannot be bands. A per-guest
table is the larger one: the Back Office holds counts but no guest rows, so an
Operator answering an Owner's question about one guest has to impersonate to see
it. Payment data is the other. Neither fits under a heading in a stack.

**Task separation.** The jobs an Operator does on one Event are genuinely
different work, and mixing them means every job pays the cost of the others
being on screen.

Load time is explicitly *not* a reason. Each band already streams behind its own
Suspense boundary and the queries are small.

There is also a mismatch worth naming, because it is what shapes the answer. The
page was built triage-first: Signals lead, and a Signal link scrolls to the row
that needs work. But the most frequent reason an Operator opens an Event is none
of that. It is to check on an account, with no specific fix in mind. The page
answers the rarer question first.

## Decision

Signals and Identity are **pinned above a tab bar** and are the health check.
Below the bar are three tabs, each a work surface: **Guests**, **Outreach**,
**Billing**. Guests is the default.

**There is no Overview tab.** Once Signals and Identity are pinned, an Overview
tab has nothing left of its own. Anything put in it would be a digest of the
other three, which means two places to change when one number changes, and two
places to disagree while data streams in. The pinned header is the overview.

The tab bar carries **counts and no severity**: `Guests 240`, `Outreach 6`, in
muted type. Facts, not judgements. Signals remain the only element on the page
permitted to say something is wrong, which preserves the existing rule that
destructive styling means overdue work or failed delivery and nothing else. An
Operator reads account health off the bar in one glance and clicks only to act,
which is what the most common job actually needs.

### The tab lives in the URL, as a route segment

```
admin/events/[eventId]/
  (workspace)/
    layout.tsx        pinned header + tab bar
    page.tsx          Guests, the default
    loading.tsx
    outreach/page.tsx
    billing/page.tsx
  rounds/[roundId]/   outside the group: no tab chrome
```

`/admin/events/[eventId]` **is** the Guests tab. There is no redirect to
`/guests` and no `/guests` segment, so one view never has two URLs.

Segments rather than `?tab=`, even though the events index sets the house
convention for URL state with plain `searchParams`. A search param would put the
whole page behind one `loading.tsx`, re-render the pinned header on every tab
change, and forfeit per-tab code splitting. Segments give each tab its own
loading boundary, so switching tabs paints the frame immediately and streams the
contents, and they let a Signal deep-link name its destination exactly:
`/outreach#schedule-123` switches tab and then anchors.

The `(workspace)` group exists so the call round at `rounds/[roundId]` escapes
the tab chrome. Somebody is on the phone looking at that page; it stays focused.

### A Draft Event has no tab bar

A Draft renders the compact identity and the incomplete-onboarding explanation,
and nothing else. `/outreach` and `/billing` on a draft call `notFound()`.

This is deliberately an *absent* view rather than an empty one. ADR-0003 says
Events exist before they are complete, and `CONTEXT.md` says a Draft "is not yet
a workspace". Three tabs that each say "nothing here" would contradict that in
the one place an Operator would read it.

## Consequences

**The `@topbar` slot has to learn the new segments.** `resolveAdminTopBar` falls
through to `{ kind: 'search' }` on anything it does not recognise, so without a
change every tab silently loses its breadcrumb and shows the operator search
instead. The breadcrumb deliberately stays `Events / event` and does not name
the tab: the tab bar is directly below it, already saying where you are.

**The layout must not await anything before returning.** The pinned header and
the tab labels paint on the first frame; the identity, the signals and the tab
*counts* each stream in behind their own boundary. This is the same constraint
the `@topbar` route already documents at length, and for the same reason. A
count that blocks the bar would make every tab change feel slower than the page
it replaced.

**The "Event details" band is dissolved rather than moved.** Short code and
collaborators are already in the pinned header, "Created" becomes a line there,
and sending state belongs to Billing. No band survives merely to have somewhere
to live.

**Signal links change kind.** They were same-page scrolls; they are now
navigations. A Signal on the Guests tab pointing at a failed delivery moves the
Operator to another route before anchoring.

**Billing ships nearly empty.** It holds the sending gate and the Enable sending
action that exist today, and waits for real payment data. That is accepted: the
slot is the point, and a tab holding one true fact is honest, where an Overview
tab holding four restated ones would not be.

**If we change our mind.** Collapsing back to one page means deleting three route
files and re-stacking the bands. Nothing about the data or the queries changes,
so the reversal is a day's work. The part that does not reverse cheaply is the
URLs: `/outreach` and `/billing` will be in Operators' history, in bookmarks and
in Signal links, and would need redirects rather than deletion.

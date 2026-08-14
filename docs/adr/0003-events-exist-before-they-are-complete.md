# 3. Events exist before they are complete

Date: 2026-08-14

## Status

Accepted

## Context

The onboarding wizard collects everything client-side and writes once, at the
end, in `createOnboardingEvent`. Until the final tap nothing exists server-side.

That has three costs. A couple who abandons at the venue question loses
everything, including the answers they already gave. A couple who returns the
next day starts from the first screen, because `/app` finds no event and
redirects to `/app/new-event`. And the flow cannot honestly claim to be
building anything - the redesigned onboarding shows an event card assembling
answer by answer, which is a lie if no event is being assembled.

The obvious blocker is the schema: `events.title` and `events.event_date` are
both `NOT NULL`, and neither is known at the first screen. The date is not
known until the third, and some couples do not have one at all.

Two alternatives were considered.

**Client-side persistence only.** Keep the single insert, hold progress in
`localStorage`. No schema change whatsoever. Rejected because it does not
survive a device switch, and because it keeps the flow's central claim false -
there is still no event until the end.

**A separate `onboarding_drafts` table.** A jsonb payload keyed by user, merged
into a real event on completion. This is the tidier model: it keeps `events`
honest, since an event with no date arguably is not an Event. Rejected because
it introduces a second representation of the same thing, a merge path that can
fail halfway, and a synchronisation problem every time the event shape changes.
The tidiness is real but it is bought with a permanent seam.

## Decision

The event row is created as soon as the couple picks an event type, and each
subsequent answer patches it. `events.event_date` becomes nullable, and `title`
gains a default so a row can exist before the names are known.

`events.status` is revived to carry this. Until now it has been vestigial:
written as `'draft'` by every insert path, allowed to be `draft | published |
archived` by the Zod schema, and never read or transitioned anywhere. It now
means something specific and load-bearing:

- `draft` - onboarding is not finished. This is a **Draft Event** (see
  `CONTEXT.md`). It does not appear in the event switcher and does not open a
  workspace.
- `published` - onboarding completed. The event is real and the workspace opens.

Routing follows from this rather than being decided separately: `/app` must
check for a Draft Event and route back into the onboarding takeover, resuming
at the first unanswered question. `getLastUserEvent` currently sends the user
straight to `/app/{id}/dashboard`, which after this change would land them on a
dashboard for an event with no date.

## Consequences

**Good.** Progress survives abandonment and device switches. The onboarding
card is backed by a real row, so what the couple watches take shape is the
thing they end up with. Abandoned drafts are a record of interest rather than
lost traffic, and are visible to the back office as such.

**Bad.** `events` now holds incomplete rows, permanently. Every consumer that
assumed a date exists has to handle null - countdowns, sorting by date, the
hero banner, and anything deriving schedule offsets, which are all relative to
the event date and therefore cannot be computed at all for a dateless event.
`NOT NULL` was doing real defensive work and we are giving it up.

Drafts accumulate from every abandoning visitor. They are cheap, but the admin
event list and any per-user event count now need to distinguish drafts from
published events or they will misreport.

Reviving `status` means the three-value Zod enum is now partly meaningful and
partly not - `archived` remains unused. Anyone reading the enum will assume all
three states are live.

**If we change our mind.** Reverting means backfilling or deleting incomplete
rows before `NOT NULL` can be restored, and by then the drafts will be real
user data with real intent attached to them. Deleting them is a product
decision, not a migration detail.

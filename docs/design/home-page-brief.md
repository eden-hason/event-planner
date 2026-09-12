# Home Page - Design Brief

**For:** Claude Design
**Date:** 2026-09-12
**Product:** Kululu - event guest management for the Israeli market

Vocabulary is binding and defined in [`CONTEXT.md`](../../CONTEXT.md) - in particular
**Home**, **Hero**, **Featured Action**, **Signal**, **Guest Record** vs **Guest**, and
the three new capabilities this brief specs: **Test Message**, **Guest List Health
Check**, **Live Invite Preview Link**. The decision to make Featured Actions computed
and non-dismissible is recorded in
[ADR 0010](../adr/0010-featured-actions-are-computed-not-stored.md) and is binding here.

**Read [`onboarding-flow-brief.md`](./onboarding-flow-brief.md) first if you haven't.**
That brief (status: designed, not yet shipped - Claude Design project
`3fecf2a1-9d78-4236-ae32-a44afa20813b`, file `EventCard.dc.html`) makes the onboarding
payoff card become "the dashboard's permanent hero," continuous, in a `hero` size
variant. **This brief supersedes that claim.** The Hero specified below - not the
existing `EventCard.dc.html` hero variant - is the actual destination onboarding's
payoff flows into. Reconcile the two: either evolve `EventCard.dc.html`'s hero size to
match section 5 below, or treat this as its replacement. Say explicitly which you did.

---

## 1. What we are designing

The per-event owner page currently called the dashboard in code
(`src/app/(main)/[locale]/app/[eventId]/dashboard/`, Hebrew nav label `לוח בקרה`,
literally "control panel") becomes **Home**. This is a full rethink of the page, not an
additive pass:

1. A new **Hero** (section 5) - identity fused with live status, replacing the current
   static `EventHeroBanner` plus the three separate stat cards beside it
2. A new **Featured Actions** row (section 6) - a contextual, ranked set of things to do
   next, replacing the current `OnboardingChecklistCard` outright and giving the
   currently-unused `QuickActionsCard` a real successor
3. A restructured "rest of the page" (section 7): the existing RSVP analytics survive,
   joined by a new cross-feature status strip that has no equivalent today
4. Full mobile parity (section 8): today's mobile view shows 2 of 7 sections
   deliberately stripped down; Home shows everything, reflowed

"Dashboard" and "control panel" are retired names - do not use them in any artboard
label or in copy. The route, the feature folder, and the nav label all rename as part
of the same change (out of scope here: this is a design brief, not the migration plan
for that rename).

## 2. Who this is for

The Owner (see `CONTEXT.md`) - the person planning their own wedding, henna, or
bar/bat mitzva, opening this page as the first thing they see whenever they check in on
their event, on a phone, in Hebrew, RTL. Design in Hebrew first, per the standing rule
in [`onboarding-flow-brief.md`](./onboarding-flow-brief.md#2-who-this-is-for) - do not
design an English screen and assume it mirrors.

Unlike the Back Office's Operator (calm, expert, wants five seconds of information),
the Owner is emotionally invested and checks in *because* they want to feel something -
progress, momentum, reassurance that the event is coming together. This page is allowed
to be delightful in a way the Back Office deliberately is not.

## 3. The thesis

**One glance for how it's going, one row for what to do about it.**

The Hero answers "how is my event doing right now" in a single immersive glance -
identity, countdown, RSVP progress. Featured Actions answers "what should I do next" -
never a static list, always the handful of things that actually matter *for this event,
today*. Everything below that is reference: real, useful, but secondary to those two.

The page has to work at both ends of the Owner's journey: the day after they finish
onboarding with zero guests and a date eleven months out, and the week of the event with
a nearly-complete guest list and a stack of resolved RSVPs. Design both, not just the
demo-friendly middle.

## 4. Art direction

### Canvas

This is inside the app shell (sidebar on desktop, bottom nav on mobile via the
`--app-bottom-nav-height` token) - unlike onboarding's full-bleed takeover, Home lives
inside the normal chrome. It should feel like the most considered page in that chrome,
not like it escaped it.

### Visual language

Resolve fully into the **app's** design system (not the marketing homepage's - that
register is for onboarding only):

| | Value |
|---|---|
| Primary | `oklch(0.592 0.249 333)` - the magenta, via `--primary` |
| Radius | `--radius: 0.65rem` (shadcn new-york) |
| Latin type | Geist Sans |
| Hebrew type | Heebo |
| RSVP colors | `--rsvp-confirmed` / `--rsvp-pending` / `--rsvp-declined`, each with a `-tint` (surface) and `-strong` (accessible text-on-tint) pair - never pair the bare 500-level token with a tint background |
| Chart colors | `--chart-1` through `--chart-5` |

**Both light and dark mode.** Unlike the Back Office and the legal/marketing pages
(which carry a `.theme-locked-light` class - see `globals.css`), this page is not
locked to light mode: a dark-mode toggle is in progress for the owner app
(`feat/dark-mode-toggle`). Design both palettes for every artboard. The dark tokens
already exist in `globals.css`'s `.dark` block.

**Icons:** tabler (`@tabler/icons-react`), matching the rest of the app - not lucide.

Density is not a feature here the way it is in the Back Office. This page can breathe:
generous card padding, real whitespace around the Hero, room for the illustration to
matter. It is closer to `GiftingHero`
(`src/features/gifting/components/gifting-hero.tsx` - large heading, `bg-primary/10`
panel, big illustration) than to a stat-card grid.

### RTL

Logical properties throughout (`ms`/`me`, `ps`/`pe`), directional icons flip
(`rtl:rotate-180`), per the codebase's existing convention.

## 5. The Hero

**Status-at-a-glance, illustration-led, warm and editorial.** One block that used to be
three (`EventHeroBanner` + `DaysToEventCard` + `GuestsInvitedCard`) - those three
standalone components retire.

Composition, roughly:

```
┌──────────────────────────────────────────────────────────┐
│  [illustration, full-bleed integrated              ]     │
│  into the composition, event-type accent]                │
│                                                            │
│  Dana & Yossi's Wedding                                   │
│  📅 Thursday, September 25, 2026    📍 Garden Venue       │
│                                                            │
│        12                                                 │
│    days to go                                             │
│                                                            │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░  42 of 68 confirmed                     │
└──────────────────────────────────────────────────────────┘
```

- **Identity**: title, date chip, location chip - same information `EventHeroBanner`
  shows today, styled bigger and more integrated with the illustration than the current
  small-corner-graphic treatment
- **Countdown, the lead number**: large, prominent, tabular figures. No-date state
  reuses today's pattern (`dashboard.countdown.noDateChip`/`noDateTitle` -
  em-dash-free, reads as deliberate rather than broken) rather than a "0" or a dash that
  looks like an error
- **RSVP progress, secondary**: a slim progress bar or ring, "`{confirmed} of
  {total} confirmed`" against `guestsEstimate` when set. Zero guests is not an edge
  case to gloss over - see section 9
- **Illustration**: keep it capability-free - the existing per-event-type SVGs
  (`/hero-wedding.svg`, `/hero-mitzva.svg`) refined into a fuller, more dynamic
  composition, plus the existing confetti canvas treatment
  (`src/features/dashboard/components/confetti.tsx`). No cover-photo upload, no
  template-borrowed art

## 6. Featured Actions

A row of up to **4 cards**, ranked, contextual, computed fresh on every page load - see
`CONTEXT.md`'s **Featured Action** entry and ADR 0010. No dismiss affordance anywhere,
even as a hover action - there is nothing to dismiss.

**Selection rule:** walk the tiers top to bottom, take the highest-priority eligible
action from each until 4 slots are filled; if fewer than 4 are eligible, fill remaining
slots from Fallback, in order.

```
TIER 1 - Setup (highest priority, one at a time)
  1. Complete event details        eligible while !detailsComplete
  2. Add guests / import list      eligible while !hasGuests
  3. Form groups                   eligible while hasGuests && !hasGroups
  4. Upload invitation image       eligible while !hasInvitationImage
  5. Invite a collaborator         eligible while !hasCollaborator

TIER 2 - Urgent ongoing
  6. Send an RSVP reminder         eligible while pendingGuests > 0
                                     and no reminder Schedule sent in last 7d
  7. Guest list health check (NEW) eligible while totalGuestRecords >= 20
                                     and duplicates/missing phones found

TIER 3 - Discovery
  8. Get a test message (NEW)      eligible once >= 1 Schedule exists
  9. Set up seating                eligible while confirmedGuests > 0
                                     and no Seating Plan started
 10. Set up digital gifting        eligible while gifting not configured
 11. Choose an invitation template eligible while still on the default template
 12. Share a live invite preview   eligible once a template is chosen (NEW)
 13. Log budget / expenses         eligible while no Expense logged

FALLBACK - Steady-state (always eligible, fills empty slots, never dismissible)
  - Add a guest
  - Ask the AI assistant           (opens the existing global AiAssistant
                                     drawer via the `kululu:open-ai-assistant`
                                     window event - no new capability)
  - View the guest list
```

### The three new capabilities

- **Get a test message** - the Owner receives a real Schedule message on their own
  phone before it reaches any Guest. Card copy should make "this goes to you, not your
  guests" unmistakable - the one thing an Owner must never worry about is accidentally
  messaging real Guests. Design the confirmation moment (what number does it send to,
  how fast) and the sent state
- **Guest list health check** - flags likely duplicates and missing phone numbers. It
  is read-only: design what "found 3 possible duplicates" leads to (most plausibly, a
  deep link into the guest list filtered to the flagged rows - the fix itself happens
  there, not on Home)
- **Share a live invite preview link** - a copyable/shareable link to the guest-facing
  site as a Guest sees it. Design the copy-confirmation micro-state ("Link copied")

### Card anatomy

Each card needs, at minimum: an icon, a short label (imperative, e.g. "Send a reminder"
- no trailing period per the copy rules), and enough room to convey *why now* (e.g. "42
guests haven't responded") without becoming a paragraph. Tapping/clicking either
performs the action inline (test message, health check, preview link, ask AI) or
navigates to the relevant feature page (add guest → `/guests`, seating → `/seating`,
etc).

## 7. Below the fold

**Keep, unchanged in substance:** `RsvpBreakdownCard` (donut), `RsvpEngagementCard`
(stacked bars per group), `GroupBreakdownCard`, `RecentRsvpActivityCard`. These are
real, data-backed, and already work.

**New: a cross-feature status strip.** Budget, seating, and schedules currently have
zero presence on this page despite being core features. A compact row of three
summaries, each linking into its own feature:

```
[ 💰 Budget          ₪12,400 of ₪25,000 spent      ]
[ 🪑 Seating          18 of 42 confirmed seated     ]
[ 📨 Schedules        Event Reminder sends in 9d    ]
```

- **Budget**: `sum(Expense.amount)` against `Event.budget` (`events.budget`, nullable -
  see events schema) when set; otherwise just the spend total, no ratio
- **Seating**: `SeatingProgressView.confirmedRecordsSeated` /
  `confirmedRecordsTotal` (Guest Records, not heads - per ADR-0009/seating `types.ts`)
- **Schedules**: the next upcoming Schedule's type and date, or the pending count
  (`getPendingSchedulesCount`) if none is imminently due

Each of the three has a real "not started yet" state (see section 9) - it must not be
confused with a loading or error state.

## 8. Mobile

**Full parity, reflowed to one column** - not the current stripped mobile view (which
today shows only RSVP breakdown + recent activity). Same sections, same order, top to
bottom:

```
Hero
Featured Actions      (same 4 cards, stacked - not a carousel)
Status strip           (stacked, not side-by-side)
RSVP breakdown
RSVP engagement by group
Group breakdown
Recent activity
```

Charts that assume horizontal room on desktop (the stacked bars in particular) need a
narrow-width treatment - simplify rather than shrink illegibly.

## 9. States to design

- **Zero guests.** Not an edge case - **5 of 13 published events in production
  currently have zero Guest Records.** The Hero's RSVP-progress line, the status strip,
  and the RSVP charts below all need a deliberate zero state, not a bar rendered at 0%
  that looks like a rendering bug. Tier 1 ("Add guests") should visibly dominate
  Featured Actions here
- **No date set.** Also real in production (one published event has no `event_date`).
  Reuse the existing dashed-chip pattern; the Hero's countdown position shows the
  existing "waiting for the perfect date" treatment, not a raw dash
- **Everything done, nothing eligible.** All Tier 1-3 actions have resolved. Featured
  Actions falls back to the steady-state set (section 6) - it must not look like the
  section is empty, broken, or "should" show something
- **Budget/seating/schedules not started.** In production today, only **1 of 13**
  events has logged an expense and only **4 of 13** have started a Seating Plan - this
  is the common case for those two, not the rare one. "Not started" must read as an
  invitation ("Set up your budget"), not as a dash or a zero
- **Guest list health check finds nothing.** The action itself should not appear
  (eligibility requires findings) - but design what "0 duplicates, 0 missing phones"
  would look like if surfaced elsewhere, so it never reads as a false positive
- **Long content.** A long event title, a long venue name, an Owner with 4 eligible
  Tier-1 actions competing for the row
- **Loading and error** per section - each section server-renders independently, so a
  slow status-strip query must not block the Hero from painting
- **RTL and LTR**, **light and dark**, for every artboard

## 10. Constraints

- **Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui (new-york).** Build with the
  existing primitives in `src/components/ui/` and tabler icons
- **Copy rules are binding:** no em dashes; no trailing periods on single-line UI text
  (labels, buttons, toasts, card copy). Multi-line descriptions may keep them
- **Vocabulary is binding** - `CONTEXT.md`, especially *Guest Record* vs *Guest*
  (seating and budget figures below the fold are Guest-Record counts, per existing
  `types.ts`, not headcounts)
- **No dismiss, snooze, or "mark as done" on any Featured Action** - it is derived at
  read time, per ADR 0010. Do not design the affordance, even as a hover action
- **Get a test message never touches a real Guest** - the design must make this
  legible at a glance, not just in fine print
- Existing pieces to reuse rather than reinvent: `ConfettiBackground`
  (`src/features/dashboard/components/confetti.tsx`), the RSVP color token pairs, the
  global `AiAssistant` drawer (triggered via the `kululu:open-ai-assistant` window
  event - do not design a second entry point for it)

## 11. Out of scope

- The route/folder/nav-label rename itself (`dashboard` → `home`) - an engineering
  follow-up, not a design decision
- Cover-photo upload, and any other new media-capability for the Hero (section 5 already
  settled this: illustration only)
- A dismiss/snooze mechanism for Featured Actions (ADR 0010 - deliberately rejected)
- The interiors of budget, seating, schedules, guests, templates, gifting - the status
  strip and Featured Actions only link into them, they do not reproduce them
- Payment, checkout, and anything from the Free-to-Plan/Pay-to-Send boundary
- The onboarding takeover screens themselves (`onboarding-flow-brief.md` owns those) -
  this brief only owns the Hero they land on

## 12. Open input

**Reconciling with `EventCard.dc.html`.** As flagged at the top: an unshipped design
already exists for "the card that becomes the dashboard hero," in a dedicated `hero`
size variant. Say explicitly whether you're evolving that artboard to match section 5,
or replacing it, so the onboarding work and this page stay a single continuous story
rather than two disconnected hero designs.

## 13. Deliverable

`.dc.html` artboards in the Claude Design project, one pair per breakpoint plus the key
states from section 9 at minimum (zero guests, no date, all-done/fallback,
budget-and-seating-not-started, dark mode for each):

- `Home Desktop.dc.html`
- `Home Mobile.dc.html`

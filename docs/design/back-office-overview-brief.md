# Back Office Overview - Design Brief

**For:** Claude Design
**Date:** 2026-08-24
**Product:** Kululu - event guest management for the Israeli market

This is an **internal staff tool**, not the product. Almost nothing from
[`onboarding-flow-brief.md`](./onboarding-flow-brief.md) carries over: no Hebrew,
no RTL, no marketing brand, no emotional payoff. Read that brief only to know
what this deliberately is not.

Vocabulary is binding and defined in [`CONTEXT.md`](../../CONTEXT.md) - in
particular **Back Office**, **Operator**, **Signal**, **Overview**, and
**Guest Record** vs **Guest**. Behaviour and data live in
[`docs/admin/BOOTSTRAP-HOME.md`](../admin/BOOTSTRAP-HOME.md); this brief does not
restate them and does not overrule them.

---

## 1. What we are designing

Two things only:

1. **The Back Office shell** - the nav and page frame every internal page sits in
2. **The Overview** - the Back Office home page at `/admin`

Users, Events, Operations and Configuration are nav destinations that already
exist or are stubs. They are not being designed here.

## 2. Who this is for

Three or four Kululu staff. They open this daily, often first thing, on a laptop.
They already know the product intimately - they do not need explanation,
onboarding, tooltips, or reassurance.

An Operator is not a customer. Do not design for delight, discovery, or
persuasion. Design for a person who has done this 200 times and wants to be told,
in about five seconds, whether today is broken.

## 3. The thesis

**Quiet until it isn't.**

On a normal day nothing is wrong and the page should feel calm and almost empty.
When something breaks, that one thing should be impossible to miss - not because
the page turns red, but because it is the only thing with any weight on it.

This is the whole design problem. A page that always looks urgent trains the
Operator to ignore it, and then the one day it matters they will scroll past.
The empty state is not the edge case here - **it is the common case**, and it has
to read as good news rather than as a page that failed to load.

## 4. Art direction

Use the **app's design system**, not the marketing language. The Back Office
never speaks in the brand's voice.

- shadcn/ui, **new-york** style, `neutral` base, `--radius: 0.65rem`
- Tokens from `src/app/globals.css`: `--background`, `--card`, `--foreground`,
  `--muted-foreground`, `--border`, `--destructive`, `--success`, `--primary`
  (`oklch(0.592 0.249 333)`, the magenta)
- Type: Geist Sans, already loaded globally. Tabular figures for every number
- Icons: lucide
- **Light mode only.** Dark tokens exist in the stylesheet but nothing ever
  applies `.dark`, so do not design a dark variant

**Primary magenta is for navigation and interactive state, never for severity.**
It is the brand colour and it means "you are here" or "this is clickable". A
Signal that borrows it competes with the nav.

The current admin layout hardcodes `!bg-[#F4F4F6]` as a page background, which is
not a token. Either propose a real token for it or drop it and use
`--background` / `--muted`. Do not carry the hex forward.

Density is a feature. This is closer to a well-set table than to a dashboard.
Restraint, not decoration - there is no space here for gradients, glass, or
motion beyond ordinary hover and focus.

## 5. The three bands

In this order, and in roughly this proportion:

```
Overview                                          Thursday, 24 August

[ 13 users ]  [ 10 events ]  [ 1,011 guest records ]     <- quiet, one line

NEEDS ATTENTION (2)                                      <- the centre of gravity
  !  3 deliveries failed - Cohen wedding
     error 131049 x2, 63016 x1                              2 days ago
  !  Call Round 2 open 7 days - Levi henna
     40 of 120 guests called                                7 days ago

UPCOMING (3 in the next 30 days)                         <- reference, scannable
  Cohen wedding        12 Sep    184 records    62% confirmed
  Levi henna           19 Sep    120 records    31% confirmed
  Mizrahi bar mitzva    2 Oct     96 records     8% confirmed
```

**The count strip** is context, not the headline. It is the one place a big
number would be wrong - the Operator glances at it maybe weekly. Resist stat
cards with icons and trend arrows. There is no trend data and inventing one
would be a lie.

**Needs Attention** is where the eye lands first, every time. Each row is a whole
clickable target leading somewhere the Operator can act.

**Upcoming** is a reference list, scanned not read. Dates and percentages must
line up vertically for column-wise comparison.

## 6. Signal severity - the hard part

Three Signal kinds carry a real severity rank (defined in
`docs/admin/ADMIN-CONTEXT.md`, do not reorder):

| Rank | Signal | What it means |
|---|---|---|
| 0 | **Overdue Schedule** | A send never went out. The campaign has stalled for a paying customer |
| 1 | **Failed Delivery** | Specific Guests never received a message. Partial damage |
| 2 | **Stale Call Round** | Somebody started a round and walked away. Bookkeeping |

**The system has `--destructive` and `--success` and no `--warning`.** Three ranks,
two semantic colours. Do not solve this by inventing three alarm colours - that
produces exactly the always-urgent page this design is trying to avoid.

Preferred direction: **one severity colour, used sparingly**, with rank carried by
non-colour means - order on the page, weight, an icon that differs in meaning
rather than in hue, or the presence versus absence of a marker. Rank 2 may well
deserve no colour at all.

Give the three kinds **distinguishable icons**, since an Operator learns to triage
by shape faster than by reading. Age ("7 days ago") is a first-class fact and sits
consistently in the same place on every row, right-aligned.

If you do propose adding a `--warning` token, say so explicitly and give its oklch
value in both the light palette and the dark block that exists in the stylesheet.

## 7. States to design

- **No Signals** - *the common case, and the good one.* "Nothing needs your
  attention" needs to read as reassurance, not as an error or a void. This is the
  most important state in the brief and the easiest to leave until last
- **One Signal** - one row alone in a band sized for several. Do not let it look
  lost or accidental
- **Many Signals** - design for roughly 20. Show what caps, scrolls or collapses,
  and whether kinds group. A wall of 40 identical rows is a failure state of the
  design, not of the data
- **No upcoming events** - "No events in the next 30 days"
- **Loading** - server-rendered per request, so this is a real skeleton, not a
  spinner. Each band streams independently
- **A band failed to load** - must be visibly distinct from that band being empty.
  A false "0 users" is worse than an error. Design both so they cannot be confused
- **Event with no guest list** - shows "no guest list yet", never "0% confirmed"
- **Long content** - Hebrew event titles, long owner names, an error code list that
  runs past the row. Show the truncation rule

## 8. Constraints

- **LTR and English.** The Owner app is Hebrew and RTL; the Back Office is
  explicitly `dir="ltr"` and is not localised. All copy is hardcoded English
- **Copy rules are binding:** no em dashes, no trailing periods on single-line UI
  text (labels, buttons, toasts, row text)
- **Numbers carry their unit.** "1,011 guest records", never a bare "1,011"
- **No dismiss, snooze, or mark-as-read anywhere.** A Signal is derived at read
  time and has no stored identity - there is nothing to dismiss. Do not design the
  affordance, even as a hover action
- **Nothing may render an open rate, read rate, or engagement funnel.** Those enum
  values exist in the database but are never written, so any such chart reports a
  confident and believable zero
- Available primitives in `src/components/ui/`: `card`, `table`, `badge`, `alert`,
  `empty`, `skeleton`, `separator`, `sidebar`, `tooltip`, `item`, `stats-cards`.
  Prefer composing these over new inventions, and say when you deliberately depart
- The nav has five destinations: Overview, Users, Events, Operations,
  Configuration. Only Overview is built - the other four are stubs today and
  should look reachable but unfinished, not disabled or broken

## 9. The data is real and it is small

Design against the truth. As of today, production holds 13 users, 10 published
events, 1,011 Guest Records, 8 future events, and **2 Signals** (one failed delivery, one
Call Round open 7 days). Zero overdue schedules.

Two consequences:

- A layout that needs volume to look right will look broken on day one. It has to
  hold 2 Signals and 3 upcoming events with dignity
- It also has to survive 20 Signals and 30 upcoming events without redesign

## 10. Out of scope

- Charts, trends, sparklines, growth over time, funnels. There is no time-series
  data and none is being added
- Users, Events, Operations and Configuration page interiors
- Dark mode
- Any Signal based on a business-health judgement, such as "event soon and
  confirmation looks low". Every Signal is a system-failure fact. Mixing in
  judgement makes the queue arguable instead of actionable
- Mobile. Laptop-first; a graceful narrow layout is welcome but is not the target
- Anything in the Owner-facing app

## 11. Deliverable

`.dc.html` artboards in the Claude Design project, matching the convention used
by the onboarding work:

- `Back Office Overview.dc.html` - the shell plus the populated Overview
- Artboards for the states in section 7, at minimum: no Signals, many Signals,
  and a band that failed to load

## 12. Open input

**Severity colour.** Whether to add a `--warning` token or to solve rank without
colour is genuinely open and is the decision this brief most wants an answer to.
Propose one, and say what it costs.

# Home Desktop - Design Brief

**For:** Claude Design
**Date:** 2026-10-03
**Product:** Kululu - event guest management for the Israeli market
**Claude Design project:** `20592c22-ce05-4935-8eff-a8bf3abd9f18`

This brief adapts Home to wide screens. It does not redesign Home. Read these first, in
this order:

1. [`CONTEXT.md`](../../CONTEXT.md) - vocabulary is binding, especially **Home**, **Hero**,
   **Featured Action**, **Owner**, **Seating Manager**, **Guest Record** vs **Guest**
2. [`home-page-brief.md`](./home-page-brief.md) - the original Home brief. Sections 4-9
   (art direction, Hero, Featured Actions, below the fold, mobile, states) still apply,
   and this brief only overrides them where it says so
3. [ADR 0010](../adr/0010-featured-actions-are-computed-not-stored.md) - Featured Actions
   are computed and non-dismissible. Binding
4. The implemented mobile Home, which is **the visual source of truth**:
   `src/features/home/components/mobile/` (entry: `home-mobile.tsx`). The design file
   it was built from is `Home Mobile.dc.html` (Turn 1 boards 1a-1f, Hero variant 2h
   from Turn 2), but where the code and that file differ, the code wins: it has moved
   on since (see section 3)
5. The Guests desktop page, which is the reference for how a redesigned page sits in the
   desktop shell: `src/features/guests/components/desktop/guests-desktop.tsx` and
   `Guests Desktop.dc.html`

---

## 1. What we are designing

The desktop layout of Home, the per-event page at `/app/[eventId]/home` (not the
marketing homepage). Mobile Home has been rebuilt and has the look we want. Desktop is
still the old dashboard grid (`HomeDesktop` in
`src/app/(main)/[locale]/app/[eventId]/home/page.tsx`), which predates the redesign.

The goal is **one app**. Desktop takes mobile's Hero, Featured Actions, status strip and
analytics cards and only changes their arrangement for a wide screen. It does not invent
a second visual language.

## 2. Settled decisions (do not reopen)

- **Same sections, same data, same order as mobile.** No new capabilities, queries,
  tables or data points
- **Mobile is the visual source of truth.** Every desktop board must be expressible as
  a responsive rule on an existing mobile component: wider, re-flowed, re-gridded. No
  desktop-only card designs, and no desktop variant of any component. Engineering will
  build this as one responsive component tree, not two
- **`md` and up only**, inside the existing sidebar shell
- **Featured Actions stay computed and non-dismissible** (ADR 0010). No dismiss, snooze
  or "done" affordance, not even on hover
- **The old `Home Desktop.dc.html` is discarded.** It was drawn from the first brief
  before mobile was built and has diverged: its Hero (single card, 340px illustration
  column, chips) is not the Hero mobile shipped, and it lacks the package action, the
  urgent badge, the group-row cap and the phone-capture step. Do not use it as a
  reference. **Replace its contents in place**, under the same filename, so one obvious
  desktop file remains
- **Every old desktop card is retired**, with nothing carried over: `EventHeroBanner`,
  `DaysToEventCard`, `GuestsInvitedCard`, `ScheduledMessagesCard`,
  `OnboardingChecklistCard`, `RsvpBreakdownCard`, `RsvpEngagementCard`,
  `GroupBreakdownCard`, `RecentRsvpActivityCard`. The guest **estimate**
  (`guestsEstimate`, which only `GuestsInvitedCard` showed) is dropped. Do not
  reintroduce it

## 3. What mobile looks like now (facts from the code)

So the board matches what shipped, not what the first brief described:

- **Hero** (`home-hero.tsx`) has two layers:
  - A **wash band** (`--home-wash`, with two decorative line-art strokes in primary and
    `home-violet`). It holds the type label, the title (up to 3 lines) and the
    countdown (64px gradient numerals plus a "days" label). On the event day the
    countdown reads "today" and `ConfettiBackground` runs over the band. Once the date
    has passed, the countdown is hidden
  - A **white sheet** below the band, holding three rows:
    1. Date
    2. Venue
    3. RSVP: "X of Y confirmed", a percentage and the tri-colour bar
  - States:
    - No date: the date row becomes a dashed violet link to `/details`
    - No venue: the venue row shows a muted placeholder
    - Zero guests: the RSVP row becomes a dashed primary link to `/guests`
- **Featured Actions** (`featured-action-list.tsx`) is a titled list of **row-shaped
  cards**:
  - Anatomy: an icon tile, then the label and optional badge, then a one-line "why",
    then a chevron
  - Selection (`utils/featured-actions.ts`): the section always has **3 or 4** cards,
    because the 3-card fallback fills any empty slots. It has 3 only in the all-done
    state, where just the fallback remains
  - Variants:
    - **Dominant:** filled primary, bigger icon and label. Only `addGuests`, so only
      when there are zero guests
    - **Urgent:** warning border plus a "דחוף" (urgent) badge. Only `package`, when the
      list is over its Record Package. It ranks above setup
  - Inline expansions open beneath the card that triggered them:
    - **Test Message:** "goes only to you" confirmation, masked phone, inline phone
      capture when the viewer has no phone, send/cancel, then a sent state
    - **Health Check:** two tiles, duplicates and missing phones (a zero tile is muted
      with a check mark), plus a link to the filtered list
    - **Preview link:** copies the link and shows a "copied" state
    - **AI:** opens the global assistant drawer
  - Tapping `package` opens the Record Package sheet
- **Status strip** (`status-strip-section.tsx`) is one white card with a section title
  and three bordered rows: budget, seating, messages. Each row has an icon tile, a
  label, a value, an optional progress bar and a chevron. A row that hasn't started
  shows a bold primary invitation instead of a value
- **Analytics** (`analytics-cards.tsx`) has four cards:
  - RSVP donut with a legend
  - Engagement by group: tri-bars, capped at 5 rows with a "show all" toggle
  - Group heads: rows, same 5-row cap
  - Recent activity

  Each card has its own empty state
- **Who sees what:** an Owner (the creator, or any collaborator with the `owner` role)
  sees everything. A **Seating Manager** sees no Featured Actions and no status strip,
  so their Home is the Hero followed by the analytics
- **Streaming:** each section streams on its own, with its own skeleton
  (`skeletons.tsx`) and its own error fallback (`section-boundary.tsx`)

## 4. The desktop shell

Home sits in the shell exactly as Guests does:

- The **chrome row stays.** `PageCard` draws the sidebar toggle, the page title "בית",
  the billing status pill, the theme menu and notifications. Mobile hides this row on
  Home; desktop keeps it
- Content sits on the `bg-app-shell` surface with `px-6`, and the page places its own
  white cards on it
- The sidebar is `collapsible="icon"`: 16rem expanded, 3rem collapsed. **Content width
  depends on the sidebar state, not just the viewport.** Approximate content widths:

| Viewport | Sidebar open | Sidebar collapsed |
|---|---|---|
| 768 | ~464px | ~672px |
| 1024 | ~720px | ~928px |
| 1280 | ~976px | ~1184px |
| 1440+ | capped (below) | capped |

- **Max content width:** Home content caps at **~1120px and centers** in the available
  space. The chrome row stays full width like on every other page

## 5. Layout

### Responsive rule

Thresholds key off **Home's content width** (container queries), not the viewport, so
toggling the sidebar re-flows the page correctly.

- **Below ~720px of content:** everything is single-column - the mobile components as
  they are, inside the desktop shell. This is not a new design; show it to prove it holds
- **~720px and up:** the multi-column layout below

Treat ~720px as a proposal. If the boards show a better breakpoint, pick it and say why.

### Page structure

Stacked full-width bands in mobile's order. Sections keep their mobile position; only
the layout inside each section widens.

```
┌ chrome row: [≡] בית ··········· [billing pill] [theme] [bell] ┐
│                                                               │
│  ┌──────────────── HERO (rounded panel) ─────────────────┐    │
│  │ wash band                                              │    │
│  │  type label                                     12     │    │
│  │  Dana & Yossi's Wedding                     days to go │    │
│  │ ┌ white sheet ─────────────────────────────────────┐  │    │
│  │ │ 📅 Date      │ 📍 Venue       │ 👥 42 of 68 ▓▓▓░ │  │    │
│  │ └──────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                               │
│  What to do now                              updates each visit│
│  ┌─────────────────────────┐ ┌─────────────────────────┐      │
│  │ action 1                │ │ action 2                │      │
│  └─────────────────────────┘ └─────────────────────────┘      │
│  ┌─────────────────────────┐ ┌─────────────────────────┐      │
│  │ action 3                │ │ action 4                │      │
│  └─────────────────────────┘ └─────────────────────────┘      │
│                                                               │
│  Status strip                                                 │
│  ┌───────────────────┬───────────────────┬─────────────────┐  │
│  │ 💰 Budget         │ 🪑 Seating        │ 📨 Messages     │  │
│  └───────────────────┴───────────────────┴─────────────────┘  │
│                                                               │
│  ┌ RSVP donut ─────────────┐ ┌ How guests answered ───────┐   │
│  └─────────────────────────┘ └────────────────────────────┘   │
│  ┌ Engagement by group ────┐ ┌ Recent activity ───────────┐   │
│  │                         │ └────────────────────────────┘   │
│  └─────────────────────────┘                                  │
└───────────────────────────────────────────────────────────────┘
```

### Hero

- **Full width**, a **rounded panel** below the chrome row. The wash sits inside the
  panel's own bounds and does not bleed under the chrome row
- **Wash band:** the type label and title sit on the start side, and the countdown on
  the end side, keeping mobile's sizes or scaling them up modestly. The title may still
  wrap; design a long title
- **Decoration:** mobile's two line-art strokes, redrawn to span the wider band. **No
  illustration image** - mobile has none, and adding one is out of scope. On the event
  day, confetti runs across the whole panel
- **White sheet:** nested at the bottom of the panel. Its three rows become **three
  side-by-side cells** (date | venue | RSVP) in one card, separated by dividers. The
  dashed no-date and zero-guests treatments stay link cells, now as cells instead of
  rows. Below the threshold the cells stack back into rows

### Featured Actions

- Section title and subtitle as on mobile
- A **2-column grid** of mobile's **row-shaped** cards: same anatomy, not tall tiles
  - 4 cards: 2x2
  - 3 cards (all-done fallback): 2 + 1, with the last card **spanning both columns**
  - **Dominant `addGuests`** spans the full first row. The rest fill 2 columns below it
- **Top-aligned grid.** An inline expansion grows only its own cell; its neighbour
  doesn't stretch. Design Test Message (confirm, phone capture, error, sent) and Health
  (two tiles plus the link) expanded inside a half-width cell
- The urgent `package` card keeps its warning border and badge. Because it ranks above
  setup, it lands in the first cell

### Status strip

- **One card, three cells side by side** (budget | seating | messages), separated by
  vertical dividers, under the existing section title. Each cell keeps mobile's anatomy:
  icon tile, label, value or "not started" invitation, optional bar and chevron. Each
  whole cell is the link
- Below the threshold it goes back to mobile's stacked rows

### Analytics

- **Changed by [`home-answer-sources-brief.md`](./home-answer-sources-brief.md):** Group
  heads is removed on both platforms, and a new **How guests answered** card follows the
  donut. Design that card from that brief; this brief only places it
- A **2-column grid in row pairs**, **top-aligned**:
  - Row 1: RSVP donut | how guests answered (the two compact summaries)
  - Row 2: engagement by group | recent activity (the two lists)
- Cards keep their natural height. Expanding "show all" grows only that card
- The 5-row cap stays. The donut may get somewhat larger with the room; say so if you
  change it

### Hover and focus

Mobile never needed hover states. Desktop does. Design hover and `focus-visible` for
every tappable surface: Featured Action cards, Hero link cells, strip cells, "show all",
and links in the expansions. Keep them quiet - a border or tint shift, not a lift
animation.

## 6. States to design (desktop width)

Section 9 of `home-page-brief.md` applies in full. At desktop width specifically:

- **Zero guests** (5 of 13 published events in production when the first brief was
  written)
  - The Hero RSVP cell is the dashed link
  - Dominant "Add guests" spans the first Featured Action row
  - The status strip shows "not started" invitations
  - **The four analytics empty states are compacted into a calm, short row pair:**
    smaller placeholders and a single line of copy each, so the grid doesn't dominate
    the page. Since built, the same ghost empty states (a faded preview of the card
    with the empty-state line over it) are used on mobile too, sized to the mobile cards
- **No date:** the Hero date cell is the dashed violet link, and the countdown position
  is empty or shows the no-date title as on mobile. Never a dash or a "0"
- **All done / fallback:** 3 fallback cards in the 2 + 1 arrangement, which must not
  look broken or half-empty
- **Budget and seating not started:** strip cells read as invitations, not as zeros
- **Package urgent:** `package` in the first cell with the warning treatment
- **Test Message expanded** (confirm with phone, phone capture, error, sent) and
  **Health expanded**, each inside a half-width cell
- **Event day:** "today" in the countdown, confetti across the Hero panel
- **Past event:** countdown hidden; the band must still balance without it
- **Seating Manager view:** Hero, then analytics only. No gap where Actions and the
  strip would be
- **Long content:** a long title (3 lines), a long venue name truncating in its cell,
  long group names in analytics rows
- **Loading:** per-section skeletons that match the desktop grid (2-column actions,
  3-cell strip, analytics pairs). A slow section must not shift the ones above it
- **Error:** a single section in its error fallback, with the rest of the page intact
- **Below the threshold:** the single-column fallback inside the shell

## 7. Art direction and constraints

- Everything in sections 4 and 10 of `home-page-brief.md` holds: app design system (not
  marketing), `--primary` magenta, `--radius: 0.65rem`, Heebo and Geist Sans, RSVP
  token triples (never the bare 500 token on a tint), tabler icons, logical properties
  for RTL, light and dark from the existing `.dark` tokens
- Home-specific tokens already in use: `--home-wash`, `home-violet` / `home-violet-tint`,
  `warning-tint` / `warning-strong`
- Design in **Hebrew RTL first**
- **Copy:** reuse the existing `home.mobile.*` strings exactly, with no new copy. Copy
  rules still bind: no em dashes, and no trailing periods on single-line UI text
- **Vocabulary:** seating and strip figures count Guest Records; Hero RSVP counts heads,
  as mobile does

## 8. Out of scope

- **Any change to mobile**, meaning anything below the container threshold, including
  its empty states - except the analytics change owned by
  [`home-answer-sources-brief.md`](./home-answer-sources-brief.md)
- New data, queries, tables or capabilities - including the guest estimate
- Featured Action ranking, eligibility, copy, or any dismissal mechanism (ADR 0010)
- New copy (see section 7)
- Illustration assets of any kind
- The chrome row, `PageCard`, and the sidebar
- The interiors of the Record Package sheet, the AI drawer, and every page the actions
  and strip link to
- The engineering refactor itself: flattening `components/mobile/` into one responsive
  tree, deleting `HomeDesktop` and the old cards. That follows from this design and is
  not part of it

## 9. Deliverable

Replace the contents of **`Home Desktop.dc.html`** in the Claude Design project (same
filename). Use realistic Hebrew data; `home-data.js` in the project has scenario data
you can adapt to the current action set (it predates `package`).

**Width boards** (Hebrew RTL, light, normal mid-journey state):

- 1440 - at the 1120 cap, centered
- 1280 - sidebar open
- 1024 - sidebar open (near the threshold; show which side of it you land on)
- 768 - sidebar open (single-column fallback)

**State boards** at 1280, sidebar open, each in **light and dark**:

1. Normal, mid-journey
2. Zero guests
3. No date
4. All done / fallback
5. Budget and seating not started
6. Package urgent
7. Test Message expanded (all its sub-states)
8. Health expanded
9. Event day
10. Seating Manager view
11. Loading skeletons
12. One section in error

Plus **one LTR (English) board** of the normal state at 1280.

Show hover and focus on at least one board, and label every board with what it shows.
Under the boards, add one short note listing any judgement calls you made (threshold,
countdown sizing, donut size, compact empty states).

## 10. Suggested skills (for the agent picking this up)

- **Claude Design tools** (`read_design_skill`, `list_files`, `read_file`,
  `write_files`, `render_preview`) - read the existing `Home Mobile.dc.html` and
  `Guests Desktop.dc.html` boards for conventions (frame, sidebar mock, palette
  objects), and render a preview before finishing
- **`frontend-design`** - for the wide-screen composition judgement calls
- **`domain-modeling`** - only if a vocabulary question comes up; check `CONTEXT.md`
  before naming anything

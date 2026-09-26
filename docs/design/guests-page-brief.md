# Guests Page - Design Brief

**For:** Claude Design
**Date:** 2026-09-26
**Product:** Kululu - event guest management for the Israeli market

Vocabulary is binding and defined in [`CONTEXT.md`](../../CONTEXT.md), in particular
**Guest Record** vs **Guest**, **RSVP**, **Confirmation Conversation**, **Delivery**,
**Call Outcome**, **Table Assignment** and **Guest List Health Check**. How deletion works
is decided in
[ADR 0025](../adr/0025-deleting-guest-records-is-a-deferred-hard-delete.md) and is binding
here.

---

## 1. What we are designing

The **Guests tab** of the per-event guests page
(`src/app/(main)/[locale]/app/[eventId]/guests/`) and the **`?guest=` drawer** it opens.
This is a redesign, not a polish pass. Today the page is missing things the Owner needs:

1. **No multi-select.** Every change is one row at a time. Deleting 300 records to redo an
   import means 300 separate deletes
2. **A list that shows 5 rows.** The desktop table sizes each page to fit the viewport,
   under four large stat cards and a two-row toolbar, so on a laptop-height screen the
   Owner sees about 5 Guest Records per page
3. **Two different pages.** Desktop (stat cards, 9-control toolbar, paginated table) and
   mobile (meter, chips, card list with numbered pages) look and behave differently
4. **Filters that forget.** Search, filters and sort reset on refresh, on back, and every
   time a guest is opened on a phone

The **Groups tab** and the **import wizard** keep their current design. They only appear
here where bulk actions touch them ("Assign to group", the ⋯ menu's Import entry).

## 2. Who this is for

The **Owner**, managing a list of real people they care about, in Hebrew and RTL. They
spend real time on this page: pasting in a list, cleaning it up, chasing pending RSVPs in
the weeks before the event. Design in Hebrew first, per the standing rule in
[`onboarding-flow-brief.md`](./onboarding-flow-brief.md#2-who-this-is-for).

Unlike Home, this is a **working surface**. It should feel calm, fast and dense enough to
scan 300 names, closer to a good mail client than to Home's editorial Hero. Delight comes
from speed and confidence ("I can fix this list in two minutes"), not from illustration.

**List sizes in production:** 11 events have guests. The median is **164 Guest Records**,
the largest is **333**, and 3 events are above 200. Design for 150-350 as the normal case,
and make sure it doesn't break at 800.

## 3. The thesis

**One list, one selection, one set of actions, on every screen.**

- **One list.** A continuous, scrolling list with no pagination on either breakpoint.
  Desktop renders it as a table and mobile as cards, but it is the same list with the same
  filters and the same order
- **One selection.** Any set of Guest Records, built up across searches and filters, acted
  on at once
- **One set of actions.** The same actions appear on a single row (⋯ menu) and on a
  selection (action bar), with the same confirms and the same Undo

## 4. Art direction

Resolve fully into the **app's** design system, as in
[`home-page-brief.md` §4](./home-page-brief.md#4-art-direction): `--primary` magenta,
`--radius: 0.65rem`, Heebo / Geist Sans, the `--rsvp-*` token pairs (never the bare
500-level token on a tint), and tabler icons. Design **light and dark** for every
artboard (dark mode is live in the owner app). Use logical properties throughout, and flip
directional icons.

Density: table rows about 44px on desktop, cards about 72px on mobile. Less chrome, more
rows.

## 5. The page, top to bottom

### 5.1 RSVP meter (scrolls away)

Desktop drops the four stat cards and adopts **mobile's slim RSVP meter** (see
`src/features/guests/components/mobile/guest-meter-chips.tsx`). That is one stacked
confirmed/pending/declined bar, a "% confirmed" figure, and "N guests · M guest records"
beneath it. Counts are Guests (the sum of amounts), with the Guest Record count as the
secondary figure. The meter is information only; filtering moves to the chips in 5.2.
Deeper RSVP analytics live on Home and are not repeated here.

### 5.2 Toolbar (sticky)

One row that sticks under the page header while the list scrolls.

Desktop:

```
[🔍 Search name, phone, group, notes] [All 312 | Confirmed 140 | Pending 150 | Declined 22]
[Filters ▾ •2] [Sort ▾]                                        [⋯] [+ Add guest]
```

- **Status chips** are a segmented filter with live counts (in Guest Records, which is what
  the list rows are). They replace both the old stat-card click and the RSVP filter
  dropdown
- **Filters ▾** is a popover with Group (multi), Side (bride/groom) and "No phone number".
  A badge shows how many are active
- **Sort ▾**: name A-Z / Z-A, newest, oldest (default), by RSVP, by amount
- **⋯**: Import from file, Import from Google Drive, Export to iPlan (confirmed /
  confirmed + pending / all)
- **+ Add guest** is the primary button (on desktop it moves here from the header)

When any non-status filter is active, a **thin second row** appears with removable chips
("Group: חברים מהצבא ✕", "No phone ✕", "Duplicates · 4 ✕", "Clear all"). With no filters
active, that row does not exist. The `?issue=` chip from Home's Guest List Health Check
lives in this row too.

Mobile: `[🔍 Search] [Filters •2] [⋯] [Select]` sticky, with the status chips on a
horizontally scrollable row directly beneath. Filters open the existing bottom sheet
(`guest-filters-sheet.tsx`), which also holds Sort. Import stays in the header's add-guest
source sheet, as today. Export moves from its own download icon into a ⋯ menu beside
Filters.

**All of this lives in the URL** (`?status=`, `?group=`, `?side=`, `?q=`, `?sort=`,
`?issue=`), so refresh, back, opening a guest and a link from Home all keep the view.
Design nothing that implies filters are saved elsewhere.

### 5.3 The list

**Desktop table columns** (start to end, RTL-aware):

| | Column | Notes |
|---|---|---|
| ☐ | Select | Always visible. Header checkbox = all rows matching the current filter |
| | Name | Avatar tint + name, bold. Notes appear as a muted second line when present, not as their own column |
| | Phone | LTR-isolated, muted when missing ("No phone" in `--destructive`-muted) |
| | Group | Group name + side dot |
| | RSVP | The existing `RsvpPill`, plus `AboveInvitedBadge` when more are coming than invited |
| | Amount | Invited amount, and "3/4" style when confirmed with a different count |
| | Table | Table number, or blank |
| | Special Meals | Only when the Event has dietary options on |
| ⋯ | Row menu | Visible on hover and focus, always visible on touch |

The header row sticks under the toolbar. Clicking a row opens the drawer. Clicking the
checkbox or the ⋯ menu does not.

**Mobile card** (`guest-mobile-card.tsx` is the starting point): avatar, name, phone or
"No phone", group, RSVP pill, table number and ⋯. Tapping a card opens the drawer.

**No pagination anywhere.** Show a count above the list ("312 guest records" / "Showing 40
of 312") and nothing below it but the end of the list. Scroll position is kept when the
drawer closes.

### 5.4 Row ⋯ menu

The same on both breakpoints: **Mark confirmed**, **Mark declined**, **Move to group ▸**,
**Open**, then a separator and **Delete** (destructive). Single-row actions go through
the same confirm and Undo patterns as bulk ones (§6.4, §6.5), scaled down to one record.

## 6. Selection and bulk actions

This is the new capability and the heart of the brief.

### 6.1 Selection model

- A selection is a **set of Guest Records**, independent of search, filters and sort. The
  Owner can search "כהן", tick 3, search "לוי" and tick 2, and act on 5
- If some selected records are hidden by the current filter, the action bar says so:
  **"5 selected · 2 not shown"**. Tapping "2 not shown" shows just the selection. Nothing
  is ever changed off-screen without the count saying so
- The header checkbox (desktop) and "Select all" (mobile) select **every record matching
  the current filter**, not just the rows on screen. Its indeterminate state means "some"
- Selection is not in the URL and does not survive a refresh
- Escape (desktop) and ✕ (both) clear it

### 6.2 Desktop

- Checkbox column always visible. **Shift-click** selects a range
- Once anything is selected, a **floating action bar** pins to the bottom-center of the
  viewport, above the list, and follows the scroll:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ✕  12 selected · 2 not shown   │ Set RSVP ▾  Group ▾  Side ▾  Export  │ 🗑 Delete │
└──────────────────────────────────────────────────────────────────────────┘
```

  It enters and leaves with a short slide/fade. The toolbar stays usable underneath, so
  the Owner can keep filtering while a selection exists.

### 6.3 Mobile

- **Enter selection mode** by long-pressing a card (that card starts ticked) or tapping
  **Select** in the sticky bar
- In selection mode each card shows a leading checkbox, taps toggle instead of opening, and
  the page header becomes **"✕ 12 selected · Select all"**
- A **bottom action bar replaces the app's bottom nav**
  (`--app-bottom-nav-height`): icon + label buttons for RSVP, Group, Side, Export and Delete.
  Each opens a bottom sheet for its choice
- Leaving selection mode (✕, back gesture, or clearing the last tick) restores the nav

### 6.4 The actions

| Action | Choice | Confirm needed? |
|---|---|---|
| **Set RSVP** | Confirmed / Declined / Pending | Yes, when it would override a Guest's own answer or end a Table Assignment (see below). Otherwise it applies straight away |
| **Assign to group** | Existing group, "New group…" (name inline), or "Remove from group" | No |
| **Set side** | Bride / Groom / None | No |
| **Export** | iPlan export of the selected rows | No |
| **Delete** | - | Always |

**Set RSVP applies to every selected record.** The Owner outranks the Guest, as they
already do one record at a time. The confirm spells out the fallout in plain words,
listing only the lines that apply:

> **Mark 30 guest records as declined?**
> 12 answered for themselves - their answer will be replaced
> 9 are seated at a table - they will lose their seat
> [Cancel] [Mark declined]

Setting **Confirmed** keeps the count and Special Meals a Guest already gave, and
otherwise uses the invited amount. Say nothing about this in the UI unless it is needed
to avoid confusion. Afterwards, a success toast names the count ("30 guest records marked
declined").

### 6.5 Delete, confirm and Undo

Per ADR 0025: confirm, then the rows **disappear immediately**, then an **Undo toast**
holds the delete for about 8 seconds. Undo puts every row back exactly as it was.

**Confirm dialog** (desktop dialog / mobile bottom sheet):

> **Delete 12 guest records?**
> 8 have already received messages and 3 answered for themselves. Their message and call
> history will be deleted too
> [Cancel] [Delete 12]

- Only lines that apply appear. With no history, the body is a single line
- **When the selection is the whole list**, the dialog takes its stronger form: the title
  becomes "Delete all 312 guest records?", the destructive button is full-width and
  labelled with the number, and the dialog opens with focus on Cancel. There is **no
  separate "Delete all" entry point**. Select all, then Delete, is the way
- **No billing copy.** Paid or not, the dialog never mentions price, refunds or records
  paid for

**Undo toast** (Sonner, bottom-center desktop, above the action bar area on mobile):

```
12 guest records deleted                     [Undo]  ◔
```

Include a visible countdown (a ring or a shrinking bar). After it expires the toast
dismisses quietly; there is no second "deleted for good" toast. If the delete fails on
commit, the rows reappear with an error toast. Design that state.

## 7. The drawer (`?guest=<id>`)

It keeps its placement (right-side floating sheet on desktop, 92dvh bottom sheet on mobile)
and its role as **the** editor. Changes:

- **Header**: avatar, name, RSVP pill, and the "Updated · via Guest / you / Operator ·
  date" provenance chip that exists today
- **Form**: the existing fields (`guest-form.tsx`) regrouped into clear sections
  (Contact, Invitation: group/side/amount, RSVP: status/count/Special Meals, Seating:
  table, Notes)
- **Activity (new, read-only)**: a compact timeline, newest first, of this Guest Record's
  - **Deliveries**, one per Schedule, with its state (the five Delivery states in
    `CONTEXT.md`) and date. SMS Fallback shows as part of the Delivery, not a separate row
  - **Call Outcomes** from Call Rounds
  - **RSVP changes** with their source (Guest, you, a collaborator, an Operator on the
    phone, an Operator)

  Loaded after the drawer opens, so it needs a skeleton. The empty state reads "No
  messages or calls yet", not an empty box
- **Invitation link** actions (`guest-actions-section.tsx`) stay, placed near the Activity
  section where they make sense
- **Footer**: Delete (destructive, start side), Cancel, Save. Delete closes the drawer and
  goes through §6.5, with a confirm for one record and Undo

## 8. States to design

- **Zero guests** (5 of 13 published events had zero Guest Records at the Home brief):
  first-use empty state with Upload a file (primary), Add a guest, and Google Drive. There
  is no toolbar, meter or selection affordance
- **Filtered to nothing**: "No guest records match" + Clear filters
- **Selection spanning hidden rows** ("5 selected · 2 not shown")
- **Selection = whole list**: the stronger delete confirm
- **Bulk RSVP confirm** with both warning lines, and with just one
- **Undo toast** counting down, and the **failed commit** error
- **Mobile selection mode**: header, checkboxes and action bar replacing the nav, each
  action's bottom sheet
- **Drawer**: new guest (no Activity), guest with rich Activity (Delivered invitation, SMS
  Fallback, confirmed via chat, then changed by an Operator on a call), and guest with no
  Activity
- **Long content**: long names, long group names, a 4-row Special Meals cell, 800 rows
- **Health Check deep link**: arriving with `?issue=duplicates` from Home
- **RTL and LTR, light and dark**, for every artboard

## 9. Constraints

- **Next.js 16, React 19, Tailwind 4, shadcn/ui (new-york)**, existing primitives in
  `src/components/ui/`, tabler icons. The list is virtualized (TanStack Virtual), so rows
  must have a **predictable height**. No expanding rows in the list itself
- **Copy rules are binding**: no em dashes; no trailing periods on single-line UI text
  (labels, buttons, toasts, confirm titles). Multi-line dialog bodies may keep them
- **Vocabulary is binding**: counts of rows are **guest records** ("Delete 12 guest
  records"), headcounts are **guests**. The meter shows both; everything that acts on rows
  says guest records
- **No inline cell editing.** The table is a read surface; the drawer and the ⋯ /
  action-bar actions are the only way to change a record
- **Selection is never persisted** and never appears in the URL
- **Delete is not reversible after Undo expires.** Do not design "Recently deleted",
  "Trash" or "Restore" anywhere (ADR 0025)
- Reuse rather than reinvent: `RsvpPill`, `RsvpDot`, `AboveInvitedBadge`,
  `avatarTintFor`, `GuestMeterChips`, `GuestFiltersSheet`, `AddGuestSourceSheet`

## 10. Out of scope

- The **Groups tab** (keeps its design; bulk "Assign to group" may make its assign drawer
  redundant later, but not here)
- The **import wizard** screens
- **Back Office** guest editing (ADR 0007), which keeps its own immediate delete
- **Sending** from a selection ("send to these guests"). Sending belongs to Schedules
- Anything **billing**
- Custom columns, column reordering or hiding, saved views

## 11. Deliverable

`.dc.html` artboards in the Claude Design project, covering both breakpoints and the
states in §8 (light and dark each):

- `Guests Desktop.dc.html`: list at rest, filtered with the chip row, selection with the
  floating bar, bulk RSVP confirm, delete confirm (partial + all), Undo toast, drawer with
  Activity
- `Guests Mobile.dc.html`: list at rest, filters sheet, selection mode + action bar + each
  action sheet, delete confirm sheet, Undo toast, drawer bottom sheet with Activity
- `Guests Empty States.dc.html`: zero guests, filtered to nothing, drawer with no Activity

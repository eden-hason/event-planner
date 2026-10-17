# Group View: Pending Moves and Guest Editing - Design Brief

**For:** Claude Design
**Date:** 2026-10-16
**Product:** Kululu - event guest management for the Israeli market

Vocabulary is binding and defined in [`CONTEXT.md`](../../CONTEXT.md), in particular
**Guest Record** vs **Guest**, **Group** and **Side**. Whether a record without a phone counts
is decided in [ADR 0033](../adr/0033-records-without-a-phone-do-not-count.md) and is binding
here. The guest drawer is specified in [`guests-page-brief.md` §7](./guests-page-brief.md);
this brief reuses it and does not redesign it.

---

## 1. What we are designing

Three changes to the **Groups tab's assign view**, the screen that opens for one selected
group, with "no group" on one side and "in the group" on the other:

- Desktop: `src/features/guests/components/groups/desktop/assign-panel.tsx` (two columns)
- Mobile: `src/features/guests/components/groups/mobile/assign-guests-screen.tsx` (two tabs,
  `out` / `in`)

1. **Phone number as secondary text** on every guest row, under the name
2. **Edit a guest from here**, by opening the existing `?guest=` drawer on top of the
   group view, without leaving the tab or losing the draft
3. **Pending moves that stay in place.** Today a + / − is already a draft (nothing is
   written until Save, and leaving asks first), but the row **jumps to the other column at
   once** with a small "חדש" / "יוסר בשמירה" badge. On a phone the row disappears from the
   tab the Owner is looking at, and on desktop the Owner loses track of what they touched.
   From now on, the row **stays where it was** and is marked as *pending to move* until
   Save

The rest of the Groups tab (group list, group dialog, Unassigned panel, import wizard) keeps
its current design, except where §7 says otherwise.

## 2. Who this is for

The **Owner**, sorting a list of real people into groups, in Hebrew and RTL. Design in
Hebrew first. A typical session is "open the group 'חברים מהצבא', scan the no-group column
for familiar names, tick a dozen, fix a typo or a missing phone along the way, Save".
The phone matters here: two people with the same name (two "דני כהן") can only be told
apart by their number.

## 3. The thesis

**Nothing moves until you say so.** The draft becomes visible: every pending row stays in
its column, colored by where it will go, with a running "what Save will do" summary. Save
is the only thing that rearranges the lists.

## 4. The row

Today: `[checkbox] [avatar] Name [badge]   N seats  [+/−]`, 52px.

New:

```
[☐] (ד)  דני כהן                    3 מקומות   [✎]  [+]
         054-123-4567
```

- **Line 1**: name (semibold, truncates), then any pending-move label (§5)
- **Line 2**: phone, formatted for display with `formatPhone` (`054-123-4567`), muted,
  `dir="ltr"` so the digits don't flip in RTL, tabular numerals
- **No phone**: line 2 reads **"אין טלפון"** in a muted amber (the existing `pending`
  presentation color). It is a flag, not an error: per ADR 0033 the record is not sent to
  and not counted, which is worth seeing while sorting
- The row grows to fit two lines (around 60px). Keep it dense: an Owner scans hundreds
- **Search** in both columns also matches the phone (digits only, so "0541" and "054-1"
  both find it), and the placeholder says so

## 5. Pending to move

### 5.1 Behavior

- **+ / −** (per row, or the column's bulk button on the checked rows) no longer moves the
  row. It marks it **pending**: the row stays in its column and in its position
- Pressing the same button on a pending row **undoes** it (the + becomes an undo arrow,
  `IconArrowBackUp` or similar, with the aria-label "בטל העברה של {name}")
- **Cancel** clears every pending mark. **Save** commits them, and only then do rows change
  columns (animate the move once, so the result can be followed)
- The "leave with unsaved draft" guard is unchanged and still applies

### 5.2 Look

Two pending states, each with its own tint so they can be told apart at a glance:

| State | Where it sits | Treatment |
| --- | --- | --- |
| **Will join** (no group → group) | "no group" column / `out` tab | Soft `confirmed` (green) background, a start-edge accent bar, label **"יצטרף בשמירה"** with an arrow toward the group column |
| **Will leave** (group → no group) | "in the group" column / `in` tab | Soft `pending` (amber) background, accent bar, label **"יוסר בשמירה"**, name in a muted color (no strikethrough, so it stays readable) |

Rules:

- Color is never the only signal: the label and the icon carry the meaning too (color-blind
  and screen-reader safe; the label goes into the row's accessible name)
- A pending row keeps its checkbox, so it can be ticked and undone in bulk. The column's
  bulk button splits into what applies: "הוסף 4" for unmarked rows, "בטל 2" for pending ones
- The tint has to stay distinct from the **checked** state (`bg-primary/8`). A row can be
  pending and checked at the same time. Design that combination explicitly
- Optionally, a "pending only" toggle or a pinned "N ממתינים" chip at the top of each column
  that filters to pending rows. The designer decides whether it earns its space

### 5.3 Counts and footer

- Column headers show the projected count: **"בקבוצה 24 → 27"** while a draft exists, or
  just "24" when there is none
- The footer keeps the summary ("3 יצטרפו · 1 יוסר · לא נשמר") and the Cancel / Save pair.
  Save shows the count ("שמירה (4)")
- **Mobile tabs** show a small badge with the pending count on each tab, so a mark made on
  `out` is visible from `in`

## 6. Editing a guest

### 6.1 Entry point

- A clear **row click still selects**, as today, so bulk + / − keeps working
- A **pencil button** (`IconPencil`, aria-label "עריכת {name}") sits before + / −. On
  desktop it shows on row hover and on keyboard focus. On mobile it is always visible, or
  the row gets a ⋯ with "עריכה" (designer's call, but it needs a tap target of at least 40px)
- It opens the **existing guest drawer** (`?guest=<id>`), not a new editor: a side sheet on
  desktop, a 92% bottom sheet on mobile

### 6.2 Over the draft

- The draft **survives** opening and closing the drawer. The drawer is not "leaving", so it
  does not trigger the unsaved-draft guard
- A save in the drawer writes immediately, as it does on the Guests tab. The row updates in
  place (name, phone, seats). If the phone was added, the amber "אין טלפון" goes away
- **Group field conflict.** If the guest has a pending move, the drawer's Group field is
  **read-only**, with the note **"ממתין להעברה - שמרו או בטלו בתצוגת הקבוצה"**. If there is
  no pending move, the Group field works normally: changing it saves at once, and the row
  leaves this view after the refresh (animate it out and show a toast naming the new group)
- **Delete from the drawer** follows the existing deferred delete with Undo (ADR 0025). If
  the deleted record had a pending move, that mark is dropped from the draft and the counts
  update

## 7. Scope across panels

- **Desktop assign panel** and **mobile assign screen**: everything above
- **Unassigned panel** (desktop "no group" view): gets the phone line and the pencil, for
  consistency. Its assign flow is immediate (per-row popover) and stays that way, because
  there is no Save there, so pending marks do not apply

## 8. States to design

Each one in RTL Hebrew, on desktop and mobile:

1. Clean group, no draft, a mix of rows with and without a phone
2. Draft with 3 will-join and 1 will-leave, showing projected counts and the footer summary
3. A pending row that is also checked; the column's split bulk button
4. Mobile: `out` tab with pending marks and the `in` tab's badge showing them
5. Drawer open over a draft: Group field locked (pending guest) vs editable (clean guest)
6. Search by phone with results, and with no results
7. Saving (buttons disabled, pending rows still marked), then the post-save move animation
8. Save failed: marks are kept, error toast, Save is available again
9. Empty group / everyone already assigned (the existing empty states, with the new row
   height)
10. Long names together with a phone line on a narrow phone (320px)
11. Dark mode for both pending tints

## 9. Constraints

- RTL first. Arrows point toward the target column in RTL (the group column is on the
  left on desktop)
- Use the existing tokens and presentation colors (`rsvpPresentation('confirmed' |
  'pending')`). Don't introduce new hues
- shadcn/ui primitives and Tabler icons only. Icons live in `src/components/icons/` if a
  custom one is needed
- Copy: no em dashes, no trailing periods on single-line UI text
- No data or schema changes. Phone is already on the Guest Record; the draft and Save
  (`useGroupWrites.saveMembers`) already exist

## 10. Out of scope

- Redesigning the guest drawer itself
- Inline editing in the row (name or phone typed directly into the list)
- Moving a guest **directly between two groups** from this view (still only no group ↔ this
  group)
- Side (bride/groom) changes; see [backlog 0012](../backlog/0012-a-side-is-an-enum-not-a-nameable-group.md)
- The group list, group dialog and import wizard

## 11. Deliverable

Desktop and mobile frames for every state in §8, a component spec for the row (default,
hover, checked, will-join, will-leave, pending + checked, no phone), and the exact Hebrew
copy for every new string, ready for `messages/he.json` (`guests.groups.*`) with English
equivalents for `messages/en.json`.

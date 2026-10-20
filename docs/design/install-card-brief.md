# Install Card - Design Brief

**For:** Claude Design
**Date:** 2026-10-20
**Product:** Kululu - event guest management for the Israeli market
**Claude Design project:** `20592c22-ce05-4935-8eff-a8bf3abd9f18`

A small, phone-only addition to Home and the More page. Read alongside:

- [`CONTEXT.md`](../../CONTEXT.md) - binding vocabulary, especially **Install Card** (new),
  **Featured Action**, **Visitor**, **Owner**
- [`../install-card-plan.md`](../install-card-plan.md) - the build plan: who sees the card,
  detection, dismissal, analytics. This brief only covers what it looks like
- [`home-page-brief.md`](./home-page-brief.md) - art direction (section 4) and constraints
  (section 10) apply unchanged, with **one exception**: section 10's "no dismiss" rule is
  about Featured Actions, and the Install Card isn't one
- The implemented mobile Home is the visual source of truth:
  `src/features/home/components/featured-action-list.tsx` (the Featured Action rows and
  the Visitor Save card) and `src/components/layout/mobile-more-page.tsx` (the More page)

---

## 1. What we are designing

Three pieces that offer to add Kululu to the phone's home screen, so it opens like an app:

1. **The Install Card** on Home, above the Featured Actions
2. **The iPhone instructions drawer**, opened from the card or the More row
3. **The "Add to home screen" row** on the mobile More page

On Android, "Add" opens the browser's own install dialog. We don't design that dialog,
and it is not ours to style. On iPhone there is no install API, so "Add" opens our drawer,
which teaches the three taps.

## 2. Who this is for

A signed-in Owner (or co-planner) on their phone, in Safari or Chrome, who has already
saved an Event. They're mid-planning, and the card is a nice extra: it should never feel
like a warning or a gate. Visitors never see it, since they get the Save card in that same
spot.

## 3. Settled decisions (do not reopen)

- **Not a Featured Action.** It sits **above** the "What's next" list
  (`מה עושים עכשיו`) and takes none of the four slots
- **Quiet, not loud.** The same anatomy as a Featured Action row (`bg-card`, border,
  `rounded-2xl`, a 42px `bg-primary/15 text-primary` icon tile, a 15px bold label over
  13px muted text), plus a small ✕ and an "Add" pill. **Not** the filled primary
  treatment of the Visitor Save card: that would make it the loudest thing on Home, louder
  than the real warnings (`package`, `planAsk`) right below it
- **It can be dismissed**, forever on that device. ✕ on the card, or "Done" in the drawer
- **Phones only.** No desktop board is needed. iPad in Safari counts: the card spans the
  full width above the two-column grid at the `home-wide` breakpoint
- **iPhone drawer = three numbered steps** with the real iOS glyphs drawn inline,
  **worded for the browser** (Safari or Chrome on iOS). No screenshots, no arrow pointing
  at the screen edge. Those break whenever iOS moves its toolbar
- **One button in the drawer: "Done".** Swiping it away just closes it
- **The drawer says once that they'll sign in.** The home-screen app on iOS doesn't share
  Safari's session, so the first launch shows the sign-in screen (a WhatsApp code)

## 4. Surfaces

### 4.1 Install Card (Home)

```
┌──────────────────────────────────────┐
│ ▕📱▏ הוסיפו את Kululu למסך הבית    ✕ │
│       נכנסים לאירוע בלחיצה אחת,       │
│       בלי לחפש בדפדפן       ( הוספה ‹ )│
└──────────────────────────────────────┘
  מה עושים עכשיו              מתעדכן בכל כניסה
  ┌ Featured Action rows, unchanged ┐
```

- **Placement:** inside the "What's next" section, above its heading, or between the
  heading and the first row. That's your call, but it must read as **not part of the ranked
  list**. The Visitor Save card currently sits between the heading and the rows. Say which
  you chose and why
- **Icon:** tabler, e.g. `IconDeviceMobilePlus` or `IconDeviceMobileDown`. Your pick,
  tabler only
- **✕:** small, top corner (logical `end`), a real button with an `aria-label`, a hit
  target of at least 44px even if the glyph is ~16px. It must not crowd the label on a 360px
  screen
- **"Add" pill:** the primary action. Tapping anywhere else on the card body should also
  trigger it, the way a Featured Action row is all link
- **Entering:** the card is client-only. It appears **after** the page loads (we can only
  know the platform in the browser), so it pushes the list down. Design a short entrance
  (height and opacity, ~200ms, none under `prefers-reduced-motion`) so it doesn't read as a
  layout jump
- **Leaving:** on ✕, or after a successful Android install, it collapses the same way

### 4.2 iPhone instructions drawer

```
          ━━━━
  הוספת Kululu למסך הבית
  כך תגיעו לאירוע בלחיצה אחת

  ①  הקישו על שיתוף  [⬆︎]  בתחתית המסך
  ②  גללו והקישו על  [⊞ הוספה למסך הבית]
  ③  הקישו על  הוסף  בפינה העליונה

  ⓘ בפתיחה הראשונה מתחברים עם קוד שנשלח בוואטסאפ

  [              סיימתי              ]
```

- Built on the existing vaul drawer (`src/components/ui/drawer.tsx`), like
  `record-package-sheet.tsx` and `top-up-sheet.tsx`. Match their header, padding and
  bottom-safe-area treatment
- **Steps:** numbered circles, short lines, each with the iOS UI element it refers to drawn
  **inline as a chip** that looks like what they'll actually tap: the Share glyph (a square
  with an up arrow) and the "Add to Home Screen" row with its plus-in-square glyph. Draw
  these as simple lookalike SVGs. Don't use Apple's SF Symbols, and don't use tabler's
  three-node share icon, which isn't what iOS shows
- **Two wordings of step 1:**
  - **Safari:** Share in the bottom toolbar. On iOS 26's compact layout, Share is inside
    the "⋯" menu, so step 1 has to cover both ("in the bottom bar, or inside ⋯")
    without becoming a paragraph
  - **Chrome on iOS:** Share at the top, in the address bar
  - Steps 2 and 3 are the same in both
- **Sign-in note:** one muted line with an info icon, below the steps. Reassuring, not a
  warning
- **"Done":** full-width primary button at the bottom
- Light and dark, RTL first

### 4.3 More page row

- In the **Account** group (`groups.account`), directly under the Theme row. It's a
  setting about this device, not an Event tool
- The same anatomy as its neighbours (`AccountRow`: icon, label, chevron). Note the More
  page uses **lucide** icons, not tabler, so match the page it's on (e.g. lucide
  `Smartphone`)
- Label: `הוספה למסך הבית`. It needs no description line, like its neighbours
- iOS: opens the same drawer. Android: opens the native dialog
- It shows even after the Home card was dismissed, and it's hidden when running as the
  installed app

## 5. States to design

| # | Board | Notes |
|---|---|---|
| 1 | Home, Android Chrome, card shown | Above a typical post-setup list (e.g. groups, invitation image, health, seating) |
| 2 | Home, iPhone Safari, card shown | Same card. It's identical on both platforms |
| 3 | Home, card shown above an **urgent** Featured Action (`package` or `planAsk`) | Proves the card stays quieter than the warning |
| 4 | Home, card entering | A frame or two of the entrance, or annotated |
| 5 | Home, card gone | Dismissed or installed: Home exactly as today, no gap left behind |
| 6 | Drawer, iPhone Safari | The main board |
| 7 | Drawer, Chrome on iOS | Only step 1 differs |
| 8 | More page, Account group with the new row | iOS and Android look the same |
| 9 | Narrow phone (360px) | The card's label wraps to two lines and the ✕ still has room |
| 10 | iPad Safari, `home-wide` | The card spans both columns above the grid |

Dark for boards 1, 6 and 8, and one LTR board (English) for the card and the drawer.

No loading or error state: the card either shows or it doesn't. No Visitor board: they
never see it.

## 6. Copy (proposals, Hebrew first)

| Where | Hebrew | English |
|---|---|---|
| Card label | `הוסיפו את Kululu למסך הבית` | Add Kululu to your home screen |
| Card text | `נכנסים לאירוע בלחיצה אחת, בלי לחפש בדפדפן` | Open your event in one tap, no browser needed |
| Card button | `הוספה` | Add |
| ✕ aria-label | `הסתרה` | Hide |
| Drawer title | `הוספת Kululu למסך הבית` | Add Kululu to your home screen |
| Drawer subtitle | `כך תגיעו לאירוע בלחיצה אחת` | So your event is one tap away |
| Step 1, Safari | `הקישו על שיתוף בסרגל התחתון (או בתוך ⋯)` | Tap Share in the bottom bar (or inside ⋯) |
| Step 1, Chrome | `הקישו על שיתוף בשורת הכתובת למעלה` | Tap Share in the address bar at the top |
| Step 2 | `גללו והקישו על "הוספה למסך הבית"` | Scroll and tap "Add to Home Screen" |
| Step 3 | `הקישו על "הוסף" בפינה העליונה` | Tap "Add" in the top corner |
| Sign-in note | `בפתיחה הראשונה מתחברים עם קוד שנשלח בוואטסאפ` | The first time you open it, sign in with the code we send on WhatsApp |
| Drawer button | `סיימתי` | Done |
| More row | `הוספה למסך הבית` | Add to home screen |

The quoted iOS labels ("הוספה למסך הבית", "הוסף") must match what a Hebrew iPhone really
shows. They're unverified, so keep them easy to swap. Copy rules are binding: no em
dashes, and no trailing periods on single-line UI text. Tighten the wording if you like,
but keep the framing: a convenience, never a requirement.

## 7. Constraints

- Everything in `home-page-brief.md` section 10, **except** the no-dismiss rule, which
  doesn't apply to this card
- Tabler icons on Home, lucide on the More page (match each page's existing set)
- Logical properties, `rtl:rotate-180` on directional glyphs. The iOS glyph chips do
  **not** flip: they show the real iOS icons, which look the same in RTL
- Reuse `src/components/ui/drawer.tsx`. Don't design a new sheet chrome

## 8. Out of scope

- The Android native install dialog (it belongs to the browser)
- Desktop, and any install offer outside Home and the More page
- In-app browsers (Instagram, Facebook): the card doesn't show there, so there's no
  "open in Safari" guide
- Guest-facing RSVP pages: Guests are never offered installing
- Push notifications, offline mode, or any "what you get" feature list
- Any change to the Featured Action rows themselves

## 9. Deliverable

A new file, **`Install Card.dc.html`**, in the Claude Design project, holding the boards in
section 5 at 390px (360px for board 9, `home-wide` for board 10). Build the Home boards
from `Home Mobile.dc.html`'s conventions, but take the Featured Action row anatomy from the
code (section 3), which has moved on since that file.

## 10. Suggested skills

- **Claude Design tools** (`read_design_skill`, `read_file` on `Home Mobile.dc.html` for
  board conventions, `write_files`, `render_preview`)
- **`frontend-design`** - only for the drawer's inline iOS glyph chips. Everything else
  reuses existing anatomy

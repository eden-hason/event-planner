# Design Brief: Guests Screen — Mobile RTL Redesign

**Product:** Event-planning web app (iPlan-style), Hebrew/RTL
**Screen:** Guests management ("אורחים") — mobile web
**Status:** Direction approved by product; ready for visual design
**Handoff to:** Design (no prior context assumed — this brief is self-contained)

---

## 1. Context & Problem

This is the guest-list management screen inside a Hebrew-language, RTL event-planning web app. Users land here to see everyone invited to an event, track RSVP status, search/filter the list, contact guests, and add new ones. It's a high-traffic screen during active RSVP periods, viewed almost entirely on mobile web.

**Current state is a responsive port of a desktop table UI, and it breaks on mobile.** Top to bottom, today's screen has:

1. Header: title "אורחים" + subtitle "נהל את אורחי האירוע", plus a pink pill button "הוסף אורח +" crammed near the title.
2. Two tabs: "קבוצות" (Groups) / "אורחים" (Guests, active).
3. A 2×2 grid of large stat cards — each with label, big number, icon, secondary count, and its own thin progress bar: אישרו (Confirmed) 9/11 · 6%, סה"כ רשומות (Total) 157/165 · 100%, סירבו (Declined) 1/1 · 1%, ממתינים (Pending) 147/153 · 94%.
4. A toolbar with three controls fighting for width: "יצוא ל-iPlan" (export), "ייבוא קובץ" (import), and a search input — the search box ends up visibly too small.
5. A filter row of three dropdowns (קבוצה / סטטוס / תאריך הוספה) that **overflows horizontally off the left edge of the screen** — a cut-off element is visible.
6. A data table (קבוצה / טלפון / שם columns) with guest rows — a multi-column table forced onto a ~360px-wide screen.

**Root cause:** the screen treats summary stats, filtering, bulk admin actions, and record browsing as four permanent, equal-weight, always-visible zones stacked vertically — a desktop pattern that consumes ~310px of vertical space before a single guest row is visible, and forces horizontal layouts (dropdown row, table) that don't fit mobile width at all.

---

## 2. Design Direction & Principles

Do not shrink-and-wrap the existing layout. Restructure around these principles:

1. **Search-first toolbar.** Search is the highest-frequency action; import/export are rare, admin-adjacent actions. Search gets the full-width row; import/export move into an overflow menu.
2. **Stats and filtering are the same data — merge them.** The 2×2 stat grid and the "Status" dropdown filter both express confirmed/pending/declined/total. Collapse both into one compact stacked-bar meter + a row of tappable status chips that double as the status filter. This removes an entire redundant control.
3. **Table → card list.** A 3-column table has no honest mobile equivalent. Each guest becomes a card: name, phone (tap-to-call / WhatsApp), group tag, and a status indicator — with swipe-to-reveal quick actions instead of needing to open a detail view for common actions.
4. **Secondary filters move to a bottom sheet, not an inline row.** Group filter + sort move behind a single "מסננים" (Filters) button with an active-count badge, opening a bottom sheet. This structurally eliminates the horizontal-overflow bug.
5. **Add-guest becomes a FAB**, not a header pill — frees header space, gives thumb-reach access, opens a quick-add bottom sheet rather than a full page navigation.
6. **Sticky vs. scrollable is deliberate.** The meter + chips + search cluster stays pinned while the card list scrolls beneath it; the app bar/tabs may collapse on scroll-down.
7. **RTL mirroring is one consistent rule, applied everywhere:** primary content hugs the physical **right** edge (RTL "start") — titles, names, front of the search input. Secondary/trailing affordances live at the physical **left** edge ("end") — overflow menu, filter icon, FAB, swipe-revealed actions.
8. **Status color is semantic and reserved**, never decorative and never the sole signal — every colored status indicator (meter segment, chip, card edge) is paired with a text label or icon. Colors must come from the product's real design-system status palette, contrast-checked and colorblind-safe-validated before shipping.

Net effect: 5 stacked desktop-derived zones become 3 mobile-native ones — a sticky utility cluster, a scrollable card list, and a FAB — cutting persistent header chrome from ~310px to ~160px sticky.

---

## 3. Screen Structure, Zones & Wireframe

### Default state

```
┌──────────────────────────────────────────────┐
│ ⋮                                     אורחים  │  App bar              ≈48px
├──────────────────────────────────────────────┤
│         קבוצות              [ אורחים ]        │  Tabs (sticky)        ≈40px
│                               ▔▔▔▔▔▔▔         │
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ┐
┃  157 אורחים                                  ┃ │  Status meter
┃  ▕🟩🟩🟩🟩🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟥▏         ┃ │  (stacked bar,        ≈40px
┃                                                ┃ │
┃ [●הכל 157] [●ממתינים 147] [●אישרו 9] [●סירבו 1]┃ │  Filter chips         ≈36px
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ │  STICKY
┃                                     חפש 🔍  ⚙︎3┃ │  Search + filter btn  ≈44px
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ ┘  cluster total       ≈160px
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  scroll shadow (hint only,
│                                                │   not a real element)
│ ┌────────────────────────────────────────────┐│
│ │                            דנה כהן      ▊🟩│││  Card — confirmed
│ │                 📞 050-123-4567   💬        │││   ≈76px
│ │                     [ הורים · חברים ]       │││
│ └────────────────────────────────────────────┘│
│ ┌────────────────────────────────────────────┐│
│ │                          יוסי לוי       ▊🟨│││  Card — pending
│ │                 📞 052-765-4321   💬        │││   ≈76px
│ │                        [ משפחה כלה ]        │││
│ └────────────────────────────────────────────┘│
│                                                │
│           ⋮  (147 more, virtualized)           │
│                                                │
│    ╭────╮                                     │
│    │  ＋ │                                    │  FAB, floating,       56px
│    ╰────╯                                     │  bottom-left (end)   diameter
└──────────────────────────────────────────────────┘
```

Heavy border (┏┃┓) = sticky cluster. Thin border (┌│└) = scrollable content.

**Above-the-fold math:** original ≈ 310px before row 1 (header/subtitle 64 + stat grid 150 + toolbar 48 + overflowing filter row 48). Redesign ≈ 248px total (app bar 48 + tabs 40 + sticky cluster 160), of which only the 160px cluster stays pinned during scroll. On a 360×780 viewport this is roughly 2 visible cards vs. 5+.

### Additional states to design

**Chip-filtered state:** tapping "אישרו" → that chip becomes filled/selected, others revert to outline, meter stays showing overall distribution, card list re-renders to confirmed only, list header/count updates (e.g. "9 אורחים").

**Swipe-open card state:**

```
│┌───────────────────┬────────────────────────────┐  │
││ 🗑    ✓    💬   📞  │      נועה מזרחי   ▊🟩│  │  Swiped right-to-left:
││                    │  053-999-8877         │  │  actions revealed from
│└───────────────────┴────────────────────────────┘  │  the left (end) edge
```

Only one card open at a time; tapping elsewhere or scrolling closes it.

**Empty states (need designer treatment):**
- No guests yet (first use): centered illustration/icon + primary CTA to add first guest.
- Search/filter yields zero results: compact inline message with an action to clear search/filters; meter and chips remain visible and functional above it.

**Loading state:** skeleton/shimmer for the meter+chip row and 3–4 shimmer cards. Sticky cluster position/height should not shift once real data loads (reserve the space).

**Bottom sheet — "מסננים" (Filters):** triggered by the ⚙︎ icon next to search. Contains Group filter (single/multi-select list), Sort control (date added newest/oldest, name A–Z), sheet header + close, primary Apply/clear-all action. Badge on trigger icon reflects active non-default filter count (chips have their own affordance, not counted here).

**Bottom sheet — "Quick add guest"** (via FAB): minimal form — name, phone, group — with save action; not a full page navigation.

**Overflow menu (⋮ in app bar):** "יצוא ל-iPlan", "ייבוא קובץ" — simple menu; import likely needs its own file-picker + confirmation flow, out of scope for this brief.

---

## 4. Interaction Specs

- **Tap targets:** minimum 44×44px for all interactive elements — chips, overflow icon, filter icon, FAB, card swipe-action icons.
- **Sticky cluster:** meter + chips + search/filter row stays pinned while the card list scrolls beneath it. App bar and Groups/Guests tabs may shrink or scroll away above it.
- **Chips row:** with only 4 items it should fit one row without scrolling. Selected chip = filled/high-contrast; unselected = outline. Every chip shows colored dot + label + count — never color alone.
- **Meter (stacked bar):** not interactive itself — a glanceable summary, distinct from the tappable chips beneath it.
- **Search input:** full width, matches across name/phone/group, debounced. Composes with the active chip filter (doesn't reset it). Search icon at input's right (RTL start); clear "×" at left when text present.
- **Filter icon button (⚙︎):** left/end of the search row, opens Filters bottom sheet, shows numeric badge for active filter count.
- **Card tap vs. swipe:** tap opens guest detail/edit. Swipe right-to-left (toward "end") reveals quick actions (🗑 delete · ✓ change status · 💬 WhatsApp · 📞 call) sliding in from the left edge.
- **Status indicator on cards:** colored edge/accent (right side, RTL start), same reserved color tokens as the meter/chips — always paired with other content, never the sole signal.
- **FAB:** fixed position, floats above scrolling content, bottom-left (RTL "end"), always reachable, opens quick-add bottom sheet.
- **List rendering:** virtualized given up to 150+ rows; infinite scroll, not pagination.
- **Color source:** all status colors (confirmed/pending/declined = good/warning/critical) must be pulled from the product's actual design-system tokens, contrast-checked and colorblind-safe-validated — the 🟩🟨🟥 markers here are placeholders for position/role only, not final hues.

---

## 5. Open Questions / Left to Designer's Judgment

**Locked (do not change):**
- The three-zone structure: sticky (meter+chips+search) / scrollable (card list) / floating (FAB).
- Merging stat cards + status filter into one meter+chips component (no separate Status dropdown should reappear).
- Filters row's move into a single bottom-sheet-triggering button (no inline dropdown row).
- Table → card list conversion.
- FAB for add-guest; bottom sheet for quick-add.
- RTL mirroring rule (primary content right/start, secondary actions left/end) applied consistently.
- Sticky cluster persists during scroll; card status is never color-only.

**Flexible — designer's call:**
- Exact iconography (FAB icon style, call/WhatsApp icons, filter icon, overflow icon) — use the product's existing icon system.
- Spacing scale, corner radii, elevation/shadow treatment, card visual style (bordered vs. borderless, shadow vs. divider) — follow existing design system.
- Typography scale/weights for name/phone/group text within cards.
- Exact copy for empty states, loading states, and confirmation toasts (e.g. after a status change from swipe actions) — coordinate with product/content.
- Whether the meter uses a single stacked bar or an alternative compact glanceable form (e.g. a slim donut/ring next to the count) — stacked bar is the recommendation but not mandatory.
- Whether app bar/tabs collapse fully on scroll or just shrink — either is acceptable as long as the sticky cluster stays fixed.
- Multi-select vs. single-select behavior in the Group filter sheet.
- Whether pull-to-refresh is added to the list — add if it fits the app's existing patterns.
- Dark mode treatment — apply the product's existing dark surface/status tokens; not detailed here.

# Home "How Guests Answered" Card - Design Brief

**For:** Claude Design
**Date:** 2026-10-03
**Product:** Kululu - event guest management for the Israeli market
**Claude Design project:** `20592c22-ce05-4935-8eff-a8bf3abd9f18`

A small, both-platform change to Home's analytics. Read alongside:

- [`CONTEXT.md`](../../CONTEXT.md) - binding vocabulary, especially **RSVP Source** (new),
  **Guest Record** vs **Guest**, **Call Round**, **Operator**, **Owner**
- [`home-page-brief.md`](./home-page-brief.md) - art direction (section 4) and constraints
  (section 10) apply unchanged
- [`home-desktop-brief.md`](./home-desktop-brief.md) - the desktop layout this card slots
  into. That brief keeps mobile out of scope; **this brief is the one exception**

---

## 1. Why

Home's analytics show two group cards built from the same rows: **Engagement by group**
(confirmed/pending/declined tri-bar plus "X/Y" per group) and **Group heads** (heads plus
confirmed % per group). The second repeats the first in a different visual. Group heads
is removed, and its slot goes to a stat that answers a different question: not *who*
answered, but *how* they answered.

## 2. The change

- **Remove `GroupHeadsCard`** on mobile and desktop. Its header summary ("N groups · M
  guests") moves onto **Engagement by group's** header, so nothing is lost
- **Add "How guests answered"** (working title, Hebrew `איך ענו האורחים`), placed
  **directly after the RSVP donut**
- New analytics order, on both platforms:
  1. RSVP donut
  2. **How guests answered** (new)
  3. Engagement by group (now with the summary in its header)
  4. Recent activity
- Desktop: the 2-column analytics grid in `home-desktop-brief.md` section 5 becomes
  **donut | how guests answered** (the two compact summaries) above **engagement by
  group | recent activity** (the two lists). Still top-aligned

## 3. What the card shows

The split of **answered RSVPs** by **RSVP Source**.

- **Unit: answers = Guest Records**, not heads. A family of five answering once is one
  answer. Label it as answers (`תשובות`), so it never seems to contradict the head counts
  in the Hero and the donut
- **Only answered Guest Records** (confirmed or declined). Pending belongs to the donut
  and must not appear here
- **Three segments, always in this order**, with these labels:

| Source | Label (he) | Meaning |
|---|---|---|
| Guest | `ענו בעצמם` (answered themselves) | The Guest answered in WhatsApp or on the RSVP page. These two can't be told apart, so don't try |
| Call Round | `בשיחה מצוות Kululu` (in a call from the Kululu team) | An Operator recorded it during a Call Round. Frame it as a **service Kululu performed**, never as something the Owner did |
| Guest list | `עודכנו ברשימה` (updated in the guest list) | Someone changed it in the guest list: the Owner, a collaborator, or an Operator correcting the list. **Never** "by you" - it isn't always the viewer |

- Rows with **no recorded source** (older data, a few percent on prod) are left out of
  both the segments and the total, so percentages describe only what is known. No
  "other" segment
- **Form:** one horizontal stacked bar over three legend rows, each showing count and
  %. Do **not** use the RSVP colour tokens: those mean confirmed/pending/declined, and
  reusing them here would read as status. Use `--primary`, `home-violet` and a third
  from `--chart-*`, each with a tint and a strong variant for text. The headline may be
  the total ("124 answers") or the share that answered themselves - choose one and say
  why

## 4. States

- **Normal:** all three sources non-zero
- **A source at 0:** all three legend rows **always show**; the card never changes
  shape
  - **Calls at 0, event paid** (`event.billingStatus`, already on the page): instead of
    a bare 0, the calls row gets a muted hint, `השיחות מתחילות אחרי סבבי הוואטסאפ`
    (calls start after the WhatsApp rounds). Two Call Rounds come with every paid
    Event, so this reads as "coming", not "not done"
  - **Calls at 0, event not paid:** a plain muted 0. No hint, no promise, no upsell -
    payment is out of scope on Home
  - Answered-themselves or list-updated at 0: a plain muted 0
- **Nothing answered yet** (including zero guests): the card's own empty state, e.g.
  `התשובות יופיעו כאן כשהאורחים יתחילו לענות` (answers will appear here once guests
  start replying). At desktop width it follows the compacted empty-state rule from
  `home-desktop-brief.md` section 6; on mobile it matches the other analytics empty
  states
- **Seating Manager:** sees it like every other analytics card
- **Loading / error:** like the other analytics cards - its own skeleton (a bar plus
  three rows) and its own section error
- Light and dark, RTL and LTR

## 5. Data (facts, for the designer's confidence)

- No new queries: the guest rows Home already loads carry `rsvp_status` and
  `rsvp_change_source` (`guest` / `admin_call` / `manual` / null)
- Prod snapshot, 2026-10-03: across published events, answered RSVPs were about 59%
  `guest`, 27% `admin_call`, 14% `manual`, plus ~4% with no source. Use proportions
  like these in the boards. Every event with answers would show this card
- The Back Office already shows the same split to Operators (`admin/queries/events.ts`)

## 6. Constraints

- Copy rules are binding: no em dashes, and no trailing periods on single-line UI text.
  The strings above are proposals; tighten them, but keep the framing (service for
  calls, neutral for the list)
- Build from the existing mobile analytics card anatomy (`Panel`, 15px bold title,
  legend rows like the donut's) in `src/features/home/components/mobile/analytics-cards.tsx`

## 7. Out of scope

- Telling WhatsApp apart from the RSVP page, or Owner from collaborator from Operator
  within "updated in the guest list" - the data doesn't record it
- A history of how an answer changed (only the latest source exists)
- Any other change to the analytics cards, beyond moving the group summary onto
  Engagement's header
- Making the card a link or filter into the guest list

## 8. Deliverable

A new file **`Home Answer Sources.dc.html`** in the Claude Design project:

- Mobile (390): normal; calls at 0 (paid); calls at 0 (unpaid); nothing answered yet;
  Engagement by group with its new header summary
- Desktop (1280, sidebar open): the analytics grid in its new pairing, normal and
  zero-guest compacted
- Dark for each, and one LTR board

If `Home Desktop.dc.html` is redone after this brief, it should use the new pairing.

## 9. Suggested skills

- **Claude Design tools** (`read_design_skill`, `read_file` on `Home Mobile.dc.html` for
  board conventions, `write_files`, `render_preview`)
- **`dataviz`** - for the stacked bar's colours and legend, so it doesn't read as RSVP
  status

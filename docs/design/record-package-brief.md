# Record Package - Design Brief

**For:** Claude Design
**Date:** 2026-10-02
**Product:** Kululu - event guest management for the Israeli market

The decisions are in [ADR 0027](../adr/0027-the-record-package-caps-sending.md), which builds on
[ADR 0002](../adr/0002-flat-per-record-pricing.md) and
[ADR 0024](../adr/0024-bonus-records-are-a-flat-gift.md). Vocabulary is binding and defined
in [`CONTEXT.md`](../../CONTEXT.md), in particular **Record Package**, **Paid Records**,
**Bonus Records**, **Reached**, **Guest Record** vs **Guest**, **Featured Action** and
**Free to Plan, Pay to Send**.

---

## 1. What we are designing

How an Owner sees the **Record Package** they bought for their Event: how many Guest Records
they paid for, how many they got free on top, how many they have used, and what happens to
the ones that don't fit.

The homepage pricing simulator already sells this: a slider for records, a channel choice, a
price, and a "+10 records free" line. After the purchase, nothing in the app mentions it
again. This brief closes that gap. There are five surfaces, ordered by how often the Owner
meets them:

1. **Guests page package meter**: a compact "used / package" line on the Guests tab
2. **"Outside the package" row tag** on the Guest Records that will not be sent to
3. **Featured Action on Home** while the list is over the package
4. **Billing sheet and More-page plan card**: the existing header-pill sheet and
   `EventPlanCard`, now with the package in them
5. **A new Plan & Billing page** (`/app/[eventId]/plan`): the full breakdown, payment
   history, and the records outside the package

Plus one Back Office screen (section 8), designed in the existing back-office style.

## 2. Who this is for

The same Owners as the rest of the app: Israeli couples and families planning a wedding,
henna or bar/bat mitzva, **mostly on a phone, mostly in Hebrew (RTL)**. They bought a package
by talking to Kululu on WhatsApp, not through a checkout, so the app is the first place they
see a record of it.

**Collaborators** (a partner's parent, a planner) add guests too. They see the counts, the
meter and the tags, because they are the ones who push the list over. They **never see
money**: no amounts, no payment history, no top-up button. The Plan & Billing page is
Owner-only.

## 3. The model in one paragraph (what the UI must make obvious)

The Owner paid for **N records** on a **channel** (SMS, WhatsApp, or WhatsApp + calls) and got
**Bonus Records** free on top: 10 when up to 200 are paid for, 20 above that, or a custom
number Kululu set. **Package = Paid + Bonus.** Planning is never limited, so the guest list can
grow past the package. But **when a Schedule sends, it only goes to Guest Records inside the
package.** Records that have already been sent to are always inside. Then the oldest
unreached records fill whatever room is left. The newest additions past the package are
**outside the package** and get skipped until the Owner buys more records (a top-up, at the
same rate) or removes records.

Worked example: paid 200, bonus 10, so the package is **210**. The list has **225** records,
so the **15 newest are outside the package** and the next reminder will not reach them.

The one feeling to avoid is *"some of my guests silently didn't get the invitation."* Every
surface exists so that skipping is never a surprise.

| State | Condition | Tone |
|---|---|---|
| No package yet | Event is `free`/`payment_pending` | none: the existing upsell, no meter |
| Room left | used < package | calm, neutral |
| Nearly full | 90% of the package or more used | soft heads-up |
| Full | used = package | neutral, "every new guest needs a record" |
| Over | used > package | warning: "N won't receive messages" |

"Used" counts every Guest Record in the list plus any Reached record that was later
deleted. In practice that is the list size, and the design does not need to explain the
deleted-records nuance except in one helper line on the Plan page.

## 4. Art direction

Resolve fully into the **app's** design system, as in
[`home-page-brief.md` §4](./home-page-brief.md#4-art-direction): `--primary` magenta,
`--radius: 0.65rem`, Heebo / Geist Sans, tabler icons, shadcn/ui (new-york). Design **light
and dark** for every artboard. Use logical properties throughout.

The package is a **calm utility, not an upsell**. The plum upsell surface
(`UPSELL_SURFACE_CLASS`) belongs to the *free* state only. Once the Owner has paid, the
package reads like a receipt and a fuel gauge: tabular figures, a quiet bar, and colour only
when something needs doing. The **Over** state is the only one allowed warning colour, and
it uses the existing warning token pair, never a bare red.

**Bonus Records must read as a gift, not small print.** On the homepage they are their own
line, "ללא עלות". Keep that: the bonus is a visibly separate segment or line, never folded
silently into one total.

## 5. Surfaces

### 5.1 Guests page package meter

The Guests tab already has a slim RSVP meter (`GuestMeterChips`, see
[`guests-page-brief.md` §5.1](./guests-page-brief.md)). Add the package as **one line
beside or under it**, not a second meter of the same weight. For example:

> **he** - `187 מתוך 210 רשומות בחבילה` · `נשארו 23`
> Over: `225 מתוך 210 רשומות בחבילה` · `15 מחוץ לחבילה` (warning, tappable)

- Tapping it opens the billing sheet (5.4). In the Over state, it filters the list to the
  records outside the package (5.2).
- Hidden while the Event has no package (free/pending). The existing upsell covers that.
- Desktop and mobile both. On desktop it sits in the meter row; on mobile it must not push
  the list down by more than one line.

### 5.2 "Outside the package" row tag

On each Guest Record outside the package, a small tag on the row (desktop table and mobile
card): `מחוץ לחבילה`. The list is virtualized, so the tag must fit the **existing row
height**: no extra line. In the `?guest=` drawer, the same record shows a one-line
explanation and, for the Owner, a link to the Plan page.

A filter chip "מחוץ לחבילה" joins the existing chip row only while at least one such record
exists.

### 5.3 Featured Action on Home

A Tier 2 (Urgent) card per [`home-page-brief.md` §6](./home-page-brief.md#6-featured-actions),
eligible while the list is over the package:

> **he** - `15 אורחים לא יקבלו הודעות` · `הרשימה גדולה מהחבילה - הוסיפו רשומות או הסירו מוזמנים`

Owner: tap opens the billing sheet with the top-up CTA. Collaborator: tap goes to the Guests
list filtered to the records outside the package, and the copy says to ask the Owner. No
dismiss, no push, no email.

### 5.4 Billing sheet and More-page plan card

Both already exist (`EventBillingStatusSheet`, `EventPlanCard`) and tell the "Free to Plan,
Pay to Send" story. In the paid state, add the package:

- **Plan card (More page):** channel name, plus a thin bar showing used / package, plus
  "נשארו N" or "N מחוץ לחבילה". The card's "פרטים" opens the Plan page instead of the sheet.
- **Sheet:** a compact breakdown under the status title: Paid · Bonus · Package · Used ·
  Left, the channel, a **"הוספת רשומות"** CTA (a WhatsApp conversation, as today, prefilled
  with the event and how many are over), and "לכל הפרטים" linking to the Plan page.

The free/pending states keep their current design.

### 5.5 Plan & Billing page (new, Owner-only)

Reached from the sheet, the plan card, and the More page. On desktop it is a normal page in
the event shell. On mobile it is a More subpage, with the back chevron.

Top to bottom:

1. **Package hero:** the big number is the **records left** (or **over by N** in the Over
   state). Under it is the breakdown as a segmented bar: Paid (primary), Bonus (a visibly
   different "gift" treatment), and Used as a fill across both. The channel label sits
   beside it (`וואטסאפ + שיחות`).
2. **Breakdown list:** `רשומות ששולמו` 200 · `רשומות בונוס - ללא עלות` 10 · `סה״כ בחבילה`
   210 · `בשימוש` 187. If Kululu set a custom bonus, a small "הטבה מצוות Kululu" note.
3. **Outside the package** (only when over): the count, the explanation in one sentence,
   and a "הצגת הרשומות" link to the filtered Guests list. Primary CTA: add records.
4. **Payments:** one row per recorded payment, newest first: date, records added, channel,
   amount (`₪0 · מתנה` for a gift), and the first payment marked as the opening purchase.
   No receipts or invoices in v1.
5. **Footer helper:** how the package works, in three short lines, including "a record
   that already received a message stays counted even if it is deleted".

### 5.6 What a Schedule says (light touch)

Not a redesign of Schedules. When a Schedule has gone out with records skipped, its results
line includes `15 לא נשלחו - מחוץ לחבילה`, in the same style as other skip reasons in
Schedule Results.

## 6. States to design

- **No package** (free, payment pending): confirm the meter and tags are absent and the
  existing upsell is unchanged
- **Room left** (187 / 210), **nearly full** (205 / 210), **exactly full** (210 / 210),
  **over** (225 / 210)
- **Over by a lot** (480 / 210): long counts, filter, Featured Action
- **Custom bonus** (200 paid + 30 bonus from Kululu)
- **Gift event** (₪0 payment, 150 records): no price shown anywhere, just "מתנה מ-Kululu"
- **Top-ups**: three payments in history; a big package (1,000 + 20)
- **Collaborator view** of the meter, tag, Featured Action and drawer: counts only, no money
- **RTL and LTR, light and dark**, mobile and desktop for every artboard

## 7. Constraints

- **Next.js 16, React 19, Tailwind 4, shadcn/ui (new-york)**, tabler icons, existing
  primitives in `src/components/ui/`
- **Copy rules are binding**: no em dashes; no trailing periods on single-line UI text
- **Vocabulary is binding**: the package is counted in **guest records** (`רשומות`), never
  guests. Never "plan", "tier", "capacity", "quota" or "credits" (ADR 0002, ADR 0027). The
  Hebrew is `חבילה` / `חבילת רשומות`
- **No checkout.** Payment happens over WhatsApp with the Kululu team. Every "buy more"
  is a WhatsApp CTA, never a price calculator or card form
- **Nothing blocks planning.** Never disable "Add guest" or the import because the list is
  over the package
- Reuse: `EventPlanCard`, `EventBillingStatusSheet`, `GuestMeterChips`, the Featured Action
  card, `BILLING_TONE_CLASS`

## 8. Back Office (one screen, existing style)

In the event workspace's billing area, beside the status control:

- **Record payment:** records, channel, amount (₪, may be 0), method (bank transfer / Bit /
  cash / gift / other), reference, note. A live preview shows "Package after this payment:
  250 + 20 bonus = 270".
- **Bonus:** "Automatic (20)" with an override field and a "Reset to automatic" action.
- **Package summary and payment history**, the same numbers the Owner sees, plus who
  recorded each payment.

There is no `comped` option anywhere. A free event is a ₪0 payment with method `gift`.

## 9. Out of scope

- Enforcing the channel (an SMS package sending WhatsApp), see backlog 0016
- Online checkout, invoices, receipts, refunds
- The homepage simulator itself
- Choosing which records are left out (always oldest first, no picker)

## 10. Deliverable

`.dc.html` artboards in the Claude Design project, light and dark, RTL first:

- `Record Package Guests.dc.html`: meter in each state (desktop + mobile), row tag, filter
  chip, drawer line, collaborator view
- `Record Package Plan.dc.html`: Plan & Billing page (mobile + desktop) in room-left,
  over, custom-bonus, gift and top-up states; the updated sheet and More card
- `Record Package Home.dc.html`: the Featured Action card, Owner and collaborator
- `Record Package Back Office.dc.html`: record payment dialog, bonus override, history

# Kululu Partners - Design Brief

**For:** Claude Design
**Date:** 2026-09-19
**Product:** Kululu - event guest management for the Israeli market

Companion decisions live in [ADR 0020](../adr/0020-partners-are-paid-per-referred-account.md)
and [ADR 0021](../adr/0021-an-operator-may-record-a-payment.md). Domain vocabulary
(**Partner**, **Partner Code**, **Referral**, **Referral Gift**, **Commission**,
**Payout Statement**) is defined in [`CONTEXT.md`](../../CONTEXT.md) and is binding
for all copy.

---

## 1. What we are designing

A small new sub-app, **Kululu Partners**, served on `partners.kululu.co.il`, plus the three
places a Couple meets a Partner Code inside the main app.

**Partner app**
1. Invitation acceptance and login
2. Partner onboarding (business, contact, tax and bank details)
3. Home
4. Referrals
5. Payouts
6. Settings
7. The share kit: link, QR code, WhatsApp text, Instagram story image

**Couple touchpoints (main app)**
8. The `/join/<CODE>` landing
9. "Have a code?" in onboarding and on the payment / kick-off screen
10. The Referral Gift on the Couple's timeline

**Out of scope:** the Back Office screens (create and invite a Partner, statements, record a
payment, mark a statement paid). They are built in the existing back-office style, and email
templates will follow the brand.

**The scope is deliberately small.** It should launch fast. Few screens, few inputs, but
every one of them polished. A Partner is recommending Kululu to their own clients. If
the dashboard looks cheap, the recommendation feels cheap.

## 2. Who this is for

**Partners:** Israeli event businesses such as DJs, photographers, videographers, venue
managers and event planners. Mostly one-person or small businesses. They meet Couples months
before the wedding, usually over WhatsApp, and they live on their phones between gigs.

- **Hebrew only. RTL only.** There is no English version of this sub-app. Design in Hebrew.
- **Mobile is the primary device.** A Partner checks their earnings on a phone at 1am after
  an event. Desktop is the adaptation.
- They are not software people. They want three answers, fast: *what do I share*, *who
  signed up*, *how much am I getting and when*.

**Couples** (touchpoints only): the same audience as the main app. See
[onboarding-flow-brief.md](onboarding-flow-brief.md) section 2.

## 3. The model in one paragraph (what the UI must make obvious)

Each Partner has one permanent **Partner Code** (e.g. `ROIDJ`). The Partner shares it as a
link or as a word. A Couple who uses it gets a **Referral Gift**: one free extra WhatsApp
reminder for their event. The Couple is now a **registered** Referral. When the Couple pays
for their first event, the Referral becomes **qualified** and the Partner earns a fixed
**Commission** (per Partner, e.g. ₪100). On the 1st of each month Kululu issues a **Payout
Statement** for last month's qualified Referrals. The Partner uploads a tax invoice or receipt
for that amount, and Kululu wires the money.

Statuses the UI shows:

| Thing | States |
|---|---|
| Referral | `נרשם` registered, `הצטרף בתשלום` qualified (earning), `שולם` included in a paid statement |
| Payout Statement | `ממתין לחשבונית` issued, awaiting invoice; `בטיפול` invoice received; `שולם` paid (with transfer date) |
| Partner | active; ended (code no longer accepted, statements read-only) |

## 4. Art direction

**Kululu brand, business tone.** Use the same tokens, fonts and components as the main app,
so the Partner recognises the product they recommend. The mood is calmer and more
ledger-like than the Couple app. **Numbers and money are the heroes**, not wedding imagery.
No confetti, no hearts, no celebration photography.

| | Use |
|---|---|
| Primary | `oklch(0.592 0.249 333)` app magenta (marketing `#D23CC2`) |
| Ink / surfaces | the app's `--foreground`, `--muted-foreground`, `--background`, `--card` |
| Hebrew type | Heebo |
| Numerals | tabular figures for every amount and count; `₪` placement per Hebrew convention |
| Radius | `--radius: 0.65rem` |
| Components | shadcn/ui (new-york), as in the main app |

All fonts are already loaded in `src/app/layout.tsx`.

**The one hero moment is the Partner Code card.** It is the most important object in
the app: the code in large, confident, letter-spaced type, the link under it, and the
share actions attached. It should look good enough that a Partner screenshots it and posts
it. The QR code and the Instagram story image are this same card rendered for export, so
design it once, as a brand object, and derive the other two from it.

## 5. The Partner app

### 5.1 Invitation and login

The Partner receives a personal Invitation link from Kululu (sent by hand, over WhatsApp).
It opens a welcome screen that already knows who they are: the business name the Operator
entered, and their Commission rate. Then the standard login: **phone OTP or Google**, the
same as the main app, with no password and no separate sign-up.

> **he** - `ברוכים הבאים לשותפים של כלולו, {businessName}` · תת: `על כל זוג שמגיע דרככם ומשלם - {amount} ₪ אליכם`

States to design:
- invitation valid
- invitation expired or already used (`ההזמנה פגה - בקשו מאיתנו קישור חדש`)
- already logged in as someone else

### 5.2 Onboarding

This is the only real form in the app, and it happens once. Keep it to a few short steps with
a clear sense of "almost done", or a single well-grouped page. Designer's call, as long as it
works on a phone with the keyboard open.

1. **Business:** business name (prefilled, editable), contact name, email (required, used for
   notifications, since a Partner may have logged in with a phone number only), phone
   (prefilled from login)
2. **Tax status:** `עוסק פטור` / `עוסק מורשה` / `חברה בע"מ`, business or ID number (ח.פ. /
   ע.מ.), optional upload of a withholding-tax certificate (`אישור ניכוי במקור`)
3. **Bank details:** bank, branch, account number, account holder name

Explain *why* before asking for bank details: "so we can pay you at the start of every
month". Bank and tax details can be skipped at onboarding and completed later, but a
statement can't be paid until they exist. Home shows a persistent, calm prompt until then.

### 5.3 Home

In priority order:

1. **Partner Code card** (the hero, section 4), with share actions: copy link, copy code,
   share to WhatsApp, show QR, story image.
2. **KPI row**, four compact cards:
   - `נרשמו` registered referrals, all time
   - `הצטרפו בתשלום` qualified, all time
   - `צברת החודש` earned this month (qualified this month × rate), the next statement's amount
   - `שולם עד היום` paid out, lifetime
3. **Next payout line:** "Your next statement is issued on 1 October: ₪400". If a statement
   is waiting for an invoice, this becomes the call to action instead: "Upload an invoice for
   ₪300 to get paid".
4. **Recent Referrals:** the last five, linking to the full list.

**Empty state matters most**, because every Partner starts with zero. Day one should not
look like a dead dashboard. It should say what to do next: share the code, and here's how.
This is where the share kit is most prominent.

### 5.4 Referrals

A list, newest first, filterable by status. Each row shows:
- The Couple as **first names with an initial only**, e.g. `נועה וד׳`. No surnames, phones,
  emails, exact dates or anything from inside their event. This is a privacy rule, not a
  space constraint.
- Event type and month (`חתונה · מרץ 2027`)
- Status chip (section 3), and for qualified or paid rows the Commission amount
- The date it registered

No row opens a detail page. There is nothing more to show.

### 5.5 Payouts

A list of Payout Statements, one per month with activity (no statement for a month with
nothing qualified). Each statement has:
- month, amount, number of Referrals, status
- expands to the Referrals it covers
- **Upload invoice** (PDF or image) while `ממתין לחשבונית`. After upload it shows the file and
  the state `בטיפול`.
- once paid: the transfer date and reference

Copy should explain the invoice requirement once, plainly, without legal language: "For
every payment we need an invoice or receipt from you for the exact amount".

### 5.6 Settings

The onboarding fields, editable: business, contact, tax, bank. Changing bank details should
be a deliberate act with a confirmation. Plus notification preferences and logout.

An **ended** Partner sees a banner (`השותפות הסתיימה - הקוד כבר לא פעיל`), and the whole app
becomes read-only statements and referrals. The share kit is gone.

### 5.7 The share kit

- **Link:** `kululu.co.il/join/ROIDJ`. Copy with a clear "copied" confirmation.
- **QR code:** the Partner link as a QR code, downloadable as PNG, framed in the code card
  styling with the code printed underneath. It goes on booth signs, price quotes and
  business cards, so it needs to hold up in print.
- **Ready-to-send WhatsApp text:** a pre-written Hebrew message with a one-tap share to
  WhatsApp (`wa.me/?text=`), editable before sending. Draft:
  > `מתכננים חתונה? את אישורי ההגעה תנו לכלולו 💌 עם הקוד שלי ROIDJ תקבלו תזכורת וואטסאפ נוספת במתנה: kululu.co.il/join/ROIDJ`
- **Instagram story image:** a 1080×1920 image (and a 1080×1080 square) generated per
  Partner: the code card, the QR, the gift promise and the Kululu mark. Design the template.
  The Partner's code and business name are the only variables.

### 5.8 Navigation

Four destinations: **Home, Referrals, Payouts, Settings**. Bottom nav on mobile, a slim
sidebar on desktop, following the main app's shell patterns. No event switcher, no main-app
navigation. This is a separate product.

### 5.9 Email notifications

Via Resend, brand-consistent, Hebrew, RTL. Two emails:
- **A Referral qualified:** "Noa & D. joined with payment - you earned ₪100"
- **A statement was issued:** amount, and a button to upload the invoice

Design is light: a shared template with a headline, one number and one button.

## 6. Couple touchpoints (main app)

The gift is the reason a Couple uses a code, so every touchpoint leads with **the gift**,
never with "referral" or tracking language.

### 6.1 `/join/<CODE>`

A Couple taps a Partner's link. They land on a page that thanks them on the Partner's
behalf and promises the gift, then continues into the normal signup / onboarding. The code
is remembered and applied automatically.

> **he** - `{businessName} שלח אתכם אלינו` · תת: `הירשמו וקבלו תזכורת וואטסאפ נוספת לאורחים - במתנה`

States: valid code; unknown or ended code (still lets them continue to Kululu, just without
the gift, with no dead end).

### 6.2 "Have a code?"

This appears in two places: a quiet, optional line in the event onboarding flow, and a more
visible field on the **payment / kick-off screen**. The payment screen is the most
important, because it catches Couples who found Kululu on Google and remember the code only
now.

- Collapsed by default (`יש לכם קוד מספק?`) and expands to a single input.
- On a valid code: an instant confirmation naming the Partner and the gift, e.g. `הקוד של
  {businessName} הופעל - תזכורת נוספת במתנה`.
- If a code is already applied, the field is replaced by that confirmation, which cannot
  be changed.
- Error states: unknown code, ended code, own code (a Partner can't use their own), code
  entered after payment (not possible, so the field is simply absent after payment).

### 6.3 The gift on the timeline

On the Couple's first paid event, the gift appears on the schedule timeline as one extra
WhatsApp reminder, marked as a gift (`מתנה מ-{businessName}`). It should feel like a bonus
already added for them, not a coupon to redeem.

## 7. States checklist

- Partner Home: brand-new (zero referrals), registered referrals but none qualified yet,
  earning, statement awaiting invoice, missing bank details, ended partnership
- Referrals: empty, filtered-empty, long list
- Payouts: none yet, awaiting invoice, invoice uploaded, paid
- Invitation: valid, expired or used, signed in as the wrong user
- Couple code entry: collapsed, valid, invalid, ended, own code, already applied
- Loading skeletons for the KPI row and lists. Uploads with progress and failure.

## 8. Copy rules

- Hebrew first. Use the terms from `CONTEXT.md`.
- No em dashes; use a regular hyphen.
- No trailing periods on single-line UI text (labels, buttons, toasts, errors).
- Amounts are always `₪` with tabular numerals. Dates are day and Hebrew month name.
- Money copy is plain and exact. Never "up to", never "estimated" for an amount that is
  already earned.

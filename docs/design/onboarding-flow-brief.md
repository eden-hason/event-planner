# Onboarding Flow - Design Brief

**For:** Claude Design
**Date:** 2026-08-14
**Product:** Kululu - event guest management for the Israeli market

Companion decisions live in [ADR 0002](../adr/0002-flat-per-record-pricing.md)
and [ADR 0003](../adr/0003-events-exist-before-they-are-complete.md). Domain
vocabulary is defined in [`CONTEXT.md`](../../CONTEXT.md) and should be treated
as binding for all copy.

---

## 1. What we are designing

Everything a new user sees between "I want in" and "I have a workspace":

1. The login / OTP screens
2. The event creation flow
3. The payoff moment
4. Their first arrival on the dashboard

The current flow works and is not engaging. It is a `max-w-sm` card with a
progress bar, rendered inside the app shell, that asks four questions and shows
a confetti icon. Nothing about it suggests that a wedding is being planned.

**The goal is not a prettier wizard.** It is that the couple finishes onboarding
feeling like their event now exists.

## 2. Who this is for

Israeli couples planning a wedding, and families planning a henna or a
bar/bat mitzva. They arrive from the marketing homepage, usually on a phone,
usually having just been sent the link by a friend who used Kululu.

- **Hebrew is the primary language. RTL is the primary direction.** English is
  maintained (`messages/en.json`) but Hebrew is what most users see. Design in
  Hebrew first; do not design an English screen and assume it mirrors.
- **Mobile is the primary device.** The desktop layout is the adaptation, not
  the other way round.
- They are not signing up for software. They are doing an errand connected to
  the most emotionally loaded event of their life.

## 3. The thesis

**One question per screen, and a card that builds as they answer.**

Each screen asks for exactly one thing and fills the viewport. Persistently on
screen is an **event card** which gains a real line with every answer: the
names, then the date, then the venue. By the last screen it is complete.

The immersion comes from watching the thing get built, not from decoration. The
card is the spine of the whole flow and the single most important thing to get
right.

At the end, that card becomes the dashboard's permanent hero
(`event-hero-banner.tsx`). What they made is what they keep. This is why the
card must be designed as something that can live on a dashboard forever, not as
a one-off onboarding flourish.

## 4. Canvas and art direction

### Canvas

**Full-bleed takeover with no app chrome.** No sidebar, no top bar, no mobile
bottom nav. Onboarding moves out from under the `/app` layout into its own
route group and layout.

This matters: today the wizard renders with a sidebar containing no events and
a nav to pages the user cannot yet visit. Removing it is most of the fix.

### Visual language

The takeover speaks the **marketing homepage's visual language**, then resolves
into the app's design system at the dashboard. The user has just come from the
homepage; onboarding should read as its continuation, so the brand never drops.
The shift to app chrome at the dashboard then becomes the "you have arrived"
signal rather than a jarring seam.

The two systems are closer than they look - they share a brand hue.

| | Marketing (use this) | App (resolve into this) |
|---|---|---|
| Primary | `#D23CC2`, deep `#B92AAB` | `oklch(0.592 0.249 333)` - same magenta |
| Ink | `#1A0B2E` / `#4B3A63` / `#8A7AA0` | `--foreground` / `--muted-foreground` |
| Surface | `--bg #FAFAFA`, `--card #FFFFFF` | `--background` / `--card` |
| Latin type | Rubik | Geist Sans |
| Hebrew type | Heebo | Heebo |
| Feel | Large type, generous space, soft gradients, rounded pills | Restrained, `--radius: 0.65rem` |

All five font families (Geist, Rubik, Heebo, Plus Jakarta, Assistant) are
already loaded globally in `src/app/layout.tsx`. Nothing new needs adding.

Reference the homepage's `.wo-card`, `.btn-primary`, `.badge` and `.eyebrow`
treatments in `src/app/(main)/[locale]/_components/homepage-client.tsx` - the
takeover should feel like it came from the same hand.

### Motion

Motion is doing real work here, not ornament. Two things need it:

- **Question transitions.** Each screen replaces the last. Directional, so
  going back feels like going back. Must respect `prefers-reduced-motion`.
- **The card gaining a line.** When an answer lands, the card should visibly
  grow. This is the payoff of every single screen and the reason the flow feels
  alive. It should read as the card becoming more itself, not as a list item
  appearing.

Avoid: confetti as the primary celebration device (that is what it does today),
progress bars as the primary sense of movement, and loading spinners between
questions - answers save in the background and must never block.

## 5. The flow

### 5.0 Login / OTP

Two paths, both existing: **phone OTP** (Israeli numbers, normalized to `+972`)
and **Google**. There is no email/password and no separate sign-up screen - a
first-time user and a returning user use the identical form.

These screens are in scope for styling. They are the first thing anyone sees
and currently use a plain shadcn card on a `bg-muted` field. They should be the
opening beat of the takeover, not a generic auth page.

The OTP entry step in particular deserves care: it is a moment of waiting, and
it is where a user is most likely to drop.

### 5.1 Screen 1 - Event type

Four options: **wedding, henna, bar mitzva, bat mitzva**.

This screen sets the tone for everything after it and is the only screen that is
purely a choice, so it can be the most visual. Four equal, tappable, confident
targets. It should be obvious that picking one changes what follows.

> **he** — כותרת: `מה חוגגים?` · תת: `נתאים לכם את השאר לפי סוג האירוע`
> אפשרויות: `חתונה` · `חינה` · `בר מצווה` · `בת מצווה`
>
> **en** — `What are we celebrating?` / `We'll tailor the rest to your event`
> `Wedding` · `Henna` · `Bar Mitzva` · `Bat Mitzva`

Selecting a type creates the event immediately (see ADR 0003). From here on the
card exists.

### 5.2 Screen 2 - Names

Branches on type. Wedding and henna ask for two names; bar and bat mitzva ask
for one.

This is the screen where the card comes alive, because the names are what make
it theirs. Design the moment where the card goes from blank to "דנה & יוסי".

> **he (couple)** — `מי הזוג המאושר?` · שדות: `שם הכלה` / `שם החתן`
> **he (child)** — `מי חוגג?` · שדה: `שם החוגג/ת`
>
> **en (couple)** — `Who's the happy couple?` · `Bride's name` / `Groom's name`
> **en (child)** — `Who's celebrating?` · `Name`

The event title is generated from these names server-side and is never shown as
an editable field.

### 5.3 Screen 3 - Date

A date picker, plus an explicit escape hatch. Many couples sign up before the
date is locked, and the current flow turns them away by making it required.

> **he** — `מתי זה קורה?` · תת: `תמיד אפשר לשנות`
> פעולה משנית: `עדיין אין לנו תאריך`
>
> **en** — `When's the big day?` / `You can always change this`
> Secondary: `We don't have a date yet`

**Design both branches.** Choosing "no date yet" is a legitimate path, not a
failure, and the copy must not make it feel like skipping. The card then shows
the event without a countdown, and it needs to look deliberate rather than
broken - this is the hardest single state in the brief.

Everything downstream depends on the date: the countdown, and the entire message
schedule, whose timings are all offsets from it. A dateless event is a real
workspace with a dormant schedule, and the design should imply that gently
rather than nag.

### 5.4 Screen 4 - Venue

Google Places autocomplete (existing `LocationInput`). Optional.

> **he** — `איפה חוגגים?` · תת: `נשלח למוזמנים ניווט למקום`
> פעולה משנית: `עוד לא סגרנו מקום`
>
> **en** — `Where's it happening?` / `We'll send your guests directions`
> Secondary: `Haven't booked a venue yet`

The "we'll send your guests directions" line is the first hint of what Kululu
actually does for them. Worth giving weight.

### 5.5 Screen 5 - What it will cost

The most important new screen, and the one with the most to communicate. It is
**not a checkout**. Nobody pays here, or anywhere in onboarding.

Its job is to make the couple understand the deal before they ever hit a
paywall: planning is free, and when they eventually send, this is roughly what
it costs.

**Three elements:**

1. **A records slider.** How many guest records they expect. Use the word
   *record* (`רשומה`), not *guest* - see `CONTEXT.md`, one record can be a
   family of five and records are the billing unit. The slider should feel
   generous and low-stakes, because the number is a guess and will change.

2. **A channel toggle: WhatsApp or SMS.** SMS is cheaper. This is the tradeoff
   we want visible - it is a genuine choice with a genuine saving, and showing
   it builds trust. **The choice is not binding** and is not saved; it is
   re-made at payment time. Do not design it as a commitment.

3. **The live price**, recalculating as either input changes:
   `records × rate`. Two rates, one per channel.

**What is included, shown as a real list.** Identical on both channels:

- The invitation
- Two confirmation rounds (asking guests to RSVP)
- An event reminder on the day, carrying table number, directions and gift link
- A thank-you message after the event
- **Two rounds of phone calls made by the Kululu team** to guests who still
  have not answered

That last item is the differentiator and should be visually weighted as such.
Note the framing carefully: per `CONTEXT.md`, call rounds are **a service
Kululu performs, not a feature the couple operates**. The copy is "we call
them", never "you can call them".

> **he** — `כמה זה יעלה לכם?` · תת: `משלמים רק כששולחים - עד אז הכל בחינם`
> סליידר: `כמה רשומות מוזמנים, בערך?`
> ערוץ: `וואטסאפ` / `SMS`
> כלול: `ההזמנה` · `2 סבבי אישור הגעה` · `תזכורת ביום האירוע` · `הודעת תודה` · `2 סבבי שיחות טלפון מהצוות שלנו`
> CTA: `יאללה, מתחילים`
>
> **en** — `What will this cost you?` / `You only pay when you send - everything until then is free`
> `Roughly how many guest records?` · `WhatsApp` / `SMS`
> CTA: `Let's go`

**Rates are parameters, not fixed values in the design.** WhatsApp is currently
advertised publicly at `1.5 ₪` per record. The SMS rate is not yet decided.
Design so both numbers can change without the layout breaking, and so the
saving between them reads clearly whether it is large or small.

### 5.6 The payoff

The card expands to full size and is, for a beat, the only thing on screen.
Their names, their date, a countdown, their venue.

Then it carries them into the dashboard - the same card, continuous, becoming
the hero of their new workspace. **Design the transition, not two screens.**
The continuity is the whole point: the app chrome assembling around a card that
was already there is what makes arrival feel earned.

> **he** — כותרת: `החתונה של דנה ויוסי` · `עוד 214 ימים`
> CTA: `בואו נוסיף מוזמנים`
>
> **en** — `Dana & Yossi's Wedding` / `214 days to go`
> CTA: `Let's add your guests`

Design the no-date variant of this too.

### 5.7 First dashboard moment

A **distinct first-visit state that decays into the normal dashboard.**

The problem to solve: a brand new dashboard is a grid of cards all reading
zero - no guests, no RSVPs, no schedules. Landing on it immediately after a
warm, personal flow is the moment the magic currently dies.

The first visit should foreground **one** thing: get the guest list in. Nothing
else works without it, and it is the action with the biggest payoff. The zeroed
stat cards should be suppressed, deferred, or reframed as anticipation rather
than emptiness, and fill in behind as real data arrives.

The existing `OnboardingChecklistCard` becomes the ongoing spine after that
first visit. It needs rework:

- Its "details" item is now **already complete** - the new flow captures names,
  date and venue
- Its collaborator item links to `/app/{eventId}/settings`, **which does not
  exist and returns 404**. Repoint it at `/app/{eventId}/collaborate` or drop
  the item
- It should feel like momentum, not a chore list

## 6. The event card

The single most important asset. Specify it as a component with stages, since
it appears at every step and then lives forever.

| After | The card shows |
|---|---|
| Type | An empty vessel, unmistakably shaped for the chosen event type |
| Names | The names, prominently. The card is now theirs |
| Date | The date, and a live countdown - or a deliberate dateless state |
| Venue | The venue |
| Estimate | Complete, and ready to expand into the payoff |

**On mobile it is persistent but compact**: a strip above or below the question
that visibly gains a line with each answer, then expands to full size at the
payoff. It must never crowd the question or the keyboard.

**On desktop** it sits beside the question at full size throughout.

It must work with any subset filled, since the couple can leave and return at
any stage, and since the dateless path is permanent for some events.

## 7. States to design

Beyond the happy path:

- **Returning to an unfinished event.** `/app` routes them back into the
  takeover, resuming at the first unanswered question, with a welcome-back
  frame that acknowledges the return and shows the card already partly built.
  Something like `דנה ויוסי, בואו נסיים` / `Dana & Yossi - let's finish up`.
  They should never land mid-flow with no explanation
- **No date yet** - card, payoff and dashboard hero variants
- **No venue yet**
- **Bar/bat mitzva** - single name throughout, and copy that never says "couple"
- **Validation** - a name left empty, an impossible date
- **A save failing** in the background. Answers persist as they go, so this is
  quiet recovery, never a blocking error
- **RTL and LTR** for every screen
- **`prefers-reduced-motion`** for every transition

## 8. Constraints

- **Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui (new-york).** The
  dashboard side must use the existing design system and components. The
  takeover has more latitude but should still be buildable with Tailwind and
  the existing primitives
- **RTL is not an afterthought.** Use logical properties (`ms`/`me`, `ps`/`pe`),
  and remember directional icons flip - the codebase already does this with
  `rtl:rotate-180`
- **Copy rules**, from `CLAUDE.md` and enforced in review:
  - **No em dashes.** Use a regular hyphen
  - **No trailing periods** on single-line UI text - labels, buttons, toasts,
    errors. Multi-line paragraphs may keep them
- **Vocabulary is binding.** `CONTEXT.md` is the glossary. In particular:
  *Guest Record* is the billing unit, *Guest* is a person; call rounds are
  something Kululu does for you; there is no "viewer" or "editor" role
- Existing pieces available: `LocationInput` (Google Places), `DatePicker`,
  `event-hero-banner.tsx`, `event-countdown-card.tsx`, `OnboardingChecklistCard`

## 9. Out of scope

- **A settings screen. This is a hard prerequisite, tracked separately.** The
  new flow deletes the profile step, and there is currently no other place to
  set a name, phone, avatar or email - `updateUserProfile` is called from that
  step and nowhere else. The onboarding cannot ship until somewhere else can
  edit profile data
- Payment and checkout. Onboarding never takes money
- Template selection. It stays where it is, in the templates page
- The guests, budget, seating and schedules pages
- Marketing homepage changes, though ADR 0002 requires some

## 10. What each screen writes

For context only - none of this constrains the visual design.

| Screen | Writes |
|---|---|
| Type | Creates the event row: `event_type_id`, `status='draft'` |
| Names | `host_details`, generated `title` |
| Date | `event_date`, nullable |
| Venue | `location` |
| Estimate | `guests_estimate`. Channel and price are **not** saved |
| Complete | `status='published'` |

`guests_estimate` is currently a `text` column; a slider should be writing an
integer, so this wants tightening during implementation.

## 11. Open input

**The SMS rate.** WhatsApp is publicly `1.5 ₪` per record. SMS is meant to be
cheaper but the figure is not decided. Design against both as named parameters.
The estimator does not depend on the exact numbers, only on there being two and
on the cheaper one being visibly cheaper.

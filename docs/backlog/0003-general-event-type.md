# There is no event type for anything that is not a wedding, henna or mitzva

Status: open
Area: events / onboarding
Related: `supabase/migrations/20260918000002_confirmation_1_template.sql`, CONTEXT.md
(Event, Occasion Phrase)

## The problem

`event_types` holds exactly four rows: wedding, henna, bar_mitzva, bat_mitzva. A birthday,
a brit, a corporate evening or an engagement party has nowhere to go - CONTEXT.md already
lists birthdays and corporate events as Events, but the product cannot create one.

## What is already in place

The first event-type-generic Template, `confirmation_1`, was built so that such a type
needs no Template change:

- Its type-specific wording arrives in one placeholder, the **Occasion Phrase**
  (`buildOccasionPhrase` in `src/features/events/utils/event-title.ts`), read after
  "הוזמנתם ל". It has **no** fallback: a type with no frame there has no phrase, and a
  send that needs one fails with a reason (`missingOccasionPhrase`). A general type
  therefore needs either its own frame in `OCCASION` or - the direction preferred on
  2026-09-18 - a separate template whose copy does not say "הוזמנתם ל...".
- The naming convention reserves the absence of an event-type prefix for "fits every type"
  (`confirmation_1`). `general_` was deliberately *not* used for that, so a future
  `general` type can use the prefix for itself without ambiguity.

## What adding it would take

- An `event_types` row, and its `event_type_default_schedules` (at least the two
  Confirmation rounds on `confirmation_1`; there is no generic Invitation, Event Reminder
  or Thank You template yet).
- `EventTypeKeySchema` and every exhaustive map over it (`event-title.ts` HE/EN frames,
  the RSVP page's time-row labels, onboarding copy).
- A host-details shape: couple events store bride/groom, mitzvas store child. A general
  event probably wants a free-text title the Owner types, which is new - today the title
  is always generated from the names.
- Pricing: whether a general event is priced like the others (ADR 0002).

## What "done" means

An Owner can create a general event in onboarding, and its Confirmation rounds send with
copy that reads naturally for it.

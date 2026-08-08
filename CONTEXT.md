# Context

The shared vocabulary for Kululu. This file is a glossary and nothing else - no
implementation details, no specs, no decisions. Decisions live in `docs/adr/`.

---

## Event

A single celebration being planned - a wedding, henna, bar/bat mitzvah, birthday or
corporate event. Everything else in the system hangs off exactly one Event.

A wedding is the archetype and the core market, but the model is not wedding-specific.

## Couple

The people planning the wedding. The buyer and the primary user. Used in
market/positioning language, not as a system entity - in the system they are simply the
Event's **Owner** and their partner.

## Guest

A person invited to the Event. Distinct from a **Guest Record** (below): one Guest Record
may represent several Guests.

## Guest Record

**The unit of billing.** One row in the guest list, which may cover more than one Guest -
a family of five arriving as one entry is one Guest Record with an amount of five.

Plans are priced per Guest Record, not per Guest. Say "guest record" whenever the
quantity being counted is billable; say "guest" when talking about human beings attending.

## Reserve Records

Free Guest Records granted on top of a paid plan, at 10% of the plan's size, to absorb
last-minute additions without forcing an upgrade. A 100-record plan carries 10 reserve
records.

Reserve Records are not a separate plan tier and are never sold; they only ever come
attached to a purchased plan.

## RSVP

A Guest's answer to the invitation: yes, no, or maybe. The RSVP is the state; the act of
collecting it is a **Confirmation** round (see Schedule Type).

## Schedule

A planned outbound message send for an Event - who it goes to, over which channel, and
when. Schedules are the mechanism behind every message a Guest receives.

## Schedule Type

The stage of the message lifecycle a Schedule belongs to. There are exactly four, in
order:

1. **Initial Invitation** - the invitation itself
2. **Confirmation** - the RSVP round(s), asking for an answer
3. **Event Reminder** - sent on/near the day, carrying table number, navigation link and
   gift link
4. **Thank You** (`post_event`) - sent after the Event

"Reminder" without qualification means Event Reminder (stage 3), never a chase-up during
the Confirmation stage. A repeat ask during stage 2 is a *second Confirmation round*.

## Call Round

A pass of **human phone calls** made by the Kululu team to Guests who have not responded
after the WhatsApp rounds. Operated from the admin back office, not by the Couple. Each
call's outcome is recorded against the Guest.

Two Call Rounds are included in a paid plan. Call Rounds are a service Kululu performs,
not a feature the Couple operates - this distinction matters in all customer-facing copy.

## Owner

The Event's creator, and any collaborator granted the `owner` role. Full access to
everything on the Event. A partner invited to plan together is an Owner.

## Seating Manager

A collaborator with deliberately limited access: only the Guests and seating charts
assigned to them. Intended for a planner or venue contact, not for a partner.

Owner and Seating Manager are the **only** two collaborator roles. There is no
"viewer" or "editor" role - avoid that vocabulary, in the product and in marketing copy.

## Free to Plan, Pay to Send

The commercial boundary. Planning the Event costs nothing: creating it, building or
importing the guest list, budget, and collaborating. Payment unlocks **outbound reach** -
the WhatsApp lifecycle and the Call Rounds.

Phrased from the Couple's side: free means *you plan*; paid means *we run your RSVP
campaign*.

# Context

The shared vocabulary for Kululu. This file is a glossary and nothing else - no
implementation details, no specs, no decisions. Decisions live in `docs/adr/`.

---

## Event

A single celebration being planned - a wedding, henna, bar/bat mitzvah, birthday or
corporate event. Everything else in the system hangs off exactly one Event.

A wedding is the archetype and the core market, but the model is not wedding-specific.

## Draft Event

An Event whose Owner has started creating it but has not finished. It exists, and holds
whatever has been answered so far, but it is not yet a workspace: it does not appear in
the event switcher and it cannot be opened.

The Owner is always returned to where they left off, never to a half-empty workspace.
A Draft Event becomes an Event proper the moment creation is completed - there is no
other way out of the state, and no partial access along the way.

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

Kululu is priced per Guest Record, not per Guest. Say "guest record" whenever the
quantity being counted is billable; say "guest" when talking about human beings attending.

## RSVP

A Guest's answer to the invitation: yes, no, or maybe. The RSVP is the state; the act of
collecting it is a **Confirmation** round (see Schedule Type).

## Outreach Item

A deliberate attempt to reach Guests about the Event. There are exactly two kinds: a
**Schedule** and a **Call Round**. This is the unit the schedules page lists, and the
only term that covers both.

Use it only where both kinds are genuinely in play. A Schedule is not "an outreach item"
in ordinary conversation - it is a Schedule.

## Schedule

A planned outbound message send for an Event - who it goes to, over which channel, and
when. Schedules are the mechanism behind every message a Guest receives.

A Schedule always carries a template and a channel; a Call Round carries neither. Where
the two must be spoken of together, the word is **Outreach Item**.

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

Two Call Rounds are included with every paid Event. Call Rounds are a service Kululu performs,
not a feature the Couple operates - this distinction matters in all customer-facing copy.
The Owner watches a Call Round; they never run one.

## Call Outcome

How one Guest's call ended: no answer, confirmed, or declined. Confirmed and declined
carry straight through to the Guest's RSVP.

Distinct from the RSVP itself: a Guest can be confirmed without any Call Outcome, having
answered on their own after the round began.

## Round Completion

The moment a Call Round is declared over by the Kululu operator running it. A deliberate
act, not a consequence of every Guest having been reached - a round can legitimately end
with Guests who never answered.

"Complete" describes the round, never the Guest. A Guest is confirmed or declined.

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

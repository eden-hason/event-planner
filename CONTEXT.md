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
Event's **Owner** and their co-planner.

Never "partner" for the other half of the Couple - **Partner** is a referring business.

## Guest

A person invited to the Event. Distinct from a **Guest Record** (below): one Guest Record
may represent several Guests.

## Guest Record

**The unit of billing.** One row in the guest list, which may cover more than one Guest -
a family of five arriving as one entry is one Guest Record with an amount of five.
For seating, every Guest it covers stays together at one Table; a Guest Record is never
split across Tables.

Kululu is priced per Guest Record, not per Guest. Say "guest record" whenever the
quantity being counted is billable; say "guest" when talking about human beings attending.

Both the Owner and an **Operator** can create and delete Guest Records. Because the row
is the billing unit, either act changes what the Owner pays.

## Seating Plan

An Event's arrangement of Guest Records among Tables and of those Tables relative to one
another. It is an operational layout, not a measured venue blueprint. Confirmed and
pending Guest Records may participate; declined Guest Records do not.

_Avoid_: Seating chart, floor plan

## Complete Seating Plan

A Seating Plan in which every confirmed Guest Record has a Table Assignment. Pending
Guest Records do not determine completion, even when they remain unassigned.

## Table

A destination in a Seating Plan with an Event-unique positive integer number and an
optional descriptive label. Its capacity is a hard maximum: the total number of Guests
covered by its Table Assignments can never exceed it, and Guest Records are assigned to
it as indivisible groups. Table number is also its canonical order within the Event.

## Table Assignment

The placement of one confirmed or pending Guest Record at one Table. It ends immediately
when that Guest Record declines or its Table is deleted, and is not restored automatically.

## RSVP

A Guest's answer to the invitation: yes, no, or maybe. The RSVP is the state; the act of
collecting it is a **Confirmation** round (see Schedule Type).

A confirmed RSVP carries how many Guests are coming and their **Special Meals**. It can be
changed by the Guest until the **RSVP Cutoff**.

## RSVP Cutoff

The end of the day before the Event. Until then a Guest may change their RSVP, in the chat
or on the RSVP page. After it, only the Owner or an Operator can.

## Confirmation Conversation

The guided exchange in WhatsApp that collects an RSVP without leaving the chat. It starts
when a Guest taps "Coming" or "Not coming" on a Confirmation message, and continues
with Kululu asking how many are coming and about Special Meals, then closes with a summary
the Guest can reopen to change their answer.

Every answer counts the moment it is given. A Guest who taps "Coming" and stops there is
confirmed; the conversation being unfinished does not make the RSVP incomplete.

A Confirmation Conversation is not a Schedule and its messages are not Deliveries: the
Guest started it, it is never billed, and the **Send Window** does not apply to it.

"Maybe" is never given in a Confirmation Conversation. A Guest who does not know yet simply
does not answer, and stays in the audience for the next Confirmation round.

## Special Meal

A meal other than the standard one, of a type the Owner has switched on for the Event
(vegetarian, vegan, gluten-free, strictly kosher). Counted per type within a Guest Record:
a family of five may need one vegan and one gluten-free meal. The number of Special Meals
never exceeds the number of Guests confirmed.

## Occasion Phrase

How an Event is named inside a message sent for it - "חתונה של נועה ודורון", "בר המצווה
של רועי" - derived from its type and hosts, and read after "you are invited to". It is what
lets one Template speak for every kind of Event.

An Event with no hosts named has no Occasion Phrase, and a message that needs one is not
sent. It is never stood in for by the Event's title.

## Outreach Item

A deliberate attempt to reach Guests about the Event. There are exactly two kinds: a
**Schedule** and a **Call Round**. This is the unit the schedules page lists, and the
only term that covers both.

Use it only where both kinds are genuinely in play. A Schedule is not "an outreach item"
in ordinary conversation - it is a Schedule.

## Schedule

A planned outbound message send for an Event - who it goes to, over which channel, and
when. Schedules are the mechanism behind every message a Guest receives.

A Schedule always carries a Template; a Call Round carries none. Where
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

## Due Time

The single moment a Schedule asks to be sent at. It is authored as Israel wall clock - an
Operator or the Owner picks "10:00" - and stored as one instant. There is no separate date
and time: a Schedule holding two answers to "when" will eventually give the wrong one.

A Due Time is a request, not a promise. What becomes of it is decided by the **Send
Window**.

## Send Window

The hours in which Kululu may put a message in front of a Guest: 09:00 to 21:00 Israel
time, every day of the week, weekends included.

A Schedule whose **Due Time** falls outside the Send Window is held - it waits for the
window to open and goes then. It is never sent late at night, and never dropped merely for
having been due at the wrong hour.

The window is judged when the message would go out, not when the Schedule was written.
That is what makes it cover the case it exists for: Kululu being unavailable all evening
and returning at midnight to a backlog of Schedules that all came due while it was away.

## Expired Schedule

A Schedule that will never be sent, because sending it now would be wrong rather than
merely late. Two things expire one: its Event has already happened - except a Thank You,
which is meant to land afterwards - or its **Due Time** is more than 48 hours past.

An expiry is recorded with its reason and shown to an Operator. A Schedule that quietly
stops mattering is the failure this replaces.

## Variant

The **editorial tone** a Schedule's message is written in - the same message, said
differently (warm, formal, playful, wartime). It is the only axis of message choice the
Owner ever sees.

A Variant is *not* an event type: a bar mitzva confirmation reading differently from a
wedding one is the two Event Types having different content, not a "bar mitzva" tone. Nor
is it a version: a rewrite of the same tone supersedes it, and is not a new Variant.

The Event carries one Variant and every Schedule on it inherits that tone; an Owner may
override a single Schedule without disturbing the rest. Not every Schedule Type offers a
choice - where only one Variant is authored, the Owner is shown no picker at all rather
than a picker with one option.

## Template

The message a Schedule sends, as the Owner chooses and previews it: one Schedule Type, in
one Variant, in one language. A Template carries no channel - it is the editorial thing,
not the sendable artifact.

The bare word "template" always means this. The visual skin of the guest-facing page is an
**Invitation Design**, never a template, even though Meta and the Owner-facing UI have both
used the word loosely in the past.

## Rendition

One channel's sendable form of a Template - its WhatsApp form or its SMS form. The
Rendition is where channel-specific shape lives: buttons and their captions and
destinations on WhatsApp, plain links on SMS.

Every Template has both a WhatsApp Rendition and an SMS Rendition. A Template missing
either is invalid and cannot be authored, because a Schedule that cannot fall back to SMS
is a Schedule some Guests can never be reached by.

Which Rendition a Guest actually receives is a delivery matter, not an authoring one:
WhatsApp is always attempted first, and the SMS Rendition is what an **SMS Fallback**
sends.

## Invitation Design

The visual skin of the guest-facing invitation and RSVP page - its palette, type and
ornament. An Event has one.

Entirely separate from a **Template**: a Design decides how the page looks, a Template
decides what the message says. Neither constrains the other.

_Avoid_: Landing template, template (for the skin)

## Delivery

What one Schedule achieved for one Guest in its audience - the roll-up of every Delivery
Attempt made to that Guest for that Schedule. There is exactly one Delivery per Guest per
Schedule, and it is what the Owner sees.

A Delivery is in exactly one of five states:

- **Not sent** - the Guest was in the audience but no attempt was possible (no usable phone
  number). Recorded, not merely counted.
- **Sent** - an attempt was accepted by the provider and has not yet been confirmed.
- **Delivered** - an attempt reached the Guest's phone.
- **Read** - a WhatsApp attempt was opened. SMS cannot reach this state.
- **Failed** - every attempt failed and nothing further is pending.

A Delivery takes the most advanced state any of its attempts reached - Read, then
Delivered, then Sent, then Failed. A later attempt that fails never takes back a Guest who
was already reached.

The channel that reached the Guest is an attribute of a Delivery ("delivered via SMS"),
never a state of its own.

A Guest is **Reached** by a Schedule when their Delivery is Delivered or Read, or when an
SMS attempt was accepted - SMS never reports further than that, so accepted is as reached
as SMS gets. "Reached" is the word the Owner sees; the five states are not.

_Avoid_: Delivery outcome (collides with Call Outcome), message status

## Delivery Attempt

One try at putting a Schedule's message in front of one Guest, over exactly one channel
(WhatsApp or SMS). A Delivery is made of one or more Delivery Attempts - a fallback, a
resend - and each keeps its own result; a later attempt never rewrites an earlier one.

An attempt is recorded before it is made, never after. An attempt whose outcome was never
learned - Kululu stopped between sending and hearing back - counts as failed for a
**System-level** reason and is never tried again, because WhatsApp offers no way to ask
whether a message already went out.

The Owner does not reason about attempts. Operators do.

## SMS Fallback

A further Delivery Attempt over SMS, made to Guests whose WhatsApp attempt for a Schedule
failed. It carries the same message intent and the same RSVP link as the WhatsApp attempt
it stands in for. It is part of what the Owner already paid for and is never billed on its
own.

Only a Delivery that failed for a **Guest-level Failure** and has had no SMS attempt is
eligible for an SMS Fallback.

An SMS Fallback runs by itself once a Schedule has finished failing - every attempt
resolved and every retry exhausted - unless a **Fallback Freeze** holds it. An Operator may
also launch one by hand from the Back Office, for a Schedule's failed Deliveries in one
batch, and doing so overrides a Freeze.

Not to be confused with a Schedule whose own channel is SMS: that is a first attempt, not a
fallback.

## Fallback Freeze

A Schedule's automatic **SMS Fallback** withheld because too much of its audience failed at
once - more than 30% of its attempts, and at least ten of them.

Two of the codes Kululu treats as **Guest-level Failures** are decisions WhatsApp makes
about Kululu's account rather than about any one Guest, so a single bad day can look like
hundreds of individually unreachable Guests. A Freeze stops Kululu buying hundreds of SMS
at the moment its WhatsApp account is in trouble, when fixing the account and resending on
WhatsApp may be the cheaper remedy.

A Freeze withholds only the automatic batch. An Operator who has read the failures and
decided to send anyway is the intended way past it.

## Guest-level Failure

A failed Delivery Attempt caused by the Guest's own number - it is not on WhatsApp, it is
invalid, WhatsApp is withholding messages from it, or the Guest has stopped WhatsApp
messages from Kululu. Another channel is the right remedy in every one of these cases.

## System-level Failure

A failed Delivery Attempt caused by Kululu's side - a template no longer usable, a
restricted account, a throughput limit. It typically hits every Guest at once. Another
channel is the wrong remedy: the cause is fixed and the message resent on the same channel.

## Throughput Budget

How many messages per second WhatsApp will accept on Kululu's number. It is the constraint
that shapes how every Schedule is sent: one sender, one pace, shared by every Event at
once. Exceeding it produces **System-level Failures**.

Not the **Messaging Tier**. The two are confused easily and behave nothing alike.

## Messaging Tier

How many distinct Guests Kululu may open a conversation with in a rolling 24 hours. An
account-level ceiling counted in people rather than messages - a Guest messaged three times
in one day counts once.

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

Distinct from the RSVP itself: a Guest can be confirmed without any Call Outcome - by
answering on their own, by the Owner recording it, or by an Operator setting it directly
in the Back Office. A Call Outcome is one of several ways an RSVP arrives, not the
definition of one.

## Round Completion

The moment a Call Round is declared over by the Kululu operator running it. A deliberate
act, not a consequence of every Guest having been reached - a round can legitimately end
with Guests who never answered.

"Complete" describes the round, never the Guest. A Guest is confirmed or declined.

## Entitlement

The commercial standing of one Schedule: whether it may be sent, and on what basis. Every
Schedule carries exactly one - **Included** (covered by what the Owner paid at kick-off),
**Purchased** (bought on its own, after the fact) or **Granted** (given by an Operator as
good will, with a reason recorded against their name).

An Entitlement is spent when the Schedule sends, not when it is added. A Schedule added
and then removed before it goes out costs nothing, so exploring the timeline is always
free.

Distinct from the Event's billing status, which answers whether the Event may send *at
all*. Entitlement answers whether *this Schedule* may. Both must be satisfied.

## Added Schedule

A Schedule the Owner created beyond what their Event Type includes. It is the only kind
that is ever Purchased or Granted; an Included Schedule is neither.

## Owner

The Event's creator, and any collaborator granted the `owner` role. Full access to
everything on the Event. A spouse or co-planner invited to plan together is an Owner.

## Seating Manager

A collaborator who can manage all Tables in an Event but can identify and assign only
the Guest Records within their guest or group scope. Intended for a planner or venue
contact, not for a co-planner. They cannot delete a Table when doing so would disturb an
out-of-scope Table Assignment.

Owner and Seating Manager are the **only** two collaborator roles. There is no
"viewer" or "editor" role - avoid that vocabulary, in the product and in marketing copy.

## Back Office

The internal application Kululu staff use to run the business, served under `/admin` on its
own subdomain. It is not part of the product the Couple sees and is never spoken of as if it
were.

The Back Office does three jobs: **Overview** (the state of the business right now),
**Operations** (acting on a single Event - Call Rounds, manual sends), and **Configuration**
(the catalogs that decide what the product generates).

"Dashboard" is loose conversational shorthand for the Back Office. It is not a defined term
and should not appear in routes, code, or copy.

## Operator

A member of Kululu staff working in the Back Office. The Operator runs Call Rounds, sends
messages by hand, watches for things going wrong, and maintains the guest list - correcting
a Guest Record, and adding or deleting one.

An Operator changing a guest is Kululu acting as itself. An Operator who needs the *Owner*
to be the author of a change impersonates instead.

Distinct from an **Owner**: an Owner plans their own Event, an Operator works across every
Event. An Operator may impersonate an Owner to see exactly what they see, but the two roles
never merge - impersonation is a lens, not a change of identity.

## Signal

A condition, derived at read time, that an Operator should look at. There are exactly three:
an **Overdue Schedule**, a **Failed Delivery**, and a **Stale Call Round**.

A Signal is never stored. There is no signals table and no row to mark as read: a Signal
exists exactly as long as the condition producing it is true, and vanishes when the
underlying situation resolves. Nothing is pushed, nothing is emailed, and nothing records
whether an Operator saw it. A Signal is therefore not a notification, and not an alert.

A **Failed Delivery** Signal holds while an Event has Failed Deliveries an Operator can still
act on - those with no SMS attempt yet. A Guest unreachable on both channels no longer
raises it.

## Heartbeat

Kululu's own answer to whether it is still sending. It is checked from outside, by
something that is not Kululu, and reaches a person by whatever means that thing uses.

A Heartbeat is deliberately not a **Signal**. A Signal says an Operator should look at an
Event; a Heartbeat says the machinery that produces Signals has stopped - which nothing
derived at read time can report, because the reason nobody noticed is that nobody was
reading.

## Overview

The Back Office home page. It answers one question - what needs an Operator's attention right
now - and carries business counts only as context for that answer, never as the point of the
page.

## Home

The Owner-facing landing page for a single Event - the page previously called
"dashboard" in code and casually "control panel." It orients the Owner in one glance
(see **Hero**) and surfaces what to do next (see **Featured Action**), on top of the
Event's ongoing activity and stats.

_Avoid_: Dashboard, Control Panel - both are retired names for this page.

## Hero

The top-of-page block on Home that fuses the Event's identity (title, date, location,
illustration) with its single most urgent live number - the countdown to the Event -
and a secondary RSVP-progress line. Purely decorative art (illustration, confetti); it
carries no interactive controls of its own.

## Featured Action

A specific, actionable suggestion offered to the Owner on Home. Each Featured Action is
backed by a real capability and an eligibility rule evaluated from the Event's current
state - it appears only while its rule is true, the same way a **Signal** exists only
while its condition holds.

An unfinished setup step (completing details, adding guests, forming groups, uploading
an invitation image, inviting a collaborator) is a Featured Action like any other -
there is no separate "onboarding checklist" concept standing apart from it.

Like a Signal, a Featured Action is never stored and cannot be dismissed: it disappears
only because its eligibility rule turned false, never because the Owner hid it. There is
no per-Owner "seen" or "snoozed" state to track.

Up to four are shown, drawn from three tiers in priority order - every unfinished setup
step first, then the **Guest List Health Check**, then discovery (**Test Message**,
seating, digital gifting, **Live Invite Preview Link**, budget). After setup, each tier
contributes its top eligible action before the rest fill in tier order, with "add a
guest", "ask the assistant" and "view the guest list" filling any slot left over. Only Owners see them; a Seating Manager's Home
has none.

A fact the system records for its own reasons can still retire an action - a Test
Message the viewer has already received, for one. That is a rule turning false, not a
dismissal.

## Test Message

A copy of a real outbound Schedule message, sent to the Owner's own phone instead of any
Guest's, so the Owner can see exactly what a Guest will receive before the Schedule
actually goes out. It previews the Event's earliest confirmation Schedule that has not
gone out yet, and goes to the viewer's own profile phone - or, when the profile has none,
to a number they type for that one send, which is not saved. Sending one has no effect on any Guest's RSVP or delivery
history: it is not a Delivery, and its RSVP link opens the **Live Invite Preview Link**
rather than any Guest's page.

An Event gets three accepted Test Messages for its whole life, across all its Owners. Each
viewer is offered one until they have received it.

## Guest List Health Check

A read-only scan of the Guest list for likely data problems - duplicate Guest Records and
Guest Records missing a phone number - offered as a Featured Action once the list is
large enough for drift to matter (20 Guest Records). It flags; it does not merge or fix
anything itself - it hands off to the guest list filtered to the flagged rows.

A duplicate means two Guest Records with the same name once case, spacing and punctuation
are ignored. Never the same phone: an Event cannot hold two Guest Records with one number.

## Live Invite Preview Link

A shareable link to the guest-facing invitation site exactly as a Guest would see it.
Distinct from the **Invitation Design** picker (which chooses the design skin) - this is
the artifact you'd hand to someone else to look at, not a tool for changing anything.

It opens the RSVP page with a sample guest; every answer given there plays out on screen
and writes nothing. The link belongs to the Event, not to any Guest. It is offered as a
Featured Action once the Owner has chosen a landing template.

## Free to Plan, Pay to Send

The commercial boundary. Planning the Event costs nothing: creating it, building or
importing the guest list, budget, and collaborating. Payment unlocks **outbound reach** -
the WhatsApp lifecycle and the Call Rounds.

Phrased from the Couple's side: free means *you plan*; paid means *we run your RSVP
campaign*.

---

## Partner

An outside business - a DJ, a photographer, a venue - that sends Couples to Kululu in
exchange for a fixed Commission. A Partner is invited by Kululu; nobody becomes one by
signing up alone. The Partner works in Kululu Partners, never in an Event.

Distinct from an **Owner** or a co-planner: a Partner never sees inside a referred Event.
_Avoid_: Affiliate, vendor, supplier

## Referral

The link between a Partner and one Couple's account, made when the Couple arrives through
that Partner. An account has at most one Referral, and it never moves to another Partner.

A Referral is **registered** from the moment it is made, and **qualified** the first time
one of the account's Events is paid for with real money. A comped Event does not qualify
it. Only a qualified Referral earns a Commission, and it earns exactly one - Events paid
after that earn nothing.

## Partner Code

A Partner's short, human-readable word that a Couple can type in, and that Kululu also
puts in the Partner's link. The link and the typed code are the same thing, so there is
only one way to be referred.

A Partner Code can be applied until the account's first Event is paid. Once applied it is
locked: the first code wins, and no code can be added after payment.
_Avoid_: Coupon, promo code, referral link (as separate things)

## Referral Gift

What the Couple receives for arriving through a Partner: one extra WhatsApp Schedule on
their first paid Event, carrying a **Granted** Entitlement. It is the Couple's reason to
use a Partner Code, and it is always presented as a gift, not as a discount.

## Commission

The fixed amount a Partner earns for one qualified Referral. Fixed per Referral, never a
share of what the Couple paid.

Each Partner has their own rate. The rate in force when a Referral qualifies is the one it
earns - a later change to the Partner's rate never alters a Commission already earned.

## Payout Statement

One Partner's Commissions for one calendar month, issued on the first of the following
month. A Referral that qualifies in a month is on that month's Statement.

A Payout Statement is paid only against the Partner's own tax invoice or receipt for its
exact amount. It moves from **issued**, to **invoiced** once the Partner provides that
document, to **paid** once Kululu has transferred the money.


# The plan is an asking Invitation, two Follow-ups, one Reminder and a Thank You

Date: 2026-11-07

## Status

Accepted. Not built. Supersedes ADR 0036 and ADR 0051 for Events on the current Message
Plan. Amended 2026-11-12: which Events get it, and how it is rolled out.

## Context

The message plan grew by accretion. The default Initial Invitation never asked, so the
real invitation was "Confirmation 1", and ADR 0036 had to let an Operator convert an
Invitation into a Confirmation when an Owner wanted it to ask. A reminder before the Event
day became a fifth Schedule Type (ADR 0051) because the Event Reminder's wording said
"today". The catalog holds 86 template rows across `casual`, `_v1`, `_1`, wedding-only,
note and Personal Message families. Across all of production only one Initial Invitation
has ever been sent (against seven Confirmations), so almost nothing rests on the
non-asking Invitation.

## Decision

New Events are seeded with four Schedule Types, in this order:

- **Invitation**: the first **Ask**, carrying the two RSVP quick replies
  (`נגיע בשמחה` / `לא נוכל להגיע`) that open the Confirmation Conversation. It attaches the
  Event's invitation image, its video, or nothing. It starts undated (ADR 0029).
- **Follow-up ×2**: repeat Asks, to pending Guests only, with the same buttons. Each
  attaches the image or nothing, never the video. They start undated.
- **Event Reminder**: exactly one, to confirmed Guests. It may be due on the Event day or
  on any day before it, and its wording follows that day: "today" on the Event day, the
  weekday and date on any earlier day. It has a navigation button, a gift button the
  Schedule switches on or off (offered only when the Gifting page is set up), and a table
  line for each Guest who has a table, when the Event's "send table numbers" switch is on
  (amended 2026-11-13: as on the Classic plan, so a seating draft never reaches Guests
  by accident). Kululu proposes the Event day at 10:00, or the day
  before at 10:00 when the Event starts before 14:00. A proposed day that falls on
  Saturday becomes Friday 10:00, so a Saturday Event's Reminder is proposed for Friday
  whatever its hour (amended 2026-11-13; at first only a day before was moved).
- **Thank You**: to confirmed Guests, pinned to the day after the Event, or to Sunday when
  the day after is Saturday. Only its hour moves (default 10:00). It has a gift button the
  Schedule switches on or off.

Each stage has one **Kululu Wording**, shared by every Event type through the Occasion
Phrase. Variants, Bespoke Templates and the Advance Reminder type are not offered on new
Events. The rules for how many Follow-ups an Event may have are unchanged.

## Considered Options

- **Keep a non-asking Invitation** (as a default or an Operator option). Rejected: it was
  almost never sent, and keeping it means keeping the "Confirmation 1 is the real
  invitation" confusion.
- **Keep "Confirmation" as the type for every Ask**, told apart by plan order. Rejected:
  which message is the invitation would stay a matter of position, not identity.
- **Keep the Advance Reminder as its own type.** Rejected now that the Reminder's wording
  is chosen from its Due Time. ADR 0051's argument was that every reader of the type would
  have to tell two families apart. Here nothing has to, because the day picks the wording,
  and there is one Reminder per Event.
- **Pending Guests on the Reminder with RSVP buttons** (as ADR 0051 designed). Rejected: it
  doubles the Reminder templates and mixes navigation with RSVP. Chasing is the Follow-ups'
  job.
- **A Kululu Wording per Event type, or several tones.** Rejected: the Occasion Phrase
  carries the type, and each wording multiplies every Meta template.

## Consequences

- **Two Message Plans side by side.** An Event is on the Classic Message Plan or the
  current one (see CONTEXT.md). Events on the Classic plan finish on the old catalog,
  Variants, Personal Message frame and Advance Reminders included, and that code goes only
  once the last such Event is over.
- **An Operator may move an Event,** one way, from the Back Office, while none of its
  Schedules has been sent. The move reseeds from scratch: every unsent Schedule is deleted
  and the current plan is seeded as for a new Event. Due Times, Variants, notes and old
  Personal Message paragraphs are not carried, and an Extra Schedule is dropped for the
  Operator to grant again; the dialog says so. Mapping old Schedules onto new ones (by date
  order or by type) was rejected as more rules than the few Events involved are worth.
  Moving an Event that has already sent stays impossible.
- **Rolled out dark, then switched on.** At deploy new Events are still created on the
  Classic plan. Operators move chosen Events to pilot it. Once Meta has approved the
  templates and real Events have sent, one setting makes every new Event start on the
  current plan. This replaces the earlier "shipped before approval": creating every new
  Event on 42 unapproved templates was judged too risky.
- **The Event Reminder always carries the navigation button.** Making it optional was
  rejected: a Reminder cannot send without a venue, and each optional button doubles the
  Reminder's Meta templates.
- **Catch-up Send comes later.** Events on the current plan do not offer it at first
  (backlog 0039). Test Message, Hand Delivery and Extra Schedules work from the start.
- **Meta categories.** The Reminder wordings are submitted as Utility and written strictly
  transactionally. The Asks and the Thank You go in as Marketing, matching what Meta
  already gave their Classic originals (amended 2026-11-12; the Asks were first meant as
  Utility). Meta then made three of the eight Reminder shapes Marketing, so that family is
  mixed. Whatever Meta
  recategorizes is accepted, not fought: Meta already moved `confirmation_1` and
  `thank_you_1`, both submitted as Utility, to Marketing.
- **Shabbat is avoided only where Kululu picks the day.** The Thank You's pinned day and
  the Reminder's proposal skip Saturday. An Owner may still date a Reminder on Saturday,
  since ADR 0018 still allows weekend sends. Chagim are not considered (backlog 0002).
- Everything that keyed off `confirmation` (the Results tab, the Confirmation
  Conversation, the Catch-up Send, `isFollowUpConfirmation`) now keys off "is an Ask",
  and the follow-up copy comes from the Follow-up type instead of from plan order.

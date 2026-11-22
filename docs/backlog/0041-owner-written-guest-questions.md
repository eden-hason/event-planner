# An Owner can ask Guests only the questions Kululu built

Status: open

## Problem

What a confirming Guest is asked is fixed by Kululu: how many are coming, Special Meals, and
the optional Transportation Question. An Owner who wants to ask anything else - "coming to
the henna the night before?", "need a babysitter?", "which bus stop?" - has nowhere to put
it, and asks it on the side, outside the RSVP and outside the guest list.

The ask is several Owner-written questions per Event, answered in the Confirmation
Conversation and on the RSVP page, with the answers on the Guest Record and visible to the
Owner.

## What is already known

The Transportation Question is the one precedent, and it was deliberately *not* widened
into this (2026-11-22, the change that let the Owner reword it):

- **The Owner may reword it, never change its subject.** It stays a built-in question with
  its own switch (`guests_experience.ask_transportation`), its own answer column
  (`guests.needs_transportation`, null = not answered), and its own reports: the guest
  list column, filter and chip, the overview's "צריכים הסעה", the calling surface. If the
  Owner could turn it into any yes/no question, every one of those labels would lie. So
  custom questions are a new thing beside it, not a generalisation of it.
- **Question Wording** (CONTEXT.md) is the shared idea: Kululu's text for a question, or
  the Owner's instead, a blank Owner's wording being none. A custom question has only the
  Owner's. The transportation one is stored as `guests_experience.transportation_wording`.
- **An answer may lead somewhere.** A "yes" to transportation is pointed to the
  **Transportation Group** (`guests_experience.transportation_group_url`), in the chat
  summary's body and as a button on the RSVP page's success state, whoever recorded the
  answer and never sent on its own. A custom question may want the same: a link per answer.
- **The two channels ask differently today.** The chat asks a question with "כן" / "לא"
  buttons; the RSVP page shows an opt-in checkbox where unticked is "no". That is fine for
  one opt-in, but several questions - and any question whose "no" must not be assumed -
  need one answer control for both, likely an explicit yes / no pair on the page, with
  unanswered as its own state.
- **Message Fields were left out of Question Wording.** An Owner types the pickup point
  rather than naming the venue by reference. Revisit if custom questions need them.
- **Meta's limits** bound the chat: a button message body is up to 1024 characters, at most
  three reply buttons with 20-character titles, a list up to ten rows of 24.

## What is still open

- Answer types: yes/no only, or also a choice from a list, or free text (which the chat can
  only take typed, like the guest count - ADR 0023).
- How many questions, their order relative to meals and transportation, and whether the
  transportation question joins the same ordered list in the settings UI.
- Storage: a table of questions per Event and a table of answers per Guest Record. Both are
  new tables with RLS, so each needs a Visitor decision (ADR 0028): planning data, likely in
  `visitor_open_tables()`.
- Whether a question can be asked of everyone confirmed or only of some (a Side, a group).
- What the Owner sees: a guest-list column, a filter and an overview count per question, as
  transportation has; and an export.
- An Operator on a Call Round: does the calling surface grow a column per question?
- Editing a question after answers exist: a reworded one keeps its answers, as
  transportation's does; a question whose meaning changes probably should not.

## What done would mean

An Owner adds, rewords, reorders and removes their own questions for an Event; a confirming
Guest is asked them in the chat and on the RSVP page; each answer lands on the Guest Record
and the Owner can see, filter and count it; the Transportation Question keeps its column
and reports.

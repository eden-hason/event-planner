# A Visitor plans freely and saves to reach out

Date: 2026-10-07

## Status

Accepted. Amends ADR 0003: an Event may belong to a Visitor, and an idle Visitor's Event is
purged rather than kept.

## Context

Onboarding opened with a sign-in. Phone OTP or Google came before the first question, so a
couple had to commit to an account before seeing anything Kululu does for them.

Supabase anonymous sign-in gives someone a real auth user without asking for anything. But
an anonymous user is an ordinary `authenticated` user, told apart only by the `is_anonymous`
claim in its JWT. Every existing RLS policy grants it what it grants an Owner. So this ADR
has to draw the line deliberately, because nothing in the database draws it.

A first version of this ADR (2026-10-06, never merged) confined a Visitor to the Draft Event
and made publishing the sign-in point. Eden rejected that: it only moved the login form to
the end of onboarding. The goal is to let someone into their workspace with no form at all.

## Decision

**Nothing stands between a new visitor and their workspace.** `/start` opens with no session.
The first answer creates an anonymous user, the Visitor, together with their Draft Event.
Not on page load: a bounce, a crawler or a returning Owner on their way to sign in leaves
nothing behind. The takeover publishes as it always has, and the Visitor lands on Home.

**A Visitor plans freely and saves to reach out.** Anything that stays inside Kululu is
open: guests, groups, budget, seating, gifts, schedules. Anything that reaches a person,
costs money or touches the Visitor's phone needs saving first: sending and Test Messages,
inviting a collaborator, paying, WhatsApp import, and the shareable RSVP and invite links.
This is **Free to Plan, Pay to Send** with one more step in front of sending.

**Saving is always available.** A "Save your event" pill sits in the workspace header, and
every gated action opens the same save dialog with a line saying why. It asks for a name,
then phone OTP or Google.

**A new account upgrades the Visitor in place.** Phone uses `updateUser({ phone })` and then
an OTP; Google uses `linkIdentity`. The user id stays the same, so the Event, its guests and
everything else stay where they are. Nothing is moved.

**An Event never moves to an account that already exists.** If the phone or Google account
is already an Owner's, the dialog says so and asks before anything is lost: use a different
one, or sign in and discard the Event. Phone is checked before a code is sent. Google can
only report it after the round trip, so the same question is asked when they come back. If
they choose to sign in, the anonymous user and its Event are deleted only after the sign-in
succeeds, and a one-time dialog on arrival confirms it. Signing in through `/login` while
holding an unsaved Event shows the same warning first.

**Enforced in the database and in the app.** Restrictive RLS policies on the `is_anonymous`
claim close the outward-facing tables to Visitors: collaborators, invitations, Test
Messages, deliveries, payments and billing, and WhatsApp import sessions. Sending itself is
done server-side by the Dispatcher, which RLS does not see, so the gate there is in the
app: a Visitor's Event cannot be enabled for sending, and the actions that send, invite,
pay or import refuse Visitors.

**Idle Visitors are purged.** A scheduled job deletes an anonymous user once neither they
nor anything in their Event has changed for 30 days. Their Event, guest list included,
goes with them. The back office leaves Visitors out of its user, event and overview counts.

## Alternatives rejected

**Sign-in at publish (this ADR's first version).** Confining the Visitor to the Draft Event
kept the boundary in one place, but it was a login form one screen later. The point is a
workspace with no form at all.

**Moving the Event to the existing account.** It is the most forgiving option, and the OTP
does prove the person holds the number. Rejected because a shared or borrowed phone, or a
Google account signed in on someone else's laptop, would put an Event, with its guests'
phone numbers, into another person's account. It would also need a server-side transfer of
every table under the Event. Asking first, then discarding, loses work only when the person
chooses to.

**Read-only until saved.** A smaller attack surface, but every edit becomes a sign-in
prompt, which is the original problem again.

**Everything open except paying.** Sends would go out from Events nobody can be reached
about, and the free Test Messages become a way to message strangers anonymously.

**Keeping unsaved Events forever.** Once the cookie is gone, nobody can get back in. The
guest list is other people's names and numbers, held by someone who cannot be contacted.

## Consequences

**Good.** Someone new reaches their own workspace with no form in front of them. The user id
is the same from the first tap to the saved account, so the funnel is one identity in
analytics, and saving moves no data.

**Bad.** Every outward-facing feature now has a Visitor rule, and a new one that forgets it
reopens a hole. The RLS guard (`supabase/seeds/visitor-guard.sql`) catches only new tables,
not new Server Actions or Dispatcher paths. A Visitor who clears their cookies loses their
Event for good. Someone with an account who plans on a new device without signing in will
lose that work if they then sign in, though they are asked first. Google saving depends on
Supabase manual identity linking. `/start` is public with only Supabase's per-IP rate limit
in front of it (see backlog 0018).

**If we change our mind.** Tightening what a Visitor may do is additive: more policies,
more gates. Moving Events to existing accounts later replaces the discard path with a
transfer.

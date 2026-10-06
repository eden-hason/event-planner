# A Visitor's draft never moves to an existing account

Date: 2026-10-06

## Status

Accepted. Amends ADR 0003 (abandoned Visitor drafts are purged, not kept).

## Context

Onboarding opens with a sign-in. Phone OTP or Google comes before the first question, so a
couple has to commit to an account before they have seen anything Kululu does for them.
ADR 0003 already made the Draft Event exist from the first answer. The only thing still
standing between a visitor and the takeover is the `user_id` that row needs.

Supabase anonymous sign-in supplies that `user_id` without asking for anything. But an
anonymous user is an ordinary `authenticated` user, told apart only by the `is_anonymous`
claim in its JWT. Every existing RLS policy therefore grants it what it grants an Owner:
guests, schedules, collaborators, test messages. Nothing in the database marks where
"anonymous" ends, so this ADR draws that line.

## Decision

**A Visitor holds a Draft Event and nothing else.** The takeover's questions (type, names,
date, venue) run with no account. The anonymous user is created on the first answer, inside
the action that creates the Draft Event, never on page load. That way bots, bounces and
returning Owners who go on to sign in leave nothing behind.

**Publishing is the save gate.** Opening the event asks for a name, then phone OTP or Google.
The profile step that used to open the takeover moves here. A Draft Event never becomes an
Event proper while its holder is anonymous.

**A Visitor becomes an Owner only by creating a new account, upgraded in place.** Phone uses
`updateUser({ phone })` followed by an OTP. Google uses `linkIdentity`. The user id and the
Draft Event stay the same, and the draft is then published. Nothing is transferred.

**If the phone or Google account already exists, the draft is dropped, not moved.** The
upgrade call fails, the person is signed in to the existing account, and the anonymous user
and its Draft Event are deleted. On arrival, a one-time dialog explains that they were taken
to their existing account and that the event they started was not saved. Signing in through
`/login` while holding a Visitor draft does the same.

**Enforced in the database and in the app.** Restrictive RLS policies on the `is_anonymous`
claim let an anonymous user insert, read and update only `events` rows with
`status = 'draft'`, and nothing on any other Owner-writable table. `publishDraftEvent`
refuses anonymous callers. The proxy sends anonymous sessions from `/app/*` to `/start`.

**Unsaved Visitor drafts are purged.** A scheduled job deletes anonymous users inactive for
30 days, and their Draft Events go with them. The back office keeps Visitor drafts apart
from Owner drafts.

## Alternatives rejected

**Moving the draft to the existing account.** It is the most forgiving option: the person
keeps what they typed and ends up with both events. Rejected because a sign-in through a
shared or borrowed phone, or a mistyped number that happens to be registered, would plant an
event in somebody else's account. It would also need a trusted server-side handover, proving
both the anonymous session and the real one across an OAuth or OTP round trip. That is a
transfer path whose only reason to exist is the rare case it would get wrong. Losing four
answers is cheap. An event appearing in the wrong account is not.

**Always transferring, even to new accounts.** Sign up normally, then re-parent the draft.
This only made sense while the collision case needed a transfer anyway. Without that case it
is a handover cookie, a re-parenting step and an orphan cleanup that upgrading in place makes
unnecessary.

**An anonymous workspace, with sign-in only before outward-facing actions.** It defers the
gate further, but every action that costs money or reaches a real person would need its own
guard, and every RLS policy would need to account for `is_anonymous`. Confining the Visitor
to the Draft Event keeps the boundary in one place.

**Client-side answers with sign-in at the end.** ADR 0003 already rejected this: the Draft
Event exists server-side from the first answer, and that stays true.

## Consequences

**Good.** The first screen a newcomer sees is the first question. The workspace, sending,
billing and collaboration never meet an anonymous user. One user id runs from the first tap
to the published Event, so the funnel is a single identity in analytics.

**Bad.** Someone who already has an account and fills in a draft on a new device loses it
when they sign in, deliberately. A Visitor who clears their cookies loses their draft, and
nothing can recover it. Google sign-up depends on Supabase manual identity linking being
enabled. Every future Owner-writable table needs the restrictive anonymous policy, or it
quietly reopens the gap. The `/start` route is open to the public with no bot protection
beyond Supabase's per-IP rate limit (see backlog 0018).

**If we change our mind.** Moving drafts to existing accounts later is additive: the drop
path becomes a transfer. Widening what a Visitor may do means auditing every RLS policy
against `is_anonymous` again.

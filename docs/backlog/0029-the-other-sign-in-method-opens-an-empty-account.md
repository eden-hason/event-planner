# The other Sign-in Method opens an empty account

Status: in progress (the cosmetic part: the Last-used Method badge and the onboarding prompt)

## The problem

An Owner who created their Event with Google, then signs in on another device with their
phone (or the other way round), gets a brand-new, empty account and lands in onboarding
instead of their Event. Nothing connects the two: `signInWithOtp` and Google OAuth each
create a user silently, and a phone user has no email for Supabase to link on.

Before this item, the onboarding "already have an account?" link was shown only with no
session, so it was hidden from exactly the person who needed it. And `/login` bounces any
signed-in non-Visitor back to `/app` -> `/start`, so following it would loop.

## What was built (cosmetic)

- The device remembers its **Last-used Method** in a long-lived cookie and badges that
  button on `/login` and on the Save Event page. Both screens now open on a choice of two
  buttons, with the phone number on its own step.
- A brand-new account (not a Visitor; no Event, no Owner role, no Draft) that reaches
  onboarding is told which method it just used and offered the other one. Tapping signs out
  and goes straight to that method. The empty account is left in place.

This does not help on a device that has never signed in, which is the reported case. The
onboarding prompt is what covers it there.

## Evidence (prod, 2026-10-27)

- 98 real accounts, 46 Owners.
- 1 confirmed cross-method pair, matched by phone: a Google Owner whose profile phone is a
  later phone account. Both accounts own an Event, so this person built their Event twice.
- 41 phone accounts with no Event, no Owner role and no finished profile; 39 of them are
  from before Visitor sign-in (ADR 0028), so most are abandoned sign-ups from the old
  sign-in-first onboarding rather than wrong-method duplicates. None matched an Owner's
  profile phone.
- 9 of 10 Google Owners entered a phone number on their profile, which makes detection
  feasible for that direction.

## Approaches deferred, not ruled out

1. **Detect on arrival.** When a brand-new account reaches onboarding, look for an Owner
   whose profile phone equals its auth phone (or whose profile email equals its Google
   email), and say "you already have an account - you signed in with Google". Needs a
   server-side lookup across accounts (service role or a security-definer function), since
   RLS hides other profiles. It tells a signed-in person that their number has another
   account, which the save page already does (ADR 0028).
2. **Block before the code.** On `/login`, check the number before sending the WhatsApp code
   and stop if it belongs to a Google Owner. No empty account is ever made. Lets anyone
   probe whether a number has an account.
3. **Link both methods to one account.** Ask Owners to add the other method
   (`updateUser({ phone })` + OTP, or `linkIdentity` for Google - the same calls a Visitor's
   save uses). Fixes the cause, but only for Owners who complete it. Needs a home in the
   profile or settings, and an answer for when the other method is already its own account.
4. **Delete the empty account on switch.** Remember the empty account before the switch and
   delete it once the other sign-in succeeds, as `/login` already does for a Visitor. Left
   out for now: it deletes a real account, and an empty one costs nothing.

## Done would mean

Someone with an Event never ends up in onboarding because they used the other method on a
new device, or if they do, they are told where their Event is in one screen.

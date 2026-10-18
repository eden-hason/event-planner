# A co-planner joins by link, not by identity

Date: 2026-10-18

## Status

Accepted. Supersedes the Seating Manager parts of ADR 0008.

## Context

A co-planner was invited by email, and only to a Gmail address. The invitation could be
accepted only by a Google sign-in whose email matched it exactly. Most Owners sign in by
phone (29 of the 50 Event creators on 2026-10-18, against 11 by Google), so an invitee who
signed in the app's usual way could never accept. Of the 15 invitations ever sent, 7 were
accepted and 8 were left pending, each on a different Event, and 7 of those 8 had expired.
All 7 co-Owners who got in did so with Google.

## Decision

Each Event has one **Co-planner Link**. Anyone who opens it and signs in, by phone or
Google, becomes an Owner of the Event. Nothing ties the link to an email or phone number,
so there is nothing for the invitee to match. The inviter sends the link themselves, from
a "Send on WhatsApp" button or by copying it. Kululu sends no email or SMS. The link can
be used by more than one person, never expires, and cannot be reset. The cap of two
Owners per Event is dropped.

On the link's page, someone signed out (or a Visitor) signs in the usual way and lands on
the Event's Home as an Owner. Someone already signed in presses one Join button. Either
way, Home then tells them they joined. There is no Decline.

The email invitation flow is deleted: its table, the invite email, the Gmail-only form,
and Accept/Decline. An old invitation link says it is no longer valid. Existing co-Owners
keep their access and need do nothing.

The Seating Manager role is removed from the product. Production has never had one,
neither a collaborator nor an invitation, so Owner is the only collaborator role.

## Considered Options

- **Bind the invitation to a phone number**, so the invitee must sign in by phone OTP
  with that number. Rejected: it moves the matching problem from email to phone and still
  fails anyone who signs in with Google or another number.
- **Sign in any way, then confirm a code sent to the invited phone.** Rejected for now:
  it is the most secure, but it adds back a step to the flow we are trying to make simpler.
- **Kululu texts the link.** Rejected: it needs a number, costs an SMS, and a link from an
  unfamiliar sender looks like phishing. A message from the inviter is trusted, arrives at
  once and costs nothing.
- **A single-use link with an expiry**, or **Owner approval of each join**. Both were
  safer. They were deferred for an MVP that gets couples planning together first.

## Consequences

Anyone holding the link gets full Owner access, including guest phone numbers, the budget
and payment, and an Owner who is removed can join again through the same link. This is
accepted for now and tracked in backlog 0026. The Back Office does not show the link. An
Operator helping a stuck couple impersonates the Owner and copies it from there.

# A Test Message may go to a typed number

Date: 2026-10-27

## Status

Accepted.

## Context

A **Test Message** is the Event's confirmation, sent by WhatsApp to the Owner's own phone.
It is now offered to every Owner, paid or not, and it is the first Featured Action on
Home. An Owner who signed in with Google has no phone on their profile, so they type the
number the test goes to.

That makes it a branded Kululu WhatsApp that any account can aim at any number, at a cost
to Kululu. Creating an Event is free, so the old cap of three per Event bounds nothing: a
new Event brings three new sends.

## Decision

**The typed number stays, used for that one send and never saved. A cap on the account
bounds it.**

- An account gets three accepted Test Messages across all its Events, on top of the
  existing three per Event and one per viewer per Event.
- The number is not verified. Nothing proves the person typing it owns it.
- A **Visitor** still saves first (ADR 0028). Saving makes them an account, so the account
  cap applies to them too.

## Considered Options

- **Verify the number with a WhatsApp code first.** It would prove the phone and make
  strangers unreachable, and the `login_code_1` path already exists. Rejected for now: it
  adds a code round trip in front of what is meant to be the quickest thing on Home, for a
  risk that three sends per account already keeps small.
- **Profile phone only.** Rejected: a Google-only Owner, which is a common sign-in, would
  get no test at all, or would first have to go to settings.
- **Cap on the destination number.** It protects strangers directly, but one account could
  still spread its sends across many numbers. A per-account cap bounds what one account can
  do, and making accounts is already slowed by sign-in.

## Consequences

- Someone who makes many accounts can still send three tests from each. If abuse shows up,
  verifying the typed number is the next step. The account cap does not need to change for
  that.
- A cap reached on one Event can block a test on the account's next Event. The action is
  then not offered there, the same as when the Event cap is reached.

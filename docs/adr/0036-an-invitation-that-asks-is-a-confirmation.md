# An invitation that asks for an RSVP is a Confirmation

Date: 2026-10-11

## Status

Accepted

## Context

Every Event is seeded with an Initial Invitation on `save_the_date_1_no_button`: the
invitation image and the details, with no ask. Some Owners want the invitation itself to ask
whether guests are coming, and they ask an Operator to change it.

Asking is not a property of a template. The RSVP conversation, the follow-up copy
(`isFollowUpConfirmation`), the results tab and the "collects RSVP" preview all key off the
Schedule Type being `confirmation`. An Initial Invitation pointed at an asking template would
send buttons that nothing behind them treats as an ask, and there is no asking template in the
`initial_invitation` family to point at anyway.

## Decision

An Operator converts the Initial Invitation into the Event's **first Confirmation**, from the
Back Office outreach timeline. One transaction
(`admin_convert_invitation_to_confirmation`, service role only):

- The Schedule changes type to `confirmation` and template to the event type's first
  Confirmation family (`confirmation_1`), still to every guest. Its Due Time and note stay.
- Every other Confirmation of the Event that can still change and goes to every guest is
  narrowed to **pending guests**. The converted invitation is now the opening ask, so the
  Confirmation that used to open is the chase-up - the rule
  `20260921000000_first_outreach_targets_all_guests.sql` already applies to the seed.

Only an Initial Invitation that has not gone out or expired converts. There is no convert-back:
once guests may have answered an ask, turning it back into a non-asking message is not the
same Schedule any more.

## Consequences

- The plan no longer has an Initial Invitation. It reads Confirmation 1, 2, 3 on both the
  Owner's page and the Back Office, numbered by plan order as before.
- Which Confirmation is the follow-up is still decided by plan order, not by which one was
  converted. If an existing Confirmation is dated before the converted invitation, the
  invitation is sent with follow-up copy. The convert dialog warns about this; the Operator
  fixes it by moving a Due Time, which the same timeline now allows.
- Only the Back Office can do this. If Owners start asking for it, the same function is
  the starting point for an Owner-side action.

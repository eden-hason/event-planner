# An Operator may retry a failed SMS

Date: 2026-10-15

## Status

Accepted. Amends ADR 0012 (one SMS Fallback per Delivery) and closes the open decision in
`docs/backlog/0001-sms-delivery-visibility.md`.

## Context

SMS used to stop at accepted, so no SMS attempt could fail after the fact and "one SMS
Fallback per Delivery" never stranded anyone. The SMS poll now reads ActiveTrail's report
and marks an SMS that never arrived as failed - 47 of the first 1,171. Those guests had no
remedy left: the Fallback skips any Delivery that already has an SMS attempt
(`already_sms`), the database allowed one fallback attempt per Delivery, and the Back
Office resend goes out on WhatsApp, which had usually failed for them already.

## Decision

The Back Office SMS Fallback offers a Delivery again once **every SMS attempt on it has
failed**. It is listed with the reason "ה-SMS הקודם לא נמסר" and sent like any other
Fallback, with the Delivery's existing RSVP token.

- **Operator only.** The automatic sweeper keeps the old rule and never retries. A retry
  spends another SMS on a number that just refused one, and a guest the carrier keeps
  rejecting would otherwise be charged for on every sweep. The results screen does not
  promise a retry either, because nothing sends one by itself.
- **Neither the WhatsApp failure nor the Stuck window decides a retry.** The first SMS
  already went out on the WhatsApp's account; what is being retried is the SMS. That
  includes a Delivery still reading Sent because its WhatsApp was accepted and never
  confirmed.
- **An SMS still pending, sent or delivered blocks a retry.** Only a finished failure
  frees the Delivery.
- **The claim stays.** `message_delivery_attempts_one_fallback_key` now holds one fallback
  attempt that has not failed, instead of one ever. Two presses at once still collide on
  the pending row; a failed one no longer counts.

## Considered

- **Retrying automatically.** Rejected for cost and for the loop it invites; see above.
- **A separate "resend SMS" button.** Rejected: it would duplicate the Fallback's claim,
  template choice and audit trail for what is the same act - one more SMS to a guest
  WhatsApp could not reach.
- **A cap on retries.** Not added. Each retry needs an Operator's press and shows the
  previous failure, which is cap enough for now.

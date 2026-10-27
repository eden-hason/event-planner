# A Test Message that never arrives still counts

Status: open

## The problem

A **Test Message** (CONTEXT.md) can fail in two places. Only one of them reaches the Owner.

- **The send call fails.** Meta rejects the call, or the call's outcome is unknown. The
  Owner sees "We couldn't send it, try again" under the send button. The `test_messages`
  row is `failed`, so it counts toward no cap, and the Owner can try again.
- **Meta accepts the send and the message fails later.** Meta reports this in a status
  webhook a little later: the number has no WhatsApp, a marketing limit, a blocked
  business. By then the Owner has already seen "Sent to you, check your phone". The
  webhook drops the status, so the row stays `accepted`. Nothing arrives. The send uses up
  the viewer's one test on that Event and one of the account's three (ADR 0047). The action
  then leaves Home, so there is no way to try again on that Event.

The second case is now more likely than it was:

- The test is offered to every Owner, and a typed number is allowed (ADR 0047). A typo, or
  a number without WhatsApp, ends exactly this way.
- `confirmation_1_image`, `confirmation_1_follow_up` and `confirmation_1_follow_up_image`
  are in Meta's **Marketing** category, and so are the Personal Message families (ADR
  0046). Marketing messages are where Meta's per-user cap (131049) and opt-out (131050)
  apply.

## Evidence

- `process-whatsapp-webhook.ts` sorts statuses by their tag. A `test` status falls into
  `untracked++` and nothing is applied
  (`src/features/schedules/services/process-whatsapp-webhook.ts`, around line 255).
- On 2026-10-27, production had 9 `test_messages` rows from 2026-09-28 on, all
  `accepted`, none `failed`.
- The raw statuses are still in `webhook_events`. Across all `test`-tagged statuses there
  are 10 `sent`, 10 `delivered`, 6 `read`, and **1 `failed`: 131026 "Message
  undeliverable", on 2026-10-11 16:20 UTC**. Its `test_messages` row is still `accepted`.
  So this has already happened once.

## What is known about the moving parts

- **The row can be found.** `sendTestMessage` writes Meta's message id to
  `test_messages.external_message_id` when the send is accepted. A status webhook carries
  the same id. No index exists on that column yet.
- **The `test` tag is shared.** The closing line Kululu adds when a test conversation ends
  (`closeTestConversation` in `confirmation-conversation.ts`) also posts with
  `TEST_MESSAGE_TAG`. Its statuses arrive tagged `test` too, but its id is in no
  `test_messages` row. So matching on `external_message_id` tells the two apart for free.
  A lookup that finds nothing should be ignored, not logged as a miss.
- **The caps already ignore failed rows.** `reserve_test_message` counts `accepted` and
  fresh `pending` rows only, and Home's `canReceiveTestMessage` counts `accepted` only.
  Flipping a row to `failed` gives the slot back with no other change.
- **Status order.** Meta can send `failed` after `sent`, and occasionally out of order. A
  `failed` should win over `sent`/`delivered` the way it does for a Delivery Attempt. A
  `delivered` or `read` arriving after it should not turn it back to accepted.

## Open questions

- **Should the Owner be told?** Today the action would simply come back on Home's next
  load. A line on it, such as "Your test didn't arrive - check the number and try again",
  needs `error_message` (or the Meta code) to be read by Home, and a choice of which codes
  to name. A 131026 for a typed number reads as "check the number". A 131049 reads as
  "WhatsApp limited this message, try again tomorrow".
- **131049 frees the slot, but should retrying be allowed straight away?** Meta's
  marketing cap is per user and per time window. Trying again at once will most likely
  fail the same way.
- **Back-fill the one known case?** The 2026-10-11 row could be flipped to `failed` by the
  same migration, if a migration is needed at all. It can be matched by its
  `external_message_id` against the failed status in `webhook_events`.

## Done means

- A `test`-tagged `failed` status marks its `test_messages` row `failed`, with Meta's
  error code and title in `error_message`. A later `delivered`/`read` does not undo it.
- The closing line's statuses are still ignored without a warning.
- Home offers the test again on its next load, and says why when it does, if that is the
  decision.
- CONTEXT.md's **Test Message** entry says that a test that never arrived does not count.

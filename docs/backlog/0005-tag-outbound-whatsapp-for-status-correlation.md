# WhatsApp statuses are matched by searching, not by a tag

Status: done - `docs/adr/0019-outbound-whatsapp-is-tagged-for-its-statuses.md`,
https://github.com/eden-hason/event-planner/pull/398

## The problem

Meta's status webhook (sent / delivered / read / failed) identifies a message only by its
`wamid`. The processor finds out what a status belongs to by searching for that id, and
there are now two places it can be:

- `message_delivery_attempts.external_message_id` - Schedule sends, posted by the Worker
- `whatsapp_inbound_messages.reply_message_id` - Confirmation Conversation replies, posted
  inline by the webhook processor (ADR 0017), which never get an attempt

Until the fix that added this item, only the first was searched. Every conversation reply's three
statuses matched nothing, were retried for the full `UNMATCHED_RETRY_WINDOW_MS` (15 min),
and were then logged as a tracking gap. On 2026-09-19 a one-guest test event with three
button taps left 9 of 16 stored webhook events in that loop. The fix added the second
lookup. It works, but it is a patch:

- **The processor has to know every sender.** A third inline send path would produce the
  same false retries and warnings until someone remembers to add a third lookup.
- **The race is built in.** A `wamid` exists only once the send call returns, and it is
  written after that. Meta's `sent` status regularly arrives first, for Worker sends and
  replies alike. That is the only reason the 15-minute retry window exists, and every
  such status is processed at least twice.
- **Real gaps are hard to see.** "Matched no attempt" is meant to catch a send whose
  tracking row went missing. It can only do that if expected unmatched ids never reach it.

## The approach to evaluate

The Cloud API send request accepts `biz_opaque_callback_data`, an arbitrary string that
Meta echoes back on that message's status webhooks. Tag each message when it is sent:

- Worker: the attempt id (for example `attempt:<uuid>`)
- Conversation reply: `conversation:<whatsapp_inbound_messages.id>`

The processor then reads the tag. It matches an attempt by its own id without needing the
`wamid` first, which removes the race. It ignores conversation statuses by prefix, with no
table lookup. A status with no tag is either another environment sharing the number or a
genuine gap, and can be warned about on the first pass instead of after 15 minutes.

## What is already known about the moving parts

- **One seam.** Both send paths go through `postToGraph` in
  `src/features/schedules/services/post-whatsapp.ts`: `postWhatsAppTemplate` for the
  Worker and `postWhatsAppSessionMessage` for replies. Adding an optional callback-data
  argument there covers both.
- **The attempt id exists before the send.** `claim_delivery_batch` inserts the attempt
  and returns its id before anything is posted, so the Worker has the tag in hand.
- **The inbound row exists before the reply.** `confirmation-conversation.ts` inserts the
  `whatsapp_inbound_messages` row as its claim, before it replies.
- **SMS is not affected.** The SMS Fallback and the SMS channel use a different provider
  with its own status story (backlog 0001).
- **The `wamid` should still be stored.** It is the only id Meta support can look up.

## Open questions

1. Confirm against Meta's current docs that `biz_opaque_callback_data` is echoed on
   **every** status type, including `failed`, and on session (non-template) messages, not
   only template sends. Check its length limit too. A UUID with a short prefix is about 45
   characters.
2. Should matching fall back to `wamid` when the tag is missing? Something will have to,
   because statuses for messages sent before the change carry no tag. How long does that
   fallback need to live?
3. Once tags are in, can `UNMATCHED_RETRY_WINDOW_MS` go, or shrink to cover only untagged
   messages sent before the rollout?
4. The reply lookup added alongside this item and the partial index
   `whatsapp_inbound_messages_reply_message_id_idx` become unnecessary. Should they be
   removed in the same change, or left as the fallback for question 2?

## What "done" means

Every outbound WhatsApp message is tagged at send time. The status processor matches by the
tag, with `wamid` only as a fallback for untagged messages. A conversation reply's statuses
cost one pass and no warning. "Matched no attempt" fires only for messages Kululu did not
tag.

## What was found (2026-09-19)

1. **Echo.** Meta's status webhook reference documents `biz_opaque_callback_data` as a
   field of the status object, "only included if the business set" it on the send, with no
   restriction by status type or message type. The changelog raised its maximum from 256 to
   512 characters, and our tags are at most 49. The docs never say in so many words that
   session (non-template) sends carry it, so this has not been treated as proven: an
   untagged status is logged on its first pass. **Verify on the first real conversation
   after deploy** that reply statuses arrive with a `conversation:` tag. If they do not,
   they show up as untagged warnings.
2. **Fallback.** Considered and then dropped in the same change. Keeping the `wamid`
   search for about 30 days would have applied statuses for messages sent before the
   deploy. Instead that was accepted as a one-time loss: those Deliveries keep the status
   their sender recorded.
3. **Retry window.** Removed. A tagged status is matched by an id that exists before the
   send, and an untagged one has nothing to wait for.
4. **Reply lookup and its index.** Both removed. The index is dropped by
   `20260919000001_drop_inbound_reply_message_id_index.sql`.

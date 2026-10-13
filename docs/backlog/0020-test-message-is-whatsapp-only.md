# A Test Message can still go out as an SMS

Status: open

## The problem

A **Test Message** (CONTEXT.md) is a copy of a Schedule's message sent to the Owner's own phone.
It has always been meant as a WhatsApp preview. The migration that created it says "each send
costs a real WhatsApp message". But nothing in the code holds it to WhatsApp. The channel comes
from the Schedule's template, and an SMS template is sent as an SMS.

We want a Test Message to be WhatsApp only. It should never go out as an SMS. The data model and
the glossary should say so as well.

## Evidence

- `sendTestMessage` (`src/features/schedules/services/send-test-message.ts`) resolves the
  template family from `schedule.template` (`resolveTemplatesForEvent`). It then branches on
  `template.channel === 'sms'` and calls `sendSmsToGuest` instead of `sendToGuest`.
- The Schedule is picked by `getTestMessageSchedule` (`src/features/home/queries/home.ts`): the
  event's earliest unsent Confirmation, by plan order, whatever its template channel is.
- On 2026-10-13, the database the Supabase MCP reads (believed to be production, not
  confirmed) had 6 `test_messages` rows from 2026-09-28 to 2026-10-12. All were `accepted` and
  all were WhatsApp (joined through `schedules.template_id` to `message_templates.channel`).
  So no SMS test has gone out yet. The SMS branch is reachable but unused.
- The Home "test" Featured Action has been hidden since `dd121b7` (2026-10-12), with the note
  "until the test message issue is fixed": `test: () => false` in
  `src/features/home/utils/featured-actions.ts`. This item should be done before it is shown
  again.

## What is known about the moving parts

- **The table.** `test_messages` (`20260915000000_home_preview_token_and_test_messages.sql`)
  has no `channel` column. The channel can only be worked out through `schedule_id`, which is
  `on delete set null`, so it is lost once the Schedule is deleted. The cap RPC
  `reserve_test_message` does not look at the channel either.
- **The WhatsApp path is already test-aware.** `sendToGuest` → `sendWhatsAppTemplateMessage`
  (`src/features/schedules/actions/whatsapp.ts`) always posts with `TEST_MESSAGE_TAG`. The
  webhook processor reads that tag and knows the status needs no Delivery update (ADR 0019).
  The buttons carry a test marker, so the Confirmation Conversation plays out without writing
  anything (ADR 0017). `sendToGuest` has no caller other than the Test Message.
- **The SMS path is not test-aware.** `sendSmsToGuest` is shared with the Operator SMS Fallback
  (`services/send-sms-fallback.ts`), so it cannot be removed. It only has to stop being called
  for tests. No status or reply handling knows that an SMS was a test.
- **The RSVP link** in either channel carries the event's `preview_token`, so tapping it opens
  the Live Invite Preview Link and records nothing. This is not affected.

## Open questions

- **Which Schedule should be tested when the first Confirmation is an SMS one?** Options:
  (a) skip to the earliest unsent Confirmation that has a WhatsApp template; (b) send the
  WhatsApp member of the same template family (same key and variant, `channel = 'whatsapp'`);
  (c) offer no Test Message for that event. (b) shows the Owner the closest thing to what will
  go out, but it is not exactly the message the Guest gets. CONTEXT.md promises "exactly what a
  Guest will receive".
- **Eligibility.** `canReceiveTestMessage` should not offer the action when there is no
  WhatsApp message to test. Otherwise the Owner taps it and gets a `send-failed`.
- **Recording the channel.** Should we add `channel` to `test_messages` with
  `check (channel = 'whatsapp')`, or is a guard in code enough? A column records the rule in the
  schema and survives the Schedule being deleted. Existing rows backfill to `'whatsapp'` (all 6
  are). A destructive or backfilling migration ends with a guard, as CLAUDE.md requires.
- **The exposed transport.** `sendWhatsAppTemplateMessage` is an exported function in a
  `'use server'` module and is re-exported from `@/features/schedules`. Its own comment says
  "everything a `'use server'` module exports is reachable over the network". It takes any `to`
  and template, and it checks neither auth nor the cap. It was not checked whether a client
  bundle references it, which is what makes it a live endpoint. Proper handling probably means
  moving it to a plain server-only module that only `sendTestMessage` calls.

## Done means

- `sendTestMessage` never calls `sendSmsToGuest`, and it fails clearly before reserving a send
  if it has no WhatsApp template.
- Home offers the test only when a WhatsApp message exists to send.
- `test_messages` records the channel, or the decision not to record it is written down.
- CONTEXT.md's **Test Message** entry says it is a WhatsApp message. If the choice of Schedule
  changes, the entry says that too, and the decision goes to `docs/adr/`.
- The test transport is no longer a network-callable Server Action.
- The Home "test" action can be turned back on.

# A sign-in code has no SMS fallback

Status: open

## The problem

Since ADR 0043, every auth code (sign-in on `/login` and a Visitor's phone save) goes by
WhatsApp alone. Someone whose number has no WhatsApp account, such as an older parent, a
landline-backed business number or a kosher phone, never gets a code, and the code screen
gives no sign that anything went wrong. Their only way in is Google.

## What is already known

- **The hook cannot tell which channel was asked for.** Supabase's `send_sms` hook payload is
  `{ user, sms: { otp, sms_type? } }`. `signInWithOtp({ options: { channel } })` only matters
  to the built-in Twilio provider and does not reach a custom hook.
- **Meta does not refuse a number without WhatsApp up front.** The send is usually accepted
  (2xx with a wamid) and fails later on the webhook with error 131026. The hook has answered
  Auth by then, so an "if WhatsApp fails, send SMS" step inside the hook catches only
  configuration errors.
- **SMS still works.** ActiveTrail is wired for Schedules (`src/features/schedules/actions/sms.ts`),
  and the old hook body is in git history (before ADR 0043). It reaches Israeli numbers only.
- The `otp` callback tag already brings these sends' statuses to the webhook, which drops
  them as untracked.

## Approaches, not yet chosen

1. **User-chosen SMS.** After the resend cooldown the code screen offers "send by SMS". The
   Server Action writes a short-lived row (phone, expires in ~2 minutes) before calling
   `signInWithOtp`, and the hook, using the service role key it already gets, reads and
   deletes that row to pick SMS. It needs a new table, which needs a Visitor decision: close
   it to Visitors, since it costs money.
2. **Webhook-driven fallback.** When an `otp`-tagged status comes back `failed` with 131026,
   the webhook sends the SMS itself. That needs the code, which the hook would have to put in
   the tag (Meta echoes it in plain text), and the person waits for a webhook round-trip.
   Weaker on both counts.

## Done would mean

Someone without WhatsApp can sign in by phone with an Israeli number, without asking
support, and the extra cost is visible.

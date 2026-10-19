# Sign-in codes go by WhatsApp only

Date: 2026-10-19

## Status

Accepted.

## Context

Phone sign-in, and a Visitor saving with their phone (ADR 0028), both ask Supabase Auth for
a code. Auth hands every code to the `send_sms` hook, our `supabase/functions/send-sms`, which
posted it to ActiveTrail as an SMS. Everything else Kululu sends an Owner or a Guest already
goes by WhatsApp first. ActiveTrail also only reaches Israeli numbers, so an Owner with a
number from abroad could not get a code at all (backlog 0025).

The hook payload is `{ user, sms: { otp } }`. It says nothing about the channel the caller
asked for, so the hook cannot choose between WhatsApp and SMS per request without plumbing
of our own.

## Decision

**Every auth code goes out as a WhatsApp Authentication template, and there is no SMS.**

- The same `send-sms` edge function now posts to Meta's Graph API from the same business
  number that sends to Guests (`WHATSAPP_PHONE_NUMBER_ID`). It keeps its name so the hosted
  hook URL does not change.
- The template is `login_code_1`, Hebrew only, in Meta's **Authentication** category. Meta
  fixes the body of that category, so Kululu chooses only the options: the security line, a
  10-minute expiry footer and a "copy code" button. The hosted SMS OTP Expiry is 600s to
  match the footer.
- The message is tagged `otp` in `biz_opaque_callback_data`. The webhook treats that tag as
  untracked by design, so these sends are not logged as untagged.
- `/login` and the Visitor save form say WhatsApp on the button and on the code screen.

## Considered Options

- **"Send by SMS instead" on the code screen.** Rejected for now: the hook would need a
  short-lived marker per phone to know which channel was asked for, which means a new table
  and a Visitor decision. Logged as backlog 0027.
- **Fall back to SMS when Meta refuses the send.** Rejected: Meta usually *accepts* a
  message to a number with no WhatsApp and reports the failure later by webhook, after the
  hook has answered. That covers only configuration errors, so it would almost never fire.
- **A Next.js route instead of the edge function.** Rejected: sign-in would then depend on
  Vercel being up, and the hook URL would need repointing in the dashboard. The cost of the
  edge function is a second copy of the WhatsApp token, as Supabase function secrets.
- **Supabase's built-in `channel: 'whatsapp'`.** Not applicable: it only works with Twilio
  as the provider, and a custom hook replaces the provider entirely.

## Consequences

- A phone number with no WhatsApp cannot sign in by phone. Google sign-in is the way out.
  Nothing on the code screen says the message failed, because nothing knows yet.
- An Owner from abroad can sign in by phone now, which they could not before.
- Each code costs a Meta Authentication message, charged by the recipient's country.
- Rotating the WhatsApp access token now means updating Vercel and the Supabase function
  secrets.
- An Owner's chat with the Kululu number now opens with their sign-in code, ahead of any
  Owner Message (ADR 0039).

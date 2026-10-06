# 0018 - Nothing but a per-IP rate limit protects the public auth endpoints

Status: open
Area: auth / abuse
Related: `docs/adr/0028-a-visitor-draft-never-moves-to-an-existing-account.md`,
`supabase/config.toml` (`[auth.captcha]`, `[auth.rate_limit]`)

## The problem

ADR 0028 opens anonymous sign-in: the first answer on `/start` creates an auth user and an
`events` row, with no login. The only protection is Supabase's per-IP anonymous limit
(`anonymous_users`, 30 per hour by default). A script rotating IPs can fill `auth.users` and
`events` with Visitor drafts. The 30-day purge clears them eventually, but they distort the
back office and analytics in the meantime.

A worse and older gap: phone OTP (`signInWithOtp`, and `updateUser({ phone })` at the save
gate) sends a paid SMS to any number it is given. That makes it a target for SMS pumping,
where premium-rate numbers are fed into the OTP endpoint to collect the per-message revenue.
This was true before ADR 0028; the save gate just puts the endpoint on the newcomer path.

## What is known

- Supabase has auth CAPTCHA built in (`[auth.captcha]`, hCaptcha or Cloudflare Turnstile).
  Once enabled, it is enforced on **every** auth endpoint: anonymous sign-in, OTP send,
  sign-up and sign-in. Every client call then has to pass a `captchaToken`, including the
  Server Actions in `src/features/auth/actions/auth.ts`.
- Turnstile has an invisible mode, so the zero-friction first tap ADR 0028 is built for can
  survive it.
- Nothing is configured today: `[auth.captcha]` is commented out in `config.toml`, and there
  is no Turnstile, hCaptcha or BotID in `src/` or `package.json`.

## Still unknown

- The real rate of anonymous sign-ups and OTP sends on prod once ADR 0028 ships.
- Whether Vercel BotID on `/start` and the OTP Server Actions would be enough without
  Supabase's CAPTCHA, which is the lighter wiring.

## When to pick this up

Any of: anonymous sign-ups out of proportion to published Events; an OTP SMS bill above the
sign-up rate; Visitor drafts flooding the back office faster than the purge clears them.

## Done means

Anonymous sign-in and OTP send both need a passing bot check, invisible to an ordinary
visitor, and phone OTP sends are capped per destination prefix or country if Supabase allows.

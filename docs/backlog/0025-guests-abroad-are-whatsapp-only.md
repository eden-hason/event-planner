# A Guest with a number from abroad is reached on WhatsApp alone, and nothing says so

Status: open

## The problem

An Owner can now save a Guest Record with a number from abroad (`+1…`, `+44…`), as long as it
is a valid number typed with its `+` country code. Such a Guest is sent WhatsApp like anyone
else, but never an SMS: SMS goes out through ActiveTrail, an Israeli provider, so every SMS path
leaves a number outside `+972` out.

That much is deliberate and shipped. What was deferred is everything around it that the Owner
and the Operator see. Today a Guest abroad whose WhatsApp fails simply has a failed delivery and
no SMS, with no explanation in the Owner's UI, and a Schedule sent by SMS reports them as having
no phone number.

## What shipped

- **Validation** (`isValidGuestPhone`, `src/features/guests/schemas/index.ts`): an Israeli number
  must still be mobile (national number starts with `5`); a number from any other country only
  has to be valid. An unprefixed number is still read as Israeli (`DEFAULT_PHONE_REGION`), so
  `2125550100` is rejected and `+1 212 555 0100` is accepted. Used by the guest form, the file
  import and the WhatsApp import. `autoFixPhone` keeps a leading `+` for any code but `972`.
- **The SMS gate** (`canReceiveSms`, `src/lib/phone.ts`): true only for `+972`. Applied in:
  - the SMS Fallback classifier (`classifySmsFallbackCandidates`): a new exclusion,
    `not_israeli`, with the Hebrew reason shown in the Back Office fallback dialog. The sweeper
    treats it as settled, so a Schedule whose only open failures are abroad does not hold a slot.
  - `renderScheduleDeliveries`: a Schedule whose template channel is SMS records a Guest abroad as
    Not sent with `not_sent_reason = 'no_phone'`.
  - the Back Office workspace Signal's fallback count (`src/features/admin/queries/events.ts`).
  - `sendSmsMessage` itself refuses, as a backstop for a payload rendered before the change.

## What is still open

1. **The Owner sees nothing.** In the schedule results and the Guest Journey, a Guest abroad whose
   WhatsApp failed looks like any other failure, and is never followed by an SMS. Nothing says
   "number from abroad - WhatsApp only". Same for the guest list: no marker that a Guest will not
   get SMS.
2. **`no_phone` is the wrong label on an SMS Schedule.** The Guest has a phone, just not one SMS
   can reach. A dedicated `not_sent_reason` (say `sms_unreachable`) needs a migration, since the
   column has a `CHECK (not_sent_reason in ('no_phone', 'outside_package'))`
   (`20261002000004_not_sent_reason.sql`), plus the `NotSentReason` type, `guest-interactions.ts`
   and the results/journey components.
3. **The Back Office send plan** (`src/features/admin/services/schedule-send-plan.ts`) counts
   reachability with `validatePhoneNumber`, so for an SMS Schedule its "remaining" list includes
   Guests abroad that the send will then skip.
4. **The Send Window and Due Times are Israel wall clock** (CONTEXT.md). A Guest in New York gets
   the 09:00 message at 02:00 local. Not addressed; probably acceptable while abroad is the
   exception.
5. **Is international SMS actually unavailable?** Not checked with ActiveTrail. If the account can
   send abroad (and at what price, and whether the `Kululu` alphanumeric sender works in the
   target country - it does not in the US), the gate could become a per-country list instead of
   `+972` only.
6. **Out of scope, not touched:** call rounds (an Operator dials by hand, so a number from abroad
   is just a longer number), the Owner's own phone (auth OTP goes through ActiveTrail too, via
   `supabase/functions/send-sms`), and Test Messages (WhatsApp only, see 0020).

## Also worth knowing

- **Meta and `+1` numbers.** Meta stopped delivering *marketing* category templates to US
  numbers in 2025; *utility* templates still go. Which category each Kululu template is registered
  under lives in Meta, not in this repo, and was not checked. A marketing template to a US Guest
  fails with a Meta error code that `classifyWhatsAppFailure` may file as guest-level.
- **Per-country WhatsApp pricing.** Meta bills a template by the recipient's country, so a Guest
  abroad can cost more than an Israeli one under the flat per-record price (ADR 0002).

## Done would mean

The Owner can tell, from the guest list and from a Schedule's results, that a Guest abroad is
WhatsApp only and why they got no SMS; an SMS Schedule reports them with their own reason, not
"no phone"; and the Back Office send plan counts them the way the send does.

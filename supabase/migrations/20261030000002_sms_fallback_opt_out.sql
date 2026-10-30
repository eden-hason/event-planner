-- An SMS Fallback Opt-out (CONTEXT.md): an Event whose Owner asked that its Guests
-- never be sent an SMS Fallback.
--
-- The first Owner to ask has Guests abroad, some of them on Israeli numbers, so the
-- per-number gate (only +972 can receive an SMS) cannot tell their Event apart. It
-- is the Owner's choice rather than a cost control like the Fallback Freeze, so
-- nothing overrides it: the sweeper, the Operator's button and the Operator's SMS
-- retry all refuse while it holds. An Operator sets it in the Back Office.
--
-- Deliberately not covered: a Schedule whose own channel is SMS. That is a first
-- attempt an Operator chose, not a fallback.
--
-- A plain column with no guard against Owner writes, like bonus_records_override:
-- the setting serves the Owner, so an Owner changing it harms nobody.

alter table public.events
  add column sms_fallback_enabled boolean not null default true;

comment on column public.events.sms_fallback_enabled is
  'False under an SMS Fallback Opt-out: no SMS Fallback, automatic or by an Operator, is sent to this Event''s Guests. Set from the Back Office at the Owner''s request.';

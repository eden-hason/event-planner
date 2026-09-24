-- The Guest types how many are coming, and the Owner sees who answered more
-- than they were invited for (ADR 0023).
--
-- 1. guests.invited_amount. Until now `amount` was one column that both the
--    Owner's invitation and the Guest's answer wrote, so the invitation was lost
--    the moment a Guest answered. The Confirmation Conversation no longer shows
--    the invited amount - it asks - so an answer above the invitation is now
--    likely, and the Owner needs the invitation kept to notice it. `amount`
--    stays what it has always been to everything that reads it (seating,
--    headcounts): the number coming, or expected to.
--
--    Inserts default it from `amount`, so importers, the AI chat and event
--    duplication need no change. On update it moves only when an Owner or
--    Operator changes `amount` (upsertGuest); a Guest's own answer never
--    touches it. Backfilled from `amount`, which is the true invitation only
--    for Guests who have not answered - for those who have, the original is
--    gone, and their answer stands in for it (no flag on existing answers).
--
-- 2. The count question's pending state, on whatsapp_inbound_messages. A tap
--    identifies itself (ADR 0017); a typed "3" does not, so the reply that asked
--    "how many?" records that it is waiting for an answer, and for whom. The
--    next typed text from that phone is read as the answer while that reply is
--    the latest thing Kululu said to it. from_phone makes that lookup possible
--    for a Test Message too, which has no Delivery to reach a phone through.

-- --------------------------------------------------------------------------
-- guests.invited_amount
-- --------------------------------------------------------------------------

alter table public.guests add column invited_amount integer;

update public.guests set invited_amount = greatest(coalesce(amount, 1), 1) where invited_amount is null;

alter table public.guests
  alter column invited_amount set not null,
  add constraint guests_invited_amount_positive check (invited_amount >= 1);

create or replace function public.default_guest_invited_amount()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.invited_amount := coalesce(new.invited_amount, greatest(coalesce(new.amount, 1), 1));
  return new;
end;
$$;

create trigger default_guest_invited_amount
  before insert on public.guests
  for each row execute function public.default_guest_invited_amount();

comment on column public.guests.invited_amount is
  'How many the Owner invited on this record. amount is how many are coming; a Guest answer above this is flagged to the Owner (ADR 0023). Moves only when an Owner or Operator edits amount.';

-- --------------------------------------------------------------------------
-- The awaited typed answer
-- --------------------------------------------------------------------------

alter table public.whatsapp_inbound_messages
  -- The sender, in Meta's form (international, no "+").
  add column from_phone text,
  -- What the reply to this message asked the Guest to type, if anything.
  add column awaiting text check (awaiting in ('count')),
  -- Unreadable answers already given to that question.
  add column awaiting_attempt smallint not null default 0;

create index whatsapp_inbound_messages_from_phone_idx
  on public.whatsapp_inbound_messages (from_phone, received_at desc);

-- --------------------------------------------------------------------------
-- Guard
-- --------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from public.guests where invited_amount <> greatest(coalesce(amount, 1), 1)) then
    raise exception 'guests.invited_amount backfill did not match amount';
  end if;
end $$;

-- A Guest who confirmed for 4 and then declined kept amount = 4. Declining
-- changes rsvp_status and nothing else, so the leftover count stayed on the
-- record: the guest list showed the declined row at its invitation (1) while
-- the RSVP meters summed amount (4), and an Event's "not coming" read 6 for
-- three declined records of one each. 18 records in production held a count
-- like that.
--
-- amount is how many are coming (ADR 0023). A record that is not confirmed has
-- no answer of its own, so it is expected at its invitation - the rule the
-- drawer already saves by (resolveAmounts) and the list already shows by
-- (amountDisplay). Every other writer - the RSVP page, the Confirmation
-- Conversation, call outcomes, bulk status changes, the AI chat - can move a
-- record off confirmed without touching amount, so the rule is kept here, in
-- one place, rather than in each of them.
--
-- Postgres fires a table's before triggers by name. This one is named to sort
-- after default_guest_invited_amount, which fills invited_amount on insert, and
-- before guests_seating_guard, so the capacity check sees the amount that is
-- actually stored.

create or replace function public.reset_guest_amount_unless_confirmed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rsvp_status is distinct from 'confirmed' and new.invited_amount is not null then
    new.amount := new.invited_amount;
  end if;
  return new;
end;
$$;

create trigger guest_amount_follows_invitation
  before insert or update of rsvp_status, amount, invited_amount on public.guests
  for each row execute function public.reset_guest_amount_unless_confirmed();

-- The records already left with a count from an earlier answer.
update public.guests
   set amount = invited_amount
 where rsvp_status <> 'confirmed'
   and amount is distinct from invited_amount;

do $$
begin
  if exists (
    select 1 from public.guests
     where rsvp_status <> 'confirmed'
       and amount is distinct from invited_amount
  ) then
    raise exception 'a record that is not confirmed still holds a count other than its invitation';
  end if;
end $$;

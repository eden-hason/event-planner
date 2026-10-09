-- Only Guest Records with a phone number count against the Record Package (ADR 0033).
--
-- A record with no phone can never be sent to, so it should not hold a slot. Until now it
-- did: it counted as "used", and as one of the oldest unreached records it could keep a
-- slot that a guest with a phone then lost to the sending gate.
--
-- The free slots now go to unreached records in the order they got their phone number, not
-- the order they were added. Otherwise giving an old record a phone could push a guest who
-- was already getting messages out of the package. guests.phone_added_at holds that moment:
--
-- - set when a record is added with a phone, or gets one after having none
-- - kept when the number is edited (a fix keeps its place in line)
-- - cleared when the phone is removed, so adding it back joins the back of the line
--
-- Only the trigger writes it; whatever a client sends is overwritten.

alter table public.guests add column phone_added_at timestamptz;

comment on column public.guests.phone_added_at is
  'When this Guest Record last went from no phone to a phone; null while it has none. '
  'Orders the Record Package''s free slots (ADR 0033). Written only by a trigger.';

-- Records that already have a phone keep their place: they line up by when they were added,
-- exactly as before.
update public.guests
   set phone_added_at = created_at
 where phone_number is not null;

create or replace function public.set_guest_phone_added_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.phone_number is null then
    new.phone_added_at := null;
  elsif tg_op = 'INSERT' then
    new.phone_added_at := coalesce(new.created_at, now());
  elsif old.phone_number is null then
    new.phone_added_at := now();
  else
    new.phone_added_at := old.phone_added_at;
  end if;
  return new;
end;
$$;

create trigger set_guest_phone_added_at
  before insert or update on public.guests
  for each row execute function public.set_guest_phone_added_at();

alter table public.guests
  add constraint guests_phone_added_at_with_phone
  check ((phone_number is null) = (phone_added_at is null));

-- The backfill must have reached every record with a phone, or the check above would
-- already have failed; this names the failure if the constraint is ever relaxed.
do $$
begin
  if exists (
    select 1 from public.guests
     where (phone_number is null) <> (phone_added_at is null)
  ) then
    raise exception 'guests.phone_added_at does not match guests.phone_number';
  end if;
end;
$$;

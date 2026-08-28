-- Makes E.164 the only phone format either phone column will hold, and stops
-- the same person being stored twice under two spellings of one number.
--
-- `guests.phone_number` and `profiles.phone_number` held whatever the user
-- typed. The Zod layer only ever validated the input (`israeliMobilePhone` is a
-- `.refine`, so it passes the raw string through) and every write path handed
-- that string straight to the column, so `0545451963`, `054-545-1963` and
-- `+972545451963` all coexisted as distinct values for one guest. Conversion to
-- E.164 happened later, at send time, purely so Meta and Twilio would accept it.
--
-- The cost was duplicate detection: `getExistingGuestPhones` keyed its map on a
-- punctuation-stripped copy of the stored string, which collapses `054-545-1963`
-- onto `0545451963` but never onto `+972545451963`. Event
-- c9a9c96b-b74f-45d7-96ba-f80163660d06 accumulated three guests entered twice
-- this way; they were merged by hand before this migration, and the unique index
-- below is what stops the next three.
--
-- Ships alongside the code change that canonicalises on write (src/lib/phone.ts).
-- That has to be deployed first: once the CHECK lands, any writer still sending
-- a local-format number fails at insert.

-- Empty strings are the same absence of a number that NULL is, and would fail
-- the CHECK below. One row in profiles holds one today.

update guests
   set phone_number = null
 where phone_number is not null
   and btrim(phone_number) = '';

update profiles
   set phone_number = null
 where phone_number is not null
   and btrim(phone_number) = '';

-- The backfill itself. libphonenumber is JavaScript and cannot run in here, so
-- this reimplements the Israeli cases by hand - safe only because every row was
-- surveyed first and they all fall into these three shapes (1180 local, 58
-- already E.164, 0 unparseable in guests; 11 local in profiles). Anything that
-- does not is left untouched on purpose, for the guard at the bottom to catch.

update guests
   set phone_number =
         case
           when phone_number ~ '^\+' then
             regexp_replace(phone_number, '[^0-9+]', '', 'g')
           when regexp_replace(phone_number, '[^0-9]', '', 'g') like '972%' then
             '+' || regexp_replace(phone_number, '[^0-9]', '', 'g')
           when regexp_replace(phone_number, '[^0-9]', '', 'g') like '0%' then
             '+972' || substring(regexp_replace(phone_number, '[^0-9]', '', 'g') from 2)
           else phone_number
         end
 where phone_number is not null;

update profiles
   set phone_number =
         case
           when phone_number ~ '^\+' then
             regexp_replace(phone_number, '[^0-9+]', '', 'g')
           when regexp_replace(phone_number, '[^0-9]', '', 'g') like '972%' then
             '+' || regexp_replace(phone_number, '[^0-9]', '', 'g')
           when regexp_replace(phone_number, '[^0-9]', '', 'g') like '0%' then
             '+972' || substring(regexp_replace(phone_number, '[^0-9]', '', 'g') from 2)
           else phone_number
         end
 where phone_number is not null;

-- Mirrors E164_PATTERN in src/lib/phone.ts. Keep the two in step.

alter table guests
  add constraint guests_phone_number_e164
  check (phone_number is null or phone_number ~ '^\+[1-9][0-9]{1,14}$');

alter table profiles
  add constraint profiles_phone_number_e164
  check (phone_number is null or phone_number ~ '^\+[1-9][0-9]{1,14}$');

-- Scoped to the event, not global: the same person legitimately appears on two
-- different weddings, and two guests sharing one household number is a real
-- pattern this must not block across events.

create unique index guests_event_id_phone_number_key
    on guests (event_id, phone_number)
 where phone_number is not null;

do $$
declare
  non_canonical_guests   integer;
  non_canonical_profiles integer;
begin
  select count(*)
    into non_canonical_guests
    from guests
   where phone_number is not null
     and phone_number !~ '^\+[1-9][0-9]{1,14}$';

  select count(*)
    into non_canonical_profiles
    from profiles
   where phone_number is not null
     and phone_number !~ '^\+[1-9][0-9]{1,14}$';

  -- Unreachable while the CHECK constraints above are in force, which is the
  -- point: if a future edit weakens or drops one, this still fails the run
  -- rather than letting mixed formats back into the column unnoticed.
  if non_canonical_guests > 0 then
    raise exception
      'guests.phone_number still holds % row(s) that are not E.164', non_canonical_guests;
  end if;

  if non_canonical_profiles > 0 then
    raise exception
      'profiles.phone_number still holds % row(s) that are not E.164', non_canonical_profiles;
  end if;
end $$;

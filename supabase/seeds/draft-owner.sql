-- An Owner who stopped partway through onboarding: one Draft Event.
--
-- Loaded by `npx supabase db reset` alongside the other files in seeds/ (see
-- config.toml, db.seed). Never runs against production: `supabase db push`
-- applies migrations only. Re-runnable by hand:
--   docker exec -i supabase_db_event-planner psql -U postgres -d postgres < supabase/seeds/draft-owner.sql
--
-- A bar mitzva that answered type, names and date, then stopped before the
-- venue - so the Back Office Events list has a Draft row to show and filter,
-- and the onboarding takeover has a draft to resume. The owner has a phone
-- number so the Events search by phone has something to find.
--
-- Signing in: draft@kululu.test (OTP, read the code in Mailpit on
-- http://127.0.0.1:54324), or impersonate them as an Operator.

begin;

-- The token columns are written as '' rather than left null: GoTrue scans them
-- into plain strings and answers 500 for a user whose row carries a null there,
-- which breaks both sign-in and every request made with that user's token.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, email_change_token_current, reauthentication_token
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000006',
   'authenticated', 'authenticated', 'draft@kululu.test', crypt('kululu-local', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Lior Ben-David"}', false, false,
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.id = '00000000-0000-4000-a000-000000000006'
on conflict (provider, provider_id) do nothing;

insert into profiles (id, full_name, email, phone_number, is_admin, initial_setup_complete)
values ('00000000-0000-4000-a000-000000000006', 'Lior Ben-David', 'draft@kululu.test', '+972541234567', false, true)
on conflict (id) do nothing;

-- Deleting first makes the file re-runnable. Ninety days out, no venue yet:
-- onboarding_step 'date' is the furthest question answered, so the takeover
-- resumes at the venue.
delete from events where id = '00000000-0000-4000-b000-000000000030';

insert into events (id, user_id, title, event_date, status, onboarding_step, event_type_id, is_default)
select '00000000-0000-4000-b000-000000000030', '00000000-0000-4000-a000-000000000006',
       'Itay''s bar mitzva',
       ((now() at time zone 'Asia/Jerusalem')::date + 90)::timestamp at time zone 'UTC',
       'draft', 'date', et.id, true
from event_types et
where et.key = 'bar_mitzva';

do $$
begin
  if not exists (
    select 1 from events
    where id = '00000000-0000-4000-b000-000000000030' and status = 'draft' and onboarding_step = 'date'
  ) then
    raise exception 'draft-owner seed: the draft event is missing or not a draft';
  end if;
end $$;

commit;

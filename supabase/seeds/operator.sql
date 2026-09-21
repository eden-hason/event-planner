-- The local Operators: Back Office accounts to sign in as and impersonate
-- Owners from. admin@kululu.test is the generic one; edenhason91@gmail.com is
-- Eden's own, so a local sign-in works with the same address as production.
--
-- Loaded by `npx supabase db reset` alongside the other files in seeds/ (see
-- config.toml, db.seed). Never runs against production: `supabase db push`
-- applies migrations only. Re-runnable by hand:
--   docker exec -i supabase_db_event-planner psql -U postgres -d postgres < supabase/seeds/operator.sql
--
-- Signing in: either address. Auth is OTP, so request a code at /login and
-- read it in Mailpit on http://127.0.0.1:54324 - the local stack never sends
-- real email, so the code for edenhason91@gmail.com lands there too. The
-- password below exists only so the row is complete; the app never asks for it.

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
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000001',
   'authenticated', 'authenticated', 'admin@kululu.test', crypt('kululu-local', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Local Operator"}', false, false,
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000002',
   'authenticated', 'authenticated', 'edenhason91@gmail.com', crypt('kululu-local', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Eden Hason"}', false, false,
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.id in ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002')
on conflict (provider, provider_id) do nothing;

-- Profiles are created by application code, not by a trigger, so a seeded auth
-- user has no profile until one is inserted here. is_admin is what gates the
-- Back Office. initial_setup_complete skips the new-user onboarding an Operator
-- has no event for.
insert into profiles (id, full_name, email, is_admin, initial_setup_complete)
values
  ('00000000-0000-4000-a000-000000000001', 'Local Operator', 'admin@kululu.test', true, true),
  ('00000000-0000-4000-a000-000000000002', 'Eden Hason', 'edenhason91@gmail.com', true, true)
on conflict (id) do nothing;

commit;

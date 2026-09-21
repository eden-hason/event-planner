-- A free Owner with an empty event: the app as a new, unpaid customer sees it.
--
-- Loaded by `npx supabase db reset` alongside the other files in seeds/ (see
-- config.toml, db.seed). Never runs against production: `supabase db push`
-- applies migrations only. Re-runnable by hand:
--   docker exec -i supabase_db_event-planner psql -U postgres -d postgres < supabase/seeds/free-owner.sql
--
-- One published wedding and nothing in it - no guests, tables, expenses or
-- sends - on the free plan, so every empty state and every premium lock renders.
-- The default outreach plan is still written by seed_schedules_on_event_ready,
-- as a real new event gets it, and lands 'disabled' because nothing is paid.
--
-- Signing in: free@kululu.test (OTP, read the code in Mailpit on
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
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000005',
   'authenticated', 'authenticated', 'free@kululu.test', crypt('kululu-local', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Noa Barak"}', false, false,
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.id = '00000000-0000-4000-a000-000000000005'
on conflict (provider, provider_id) do nothing;

insert into profiles (id, full_name, email, is_admin, initial_setup_complete)
values ('00000000-0000-4000-a000-000000000005', 'Noa Barak', 'free@kululu.test', false, true)
on conflict (id) do nothing;

-- Deleting first makes the file re-runnable: it cascades to whatever the event
-- gathered since the last run. Sixty days out keeps every default send in the
-- future. billing_status is left to its default, 'free'.
delete from events where id = '00000000-0000-4000-b000-000000000020';

insert into events (id, user_id, title, event_date, status, event_type_id, is_default)
select '00000000-0000-4000-b000-000000000020', '00000000-0000-4000-a000-000000000005',
       'Noa & Omer wedding',
       ((now() at time zone 'Asia/Jerusalem')::date + 60)::timestamp at time zone 'UTC',
       'published', et.id, true
from event_types et
where et.key = 'wedding';

do $$
begin
  if not exists (
    select 1 from events
    where id = '00000000-0000-4000-b000-000000000020' and billing_status = 'free'
  ) then
    raise exception 'free-owner seed: the event is missing or not on the free plan';
  end if;
end $$;

commit;

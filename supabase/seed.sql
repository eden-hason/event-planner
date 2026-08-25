-- Local development seed.
--
-- Loaded after migrations by `npx supabase db reset` (config.toml, db.seed).
-- It never runs against production: `supabase db push` applies migrations only.
--
-- Why this exists: the Back Office reads across every user's events, so with an
-- empty database every one of its surfaces renders its empty state and nothing
-- can be verified. The rows below are chosen to produce each state the
-- Operations surfaces have to handle, not to look like a real business.
--
-- Signing in locally: the seeded Operator is admin@kululu.test. Auth is OTP,
-- so request a code at /login and read it in Mailpit on http://127.0.0.1:54324.
--
-- Everything uses fixed UUIDs and ON CONFLICT DO NOTHING, so the file is
-- re-runnable by hand against an existing database:
--   docker exec -i supabase_db_event-planner psql -U postgres -d postgres < supabase/seed.sql
--
-- Dates are relative to now() so the queue always has something overdue,
-- something today, and something far out, however long since the last reset.

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000001',
   'authenticated', 'authenticated', 'admin@kululu.test', crypt('kululu-local', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Local Operator"}', false, false),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000002',
   'authenticated', 'authenticated', 'noa.cohen@example.test', crypt('kululu-local', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Noa Cohen"}', false, false),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000003',
   'authenticated', 'authenticated', 'dana.levi@example.test', crypt('kululu-local', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dana Levi"}', false, false)
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.id in (
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000002',
  '00000000-0000-4000-a000-000000000003'
)
on conflict (provider, provider_id) do nothing;

-- Profiles are created by application code, not by a trigger, so a seeded auth
-- user has no profile until one is inserted here. is_admin is what gates the
-- Back Office - the Operator is the only row that carries it.
insert into profiles (id, full_name, email, is_admin)
values
  ('00000000-0000-4000-a000-000000000001', 'Local Operator', 'admin@kululu.test',      true),
  ('00000000-0000-4000-a000-000000000002', 'Noa Cohen',      'noa.cohen@example.test', false),
  ('00000000-0000-4000-a000-000000000003', 'Dana Levi',      'dana.levi@example.test', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Events
--
-- One draft on purpose. A Draft Event is interest rather than an event: it is
-- excluded from every Back Office count and must never reach the queue, and it
-- cannot have schedules, so it is given none.
-- ---------------------------------------------------------------------------

insert into events (id, user_id, title, event_date, status)
values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002',
   'Cohen wedding',      now() + interval '19 days', 'published'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000003',
   'Levi henna',         now() + interval '40 days', 'published'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000002',
   'Mizrahi bar mitzva', now() + interval '75 days', 'published'),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000003',
   'Peretz brit',        now() + interval '30 days', 'draft')
on conflict (id) do nothing;

-- Guest Records, the billable unit. `amount` is how many actual Guests each
-- record covers, so count(*) and sum(amount) are different numbers on purpose.
insert into guests (id, event_id, name, phone_number, rsvp_status, amount)
select
  ('00000000-0000-4000-c000-' || lpad((e.seq * 1000 + g)::text, 12, '0'))::uuid,
  e.id,
  'Guest ' || g || ' (' || e.title || ')',
  '+9725' || lpad((e.seq * 1000 + g)::text, 8, '0'),
  (array['pending','pending','pending','confirmed','confirmed','declined'])[1 + (g % 6)]::"RSVP_STATUS",
  1 + (g % 3)
from (
  select id, title, row_number() over (order by title) as seq
  from events
  where id in (
    '00000000-0000-4000-b000-000000000001',
    '00000000-0000-4000-b000-000000000002',
    '00000000-0000-4000-b000-000000000003'
  )
) e
cross join generate_series(1, 40) g
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Planned work - what the Operations queue reads
--
-- status IS NULL is the only representation of "not completed": the enum holds
-- only 'sent' and 'cancelled'. Two rows are deliberately in the past so the
-- Overdue group and the Overview's Overdue Schedule signal both have input.
-- Cohen wedding gets two call plans so the positional title index renders
-- ("Call Round 1" / "Call Round 2") rather than two identical rows.
-- ---------------------------------------------------------------------------

-- sent_at is set here rather than in a follow-up UPDATE: the
-- prevent_sent_schedule_mutation trigger (migration 20260506000000) rejects any
-- update to a row already marked sent, which is exactly what makes a send final.
insert into schedules (id, event_id, schedule_type_id, template_id, scheduled_date, scheduled_time, target_status, status, sent_at)
select
  d.id::uuid,
  d.event_id::uuid,
  st.id,
  case when st.execution_kind = 'message' then mt.id end,
  d.scheduled_date,
  d.scheduled_time::time,
  d.target_status,
  d.status::schedule_completion_status,
  case when d.status = 'sent' then d.scheduled_date end
from (values
  -- overdue: a send that should have gone out, and a round nobody started
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-000000000003', 'initial_invitation', now() - interval '2 days',  '09:00', 'pending',   null),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-b000-000000000001', 'phone_call',         now() - interval '7 days',  '11:00', 'pending',   null),
  -- near term
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-b000-000000000002', 'event_reminder',     now() + interval '4 hours', '18:00', 'pending',   null),
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-b000-000000000001', 'event_reminder',     now() + interval '1 day',   '09:00', 'pending',   null),
  ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-b000-000000000001', 'phone_call',         now() + interval '2 days',  '10:00', 'pending',   null),
  -- far out, to prove the queue has no horizon
  ('00000000-0000-4000-d000-000000000006', '00000000-0000-4000-b000-000000000002', 'phone_call',         now() + interval '25 days', '16:30', 'confirmed', null),
  ('00000000-0000-4000-d000-000000000007', '00000000-0000-4000-b000-000000000003', 'post_event',         now() + interval '80 days', '12:00', 'confirmed', null),
  -- history, for the event timeline: one sent, one cancelled by the owner,
  -- and the plan whose round is running below
  ('00000000-0000-4000-d000-000000000008', '00000000-0000-4000-b000-000000000001', 'initial_invitation', now() - interval '20 days', '09:00', 'pending',   'sent'),
  ('00000000-0000-4000-d000-000000000009', '00000000-0000-4000-b000-000000000001', 'post_event',         now() - interval '15 days', '09:00', 'confirmed', 'cancelled'),
  ('00000000-0000-4000-d000-00000000000a', '00000000-0000-4000-b000-000000000001', 'phone_call',         now() - interval '3 days',  '10:00', 'pending',   'sent'),
  -- sends already out the door on the other two events, so "sent" is not a
  -- Cohen-only state: the Sent filters, the per-event timelines and the
  -- delivery counts all have more than one event to draw from
  ('00000000-0000-4000-d000-00000000000b', '00000000-0000-4000-b000-000000000002', 'initial_invitation', now() - interval '32 days', '09:00', 'pending',   'sent'),
  ('00000000-0000-4000-d000-00000000000c', '00000000-0000-4000-b000-000000000002', 'confirmation',       now() - interval '10 days', '14:00', 'pending',   'sent'),
  ('00000000-0000-4000-d000-00000000000d', '00000000-0000-4000-b000-000000000003', 'confirmation',       now() - interval '12 days', '15:00', 'pending',   'sent'),
  -- a sent phone_call is a round that was started, never a bare row: the
  -- unique index on call_rounds.schedule_id is what pairs them, and the
  -- finished round for this one is below
  ('00000000-0000-4000-d000-00000000000e', '00000000-0000-4000-b000-000000000003', 'phone_call',         now() - interval '9 days',  '11:00', 'pending',   'sent')
) as d(id, event_id, type_key, scheduled_date, scheduled_time, target_status, status)
join schedule_types st on st.key = d.type_key
left join lateral (
  select id from message_templates m where m.schedule_type_id = st.id order by m.key limit 1
) mt on true
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Rounds, for the calling surface: one in progress, one finished
--
-- Start claims the plan (status null -> 'sent', done above) and snapshots the
-- audience into call_logs. Outcomes are left partly null on purpose: a guest
-- who confirmed by WhatsApp after the snapshot is correctly skipped and keeps a
-- null outcome forever, which is why the surface shows RSVP beside outcome.
-- ---------------------------------------------------------------------------

insert into call_rounds (id, event_id, schedule_id, round_number, started_by, created_at, completed_at)
values ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-b000-000000000001',
        '00000000-0000-4000-d000-00000000000a', null,
        '00000000-0000-4000-a000-000000000001', now() - interval '3 days', null)
on conflict (id) do nothing;

insert into call_logs (round_id, guest_id, outcome, notes, called_by, called_at)
select
  '00000000-0000-4000-e000-000000000001',
  g.id,
  case
    when g.rn % 4 = 0 then 'confirmed'::call_outcome
    when g.rn % 4 = 1 then 'no_answer'::call_outcome
    when g.rn % 4 = 2 then 'declined'::call_outcome
    else null
  end,
  case when g.rn % 8 = 0 then 'Asked to be called back after work' end,
  '00000000-0000-4000-a000-000000000001',
  case when g.rn % 4 = 3 then null else now() - interval '2 days' end
from (
  select id, row_number() over (order by name) as rn
  from guests
  where event_id = '00000000-0000-4000-b000-000000000001'
    and rsvp_status = 'pending'
) g
on conflict (round_id, guest_id) do nothing;

-- The finished round, for the plan sent nine days ago. completed_at is set and
-- every log carries an outcome, which is what separates "done" from the round
-- above that is merely no longer being worked on.
insert into call_rounds (id, event_id, schedule_id, round_number, started_by, created_at, completed_at)
values ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-b000-000000000003',
        '00000000-0000-4000-d000-00000000000e', null,
        '00000000-0000-4000-a000-000000000001',
        now() - interval '9 days', now() - interval '9 days' + interval '4 hours')
on conflict (id) do nothing;

insert into call_logs (round_id, guest_id, outcome, notes, called_by, called_at)
select
  '00000000-0000-4000-e000-000000000002',
  g.id,
  case
    when g.rn % 3 = 0 then 'confirmed'::call_outcome
    when g.rn % 3 = 1 then 'declined'::call_outcome
    else 'no_answer'::call_outcome
  end,
  case when g.rn % 7 = 0 then 'Left a voicemail' end,
  '00000000-0000-4000-a000-000000000001',
  now() - interval '9 days' + interval '2 hours'
from (
  select id, row_number() over (order by name) as rn
  from guests
  where event_id = '00000000-0000-4000-b000-000000000003'
    and rsvp_status = 'pending'
) g
on conflict (round_id, guest_id) do nothing;

-- ---------------------------------------------------------------------------
-- Deliveries for every sent message send
--
-- Driven off the schedules themselves rather than a hardcoded id, so a new
-- 'sent' row above gets its deliveries without a second edit here. Phone call
-- plans are excluded by template_id is not null - a call round produces
-- call_logs, never a delivery.
--
-- Only 'sent' and 'failed' are ever written in practice. `delivered`, `read`
-- and clicked_at exist in the enum and are never populated, so nothing here
-- writes them - a read rate built on this data would be a confident zero.
-- ---------------------------------------------------------------------------

insert into message_deliveries (schedule_id, guest_id, status, sent_at, delivery_method, triggered_by, error_code, error_message, template_id)
select
  s.id,
  g.id,
  -- Failures are kept on the Cohen invitation alone. Sprinkling them over every
  -- send would leave no event that went out clean, and the failure surfaces are
  -- easier to read when they point somewhere specific.
  case when s.id = '00000000-0000-4000-d000-000000000008'::uuid and g.rn <= 3
       then 'failed'::delivery_status
       else 'sent'::delivery_status end,
  s.sent_at,
  'whatsapp',
  'scheduled',
  -- error_code is an integer: it holds the raw WhatsApp reason code, and the
  -- human label beside it in the UI is ours to supply, not the column's
  case when s.id = '00000000-0000-4000-d000-000000000008'::uuid
       then case when g.rn = 1 then 131049 when g.rn = 2 then 63016 when g.rn = 3 then 131049 end end,
  case when s.id = '00000000-0000-4000-d000-000000000008'::uuid
       then case when g.rn in (1, 3) then 'Rate limit hit' when g.rn = 2 then 'Outside the 24 hour window' end end,
  s.template_id
from schedules s
join lateral (
  select id, row_number() over (order by name) as rn
  from guests
  where guests.event_id = s.event_id
) g on true
where s.status = 'sent'
  and s.template_id is not null
on conflict do nothing;

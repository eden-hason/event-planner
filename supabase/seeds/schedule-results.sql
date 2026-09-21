-- Schedule Results showcase.
--
-- Loaded after seed.sql by `npx supabase db reset` (config.toml, db.seed). Never
-- runs against production: `supabase db push` applies migrations only.
--
-- Why this exists: seed.sql is built for the Back Office queue, and every
-- Delivery it writes is one WhatsApp attempt at 'sent' - so every guest reads
-- "on its way", nobody has seen, opened or answered anything, and the results
-- screens render a single state. This file builds one event whose sent
-- schedules between them produce every state the Schedule Results and Call
-- Round screens have to handle.
--
-- Signing in: the Owner is couple@kululu.test (OTP, read the code in Mailpit on
-- http://127.0.0.1:54324), or impersonate them from the Back Office.
--
-- Re-run it whenever the "live" results have gone stale. Results stop being
-- live 72 hours after sending, so a showcase seeded at the last reset quietly
-- turns into a settled one. The event is deleted and rebuilt, with every time
-- relative to now():
--   docker exec -i supabase_db_event-planner psql -U postgres -d postgres < supabase/seeds/schedule-results.sql
--
-- What each sent schedule is for:
--   save the date   16 days ago   settled, no RSVP: the "not seen yet" filter,
--                                 a system-level failure with no fallback, and
--                                 a withheld message that fell back to SMS
--   confirmation    7 days ago    settled RSVP: answers spread over three days,
--                                 meals, a shared-link guest with no Delivery
--   follow-up       90 min ago    live RSVP: guests still on their way, answers
--                                 landing "x min ago"
--   call round      30 min ago    live round: some called, most not yet, and
--                                 guests who answered the follow-up after the
--                                 snapshot, who keep a null outcome forever
--
-- Every guest's story is chosen by arithmetic on its row number rather than
-- random(), so a given guest reads the same way after every re-run.

begin;

set local client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- The Owner
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000004',
   'authenticated', 'authenticated', 'couple@kululu.test', crypt('kululu-local', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Maya Shalev"}', false, false)
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.id = '00000000-0000-4000-a000-000000000004'
on conflict (provider, provider_id) do nothing;

insert into profiles (id, full_name, email, is_admin)
values ('00000000-0000-4000-a000-000000000004', 'Maya Shalev', 'couple@kululu.test', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- The event, and its real outreach plan
--
-- Deleting cascades to guests, schedules, deliveries, attempts, interactions
-- and rounds, which is what makes the file re-runnable. A wedding with a date
-- makes seed_schedules_on_event_ready write the true default plan, so the
-- timeline around the sent rows is exactly what a real event shows. Paid, so
-- the unsent rows are active rather than 'disabled'.
--
-- event_date is a calendar date pinned at 00:00 UTC. Fourteen days out puts the
-- save the date (-30) and the first confirmation (-21) in the past and the
-- follow-up (-14) today.
-- ---------------------------------------------------------------------------

delete from events where id = '00000000-0000-4000-b000-000000000010';

insert into events (id, user_id, title, event_date, status, event_type_id, billing_status)
select '00000000-0000-4000-b000-000000000010', '00000000-0000-4000-a000-000000000004',
       'Maya & Itai wedding',
       ((now() at time zone 'Asia/Jerusalem')::date + 14)::timestamp at time zone 'UTC',
       'published', et.id, 'paid'
from event_types et
where et.key = 'wedding';

-- A stable pseudo-random fraction in [0, 1) per guest and purpose, so the
-- showcase has texture without changing between runs.
create or replace function pg_temp.h(n integer, salt integer)
returns double precision
language sql
immutable
as $$ select ((n::bigint * 2654435761 + salt::bigint * 40503) % 10007)::double precision / 10007 $$;

-- ---------------------------------------------------------------------------
-- Claim the sent rows
--
-- A sent row cannot be produced by updating the seeded one: set_schedule_sent_at
-- overwrites sent_at with now(), and a message row is frozen the moment it is
-- sent. So each claimed row is deleted and re-inserted as sent, with a fixed id
-- and the send time the story needs, carrying its type, template and audience.
-- ---------------------------------------------------------------------------

drop table if exists _s;
create temp table _s (
  k           integer primary key,  -- 0 save the date, 1 confirmation, 2 follow-up, 3 call plan
  type_key    text not null,
  nth         integer not null,     -- which of the event's rows of that type, by due time
  id          uuid not null,
  sent_at     timestamptz,
  template_id uuid
);

insert into _s (k, type_key, nth, id)
values
  (0, 'initial_invitation', 1, '00000000-0000-4000-8d10-000000000001'),
  (1, 'confirmation',       1, '00000000-0000-4000-8d10-000000000002'),
  (2, 'confirmation',       2, '00000000-0000-4000-8d10-000000000003'),
  (3, 'phone_call',         1, '00000000-0000-4000-8d10-000000000004');

drop table if exists _seeded;
create temp table _seeded as
select s.*,
       st.key as type_key,
       row_number() over (partition by s.schedule_type_id order by s.scheduled_date) as nth
from schedules s
join schedule_types st on st.id = s.schedule_type_id
where s.event_id = '00000000-0000-4000-b000-000000000010';

-- Sent on time, except the follow-up (90 minutes ago, so it is live whatever the
-- hour) and the call plan, which the Owner started early half an hour ago.
update _s
   set template_id = sd.template_id,
       sent_at = case _s.k
                   when 2 then now() - interval '90 minutes'
                   when 3 then now() - interval '30 minutes'
                   else sd.scheduled_date
                 end
  from _seeded sd
 where sd.type_key = _s.type_key and sd.nth = _s.nth;

delete from schedules
 where id in (select sd.id from _seeded sd join _s using (type_key, nth));

insert into schedules (id, event_id, schedule_type_id, template_id, scheduled_date, target_status, status, sent_at, dispatched_at, custom_text)
select _s.id, sd.event_id, sd.schedule_type_id, sd.template_id,
       case when _s.k in (2, 3) then _s.sent_at else sd.scheduled_date end,
       sd.target_status, 'sent', _s.sent_at, _s.sent_at, sd.custom_text
from _s
join _seeded sd using (type_key, nth);

-- ---------------------------------------------------------------------------
-- Guests
--
-- 120 records sent to, plus one added after the confirmation went out who
-- answered through a shared link - the "no Delivery" row (backlog 0007).
-- `amount` runs 1-5 so confirmed records and confirmed people differ visibly.
-- A few names are long, and one is Latin, to test truncation and direction.
--
-- Traits that belong to the guest, not to one send:
--   no_phone      3 records, never sendable, 'not_sent' on every schedule
--   off_whatsapp  6 records WhatsApp rejects (131026); an SMS Fallback reaches them
--   sms_dead      2 of those, whose SMS fails too
-- ---------------------------------------------------------------------------

drop table if exists _g;
create temp table _g as
select
  ('00000000-0000-4000-8c10-' || lpad(rn::text, 12, '0'))::uuid as id,
  rn,
  -- The answer percentile, scrambled against name order so answers do not
  -- cluster alphabetically.
  (rn * 37) % 100 as b,
  (array[1, 2, 2, 2, 3, 4, 1, 2, 5, 2])[1 + rn % 10] as amount,
  rn = 121 as late_add,
  rn % 40 = 17 as no_phone,
  rn % 20 = 9 as off_whatsapp,
  rn % 60 = 49 as sms_dead,
  case rn
    when 1 then 'אברהם ושרה בן-דוד אלמוג והילדים הקטנים'
    when 2 then 'Jonathan & Rebecca Goldstein-Weiss'
    when 3 then 'סבתא רחל (אמא של אבא של מאיה)'
    when 121 then 'עומר גל (הצטרף מאוחר)'
    else (array['נועה','איתי','יעל','עומר','שירה','דניאל','מיכל','אורי','תמר','אלון',
                'רוני','גיל','הדר','עידו','ליאת','יונתן','מאיה','אביב','נטע','רועי',
                'ענבל','ניר','קרן','תומר','אפרת','אסף','שני','עמית','דנה','יואב'])[1 + rn % 30]
         || ' ' ||
         (array['כהן','לוי','מזרחי','פרץ','ביטון','אברהם','פרידמן','אזולאי','דהן','אוחיון',
                'שפירא','גבאי','חדד','עמר','בן חיים','קליין','רוזנברג','שלום','יוסף','נחום'])[1 + (rn * 7) % 20]
  end as name,
  null::text as answer,           -- 'confirm' / 'decline' / null
  null::integer as answered_on,   -- the _s.k the answer landed on
  null::text as channel,          -- 'page' / 'whatsapp' (RsvpChannel)
  null::timestamptz as answer_at,
  '{}'::jsonb as meals
from generate_series(1, 121) rn;

update _g set
  answer = case
             when no_phone or sms_dead then null
             when late_add then 'confirm'
             when b < 52 then 'confirm'
             when b < 66 then 'decline'
           end,
  -- Most answer the first confirmation; the rest answer the follow-up.
  answered_on = case when late_add or b < 40 or (b >= 52 and b < 62) then 1 else 2 end,
  -- SMS reaches only a page, never a quick reply.
  channel = case when late_add or off_whatsapp or b % 3 <> 0 then 'page' else 'whatsapp' end;

-- Still on its way on the follow-up, so cannot have answered it.
update _g set answer = null
 where answered_on = 2 and rn % 7 = 2 and not off_whatsapp and not no_phone;

update _g set answered_on = null where answer is null;

-- Answers cluster early: the first confirmation's over three days with most in
-- the first hours, the follow-up's inside its 90 minutes. A guest reached by SMS
-- can only answer once the fallback has gone out, ten minutes after the failure.
update _g set answer_at = case
    when late_add then s.sent_at + interval '50 hours'
    when answered_on = 1 then s.sent_at + interval '5 minutes' + power(pg_temp.h(rn, 21), 2.5) * interval '72 hours'
    else s.sent_at + interval '4 minutes' + pg_temp.h(rn, 22) * interval '82 minutes'
  end
  from _s s
 where s.k = _g.answered_on;

update _g g set answer_at = greatest(answer_at, s.sent_at + interval '16 minutes' + make_interval(secs => rn))
  from _s s
 where s.k = g.answered_on and g.off_whatsapp;

-- DB meal keys (is_valid_meal_counts), not the i18n catalog's.
update _g set meals = jsonb_strip_nulls(jsonb_build_object(
    'vegetarian',      case when b % 5 = 0 then 1 end,
    'vegan',           case when b % 11 = 0 then 1 end,
    'gluten_free',     case when b % 13 = 0 then 1 end,
    'strictly_kosher', case when b % 17 = 0 and b % 5 <> 0 then amount end
  ))
 where answer = 'confirm';

insert into guests (id, event_id, name, phone_number, amount, side, rsvp_status, created_at)
select id, '00000000-0000-4000-b000-000000000010', name,
       case when no_phone then null else '+97254' || lpad(rn::text, 7, '0') end,
       amount,
       case when rn % 2 = 0 then 'bride' else 'groom' end,
       'pending',
       case when late_add then (select sent_at from _s where k = 1) + interval '1 day'
            else now() - interval '40 days' end
from _g;

-- ---------------------------------------------------------------------------
-- What each message did, per guest
--
-- The save the date and the first confirmation went to everyone (target null);
-- the follow-up went to whoever had not answered the first one. On top of the
-- guest-level traits:
--   save the date  4 guests hit a system-level failure (131000, no fallback),
--                  4 are withheld (131049) and fall back to SMS
--   follow-up      guests with rn % 7 = 2 are still on their way
-- Everyone else read it (any answer implies a read) or it was only delivered.
-- ---------------------------------------------------------------------------

drop table if exists _send;
create temp table _send as
with base as (
  select s.k, s.id as schedule_id, s.template_id, s.sent_at as schedule_sent_at,
         g.id as guest_id, g.rn, g.no_phone, g.off_whatsapp, g.sms_dead, g.channel,
         coalesce(g.answered_on = s.k, false) as answered_here,
         g.answer_at,
         s.sent_at + make_interval(secs => g.rn * 2) as sent_at,
         case s.k when 0 then 0.75 when 1 then 0.70 else 0.45 end as read_rate,
         case s.k when 0 then interval '48 hours' when 1 then interval '72 hours' else interval '80 minutes' end as read_horizon
  from _s s
  join _g g on not g.late_add
  where s.k in (0, 1)
     or (s.k = 2 and g.answered_on is distinct from 1)
),
outcome as (
  select base.*,
         case
           when no_phone then 'not_sent'
           when off_whatsapp then 'failed'
           when k = 0 and rn % 30 in (3, 13) then 'failed'
           when k = 2 and rn % 7 = 2 then 'sent'
           when answered_here then 'read'
           when pg_temp.h(rn, 10 + k) < read_rate then 'read'
           else 'delivered'
         end as wa,
         case
           when off_whatsapp then 131026
           when k = 0 and rn % 30 = 3 then 131000
           when k = 0 and rn % 30 = 13 then 131049
         end as wa_code
  from base
),
timed as (
  select outcome.*,
         case when wa = 'failed' then sent_at + make_interval(secs => 20 + pg_temp.h(rn, 40 + k) * 40) end as failed_at,
         case when wa in ('delivered', 'read') then sent_at + make_interval(secs => 3 + pg_temp.h(rn, 50 + k) * 40) end as delivered_at,
         case when wa_code in (131026, 131049) then case when sms_dead then 'failed' else 'sent' end end as sms,
         -- A page answer is opened a few minutes before it is sent in
         case when answered_here and channel = 'page'
              then answer_at - (1 + pg_temp.h(rn, 70) * 3) * interval '1 minute' end as answer_view_at
  from outcome
),
seen as (
  select timed.*,
         case when sms is not null then failed_at + interval '10 minutes' + make_interval(secs => rn) end as sms_sent_at,
         case when wa = 'read' then least(now() - interval '20 seconds', greatest(
           delivered_at + interval '20 seconds',
           case
             when answered_here and channel = 'page' then answer_view_at - (1 + pg_temp.h(rn, 71) * 5) * interval '1 minute'
             when answered_here then answer_at - (1 + pg_temp.h(rn, 72) * 4) * interval '1 minute'
             else delivered_at + power(pg_temp.h(rn, 60 + k), 3) * read_horizon
           end)) end as read_at
  from timed
)
select seen.*,
       case
         when answer_view_at is not null then answer_view_at
         -- Some who read it opened the page and did not answer
         when not answered_here and wa = 'read' and pg_temp.h(rn, 30 + k) < 0.35
           then least(now() - interval '10 seconds', read_at + (2 + pg_temp.h(rn, 32) * 20) * interval '1 minute')
         when not answered_here and sms = 'sent' and pg_temp.h(rn, 33 + k) < 0.5
           then least(now() - interval '10 seconds', sms_sent_at + (5 + pg_temp.h(rn, 34) * 30) * interval '1 minute')
       end as view_at
from seen;

-- Deliveries start pending and are rolled up from their attempts by
-- roll_up_message_delivery, the same path the webhook takes. A record with no
-- phone never gets an attempt: the send engine files it 'not_sent' directly.
insert into message_deliveries (id, schedule_id, guest_id, status, delivery_method, triggered_by, template_id, created_at)
select md5(schedule_id::text || guest_id::text)::uuid, schedule_id, guest_id,
       case when wa = 'not_sent' then 'not_sent' else 'pending' end::delivery_status,
       'whatsapp', 'scheduled', template_id, sent_at
from _send;

-- updated_at is when a failure landed: the results screen reads it as failed-at
insert into message_delivery_attempts (delivery_id, channel, status, template_id, error_code, error_message, triggered_by, sent_at, delivered_at, read_at, created_at, updated_at)
select md5(schedule_id::text || guest_id::text)::uuid, 'whatsapp', wa::delivery_status, template_id,
       wa_code,
       case wa_code
         when 131026 then 'Message undeliverable'
         when 131049 then 'This message was not delivered to maintain healthy ecosystem engagement'
         when 131000 then 'Something went wrong'
       end,
       'scheduled', sent_at, delivered_at, read_at, sent_at,
       coalesce(failed_at, read_at, delivered_at, sent_at)
from _send
where wa <> 'not_sent';

-- The SMS Fallback, one per delivery at most. SMS reports nothing past accepted.
insert into message_delivery_attempts (delivery_id, channel, status, error_message, triggered_by, sent_at, created_at, updated_at)
select md5(schedule_id::text || guest_id::text)::uuid, 'sms', sms::delivery_status,
       case when sms = 'failed' then 'Carrier rejected the message' end,
       'fallback', sms_sent_at, sms_sent_at,
       case when sms = 'failed' then sms_sent_at + interval '1 minute' else sms_sent_at end
from _send
where sms is not null;

-- ---------------------------------------------------------------------------
-- Interactions and answers
-- ---------------------------------------------------------------------------

insert into guest_interactions (guest_id, schedule_id, interaction_type, metadata, created_at)
select guest_id, schedule_id, 'view', '{}', view_at
from _send
where view_at is not null;

-- The shared-link guest opened the confirmation page without a Delivery
insert into guest_interactions (guest_id, schedule_id, interaction_type, metadata, created_at)
select g.id, s.id, 'view', '{}', g.answer_at - interval '2 minutes'
from _g g
join _s s on s.k = g.answered_on
where g.late_add;

-- Metadata as record-rsvp writes it
insert into guest_interactions (guest_id, schedule_id, interaction_type, metadata, created_at)
select g.id, s.id,
       case g.answer when 'confirm' then 'rsvp_confirm' else 'rsvp_decline' end::interaction_type,
       case g.answer
         when 'confirm' then jsonb_build_object('channel', g.channel, 'guestCount', g.amount, 'mealCounts', g.meals)
         else jsonb_build_object('channel', g.channel)
       end,
       g.answer_at
from _g g
join _s s on s.k = g.answered_on
where g.answer is not null;

update guests
   set rsvp_status = case g.answer when 'confirm' then 'confirmed' else 'declined' end::"RSVP_STATUS",
       meal_counts = g.meals,
       rsvp_changed_at = g.answer_at,
       rsvp_change_source = 'guest'
  from _g g
 where guests.id = g.id and g.answer is not null;

-- ---------------------------------------------------------------------------
-- The live call round
--
-- Started half an hour ago, so its snapshot is everyone still pending then -
-- including guests who have since answered the follow-up. Those keep a null
-- outcome forever: they were correctly skipped. Of the rest, some were called
-- and most are still waiting. No outcome for a record with no phone.
-- ---------------------------------------------------------------------------

insert into call_rounds (id, event_id, schedule_id, round_number, started_by, created_at, completed_at)
select '00000000-0000-4000-8e10-000000000001', '00000000-0000-4000-b000-000000000010',
       id, null, '00000000-0000-4000-a000-000000000004', sent_at, null
from _s
where k = 3;

drop table if exists _calls;
create temp table _calls as
select g.id as guest_id,
       case
         when g.answer is not null or g.no_phone then null
         when pg_temp.h(g.rn, 80) < 0.28 then 'no_answer'
         when pg_temp.h(g.rn, 80) < 0.38 then 'guest_will_update'
         when pg_temp.h(g.rn, 80) < 0.48 then 'confirmed'
         when pg_temp.h(g.rn, 80) < 0.53 then 'declined'
       end::call_outcome as outcome,
       s.sent_at + (2 + pg_temp.h(g.rn, 81) * 26) * interval '1 minute' as called_at,
       g.rn
from _g g
cross join _s s
where s.k = 3
  and not g.late_add
  and (g.answer is null or (g.answered_on = 2 and g.answer_at > s.sent_at));

insert into call_logs (round_id, guest_id, outcome, notes, called_by, called_at)
select '00000000-0000-4000-8e10-000000000001', guest_id, outcome,
       case
         when outcome = 'no_answer' and rn % 3 = 0 then 'ביקשו לחזור אליהם בערב'
         when outcome = 'guest_will_update' then 'יעדכנו אחרי שיבדקו עם הבייביסיטר'
       end,
       case when outcome is not null then '00000000-0000-4000-a000-000000000004'::uuid end,
       case when outcome is not null then called_at end
from _calls;

update guests
   set rsvp_status = case c.outcome when 'confirmed' then 'confirmed' else 'declined' end::"RSVP_STATUS",
       rsvp_changed_at = c.called_at,
       rsvp_change_source = 'admin_call',
       rsvp_changed_by = '00000000-0000-4000-a000-000000000004',
       rsvp_changed_by_name = 'Maya Shalev'
  from _calls c
 where guests.id = c.guest_id and c.outcome in ('confirmed', 'declined');

-- ---------------------------------------------------------------------------
-- Guard: every state the screens have to render actually landed
-- ---------------------------------------------------------------------------

do $$
declare
  v_missing text;
begin
  with d as (
    select s.id as schedule_id, md.status::text as status, md.delivery_method,
           exists (select 1 from message_delivery_attempts a
                   where a.delivery_id = md.id and a.triggered_by = 'fallback') as fell_back
    from message_deliveries md
    join schedules s on s.id = md.schedule_id
    where s.event_id = '00000000-0000-4000-b000-000000000010'
  ),
  checks(label, ok) as (
    values
      ('seen',                exists (select 1 from d where status = 'read')),
      ('delivered, not seen', exists (select 1 from d where status = 'delivered')),
      ('reached by SMS fallback', exists (select 1 from d where delivery_method = 'sms' and status = 'sent' and fell_back)),
      ('not delivered (WhatsApp)', exists (select 1 from d where delivery_method = 'whatsapp' and status = 'failed')),
      ('not delivered (SMS)', exists (select 1 from d where delivery_method = 'sms' and status = 'failed')),
      ('no phone',            exists (select 1 from d where status = 'not_sent')),
      ('on its way (live follow-up)', exists (select 1 from d where schedule_id = '00000000-0000-4000-8d10-000000000003'
                                                                and delivery_method = 'whatsapp' and status = 'sent')),
      ('settled send with nothing on its way', not exists (select 1 from d where schedule_id = '00000000-0000-4000-8d10-000000000002'
                                                                            and delivery_method = 'whatsapp' and status = 'sent')),
      ('confirmed and declined answers', (select count(distinct interaction_type) from guest_interactions gi
                                          join guests g on g.id = gi.guest_id
                                          where g.event_id = '00000000-0000-4000-b000-000000000010'
                                            and gi.interaction_type in ('rsvp_confirm', 'rsvp_decline')) = 2),
      ('shared-link guest', exists (select 1 from guest_interactions gi
                                    where gi.guest_id = '00000000-0000-4000-8c10-000000000121'
                                      and not exists (select 1 from message_deliveries md where md.guest_id = gi.guest_id))),
      ('called and uncalled round logs', (select count(*) filter (where outcome is null) > 0
                                             and count(*) filter (where outcome is not null) > 0
                                          from call_logs where round_id = '00000000-0000-4000-8e10-000000000001'))
  )
  select string_agg(label, ', ') into v_missing from checks where not ok;

  if v_missing is not null then
    raise exception 'schedule results showcase is missing: %', v_missing;
  end if;
end;
$$;

commit;

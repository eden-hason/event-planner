-- Schedules catalog refactor (clean break):
-- 1. New catalog tables: event_types, schedule_types, message_templates,
--    event_type_default_schedules.
-- 2. Seed catalogs from the previously hardcoded TS configs
--    (WHATSAPP_TEMPLATES, DEFAULT_SCHEDULES_BY_EVENT_TYPE, SMS bodies).
-- 3. Backfill events.event_type_id, schedules.schedule_type_id and
--    schedules.template_id, then drop the replaced columns.
-- 4. Drop orphaned enums left over from earlier iterations.

-- =====================================================
-- 1. CATALOG TABLES
-- =====================================================

create table public.event_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedule_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  channel delivery_method not null,
  schedule_type_id uuid not null references public.schedule_types (id),
  variant text not null default 'casual',
  name text not null,
  description text,
  language_code text not null default 'he',
  whatsapp_template_name text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, channel),
  constraint whatsapp_template_name_required
    check (channel <> 'whatsapp' or whatsapp_template_name is not null)
);

create index message_templates_schedule_type_id_idx
  on public.message_templates (schedule_type_id);

create table public.event_type_default_schedules (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid not null references public.event_types (id) on delete cascade,
  schedule_type_id uuid not null references public.schedule_types (id),
  template_id uuid not null references public.message_templates (id),
  days_offset int not null,
  default_time time not null default '10:00',
  target_status text check (target_status in ('pending', 'confirmed')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index event_type_default_schedules_event_type_id_idx
  on public.event_type_default_schedules (event_type_id);
create index event_type_default_schedules_schedule_type_id_idx
  on public.event_type_default_schedules (schedule_type_id);
create index event_type_default_schedules_template_id_idx
  on public.event_type_default_schedules (template_id);

-- updated_at triggers (repo convention)
create trigger update_event_types_updated_at
  before update on public.event_types
  for each row execute function public.update_updated_at_column();
create trigger update_schedule_types_updated_at
  before update on public.schedule_types
  for each row execute function public.update_updated_at_column();
create trigger update_message_templates_updated_at
  before update on public.message_templates
  for each row execute function public.update_updated_at_column();
create trigger update_event_type_default_schedules_updated_at
  before update on public.event_type_default_schedules
  for each row execute function public.update_updated_at_column();

-- =====================================================
-- 2. RLS: read for authenticated, write for admins
-- =====================================================

alter table public.event_types enable row level security;
alter table public.schedule_types enable row level security;
alter table public.message_templates enable row level security;
alter table public.event_type_default_schedules enable row level security;

create policy "Authenticated users can read event_types"
  on public.event_types for select to authenticated using (true);
create policy "Authenticated users can read schedule_types"
  on public.schedule_types for select to authenticated using (true);
create policy "Authenticated users can read message_templates"
  on public.message_templates for select to authenticated using (true);
create policy "Authenticated users can read event_type_default_schedules"
  on public.event_type_default_schedules for select to authenticated using (true);

create policy "Admins can manage event_types"
  on public.event_types for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
create policy "Admins can manage schedule_types"
  on public.schedule_types for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
create policy "Admins can manage message_templates"
  on public.message_templates for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
create policy "Admins can manage event_type_default_schedules"
  on public.event_type_default_schedules for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- =====================================================
-- 3. SEED: schedule types + event types
-- =====================================================

insert into public.schedule_types (key, name, sort_order) values
  ('initial_invitation', 'Initial Invitation', 1),
  ('confirmation', 'Confirmation', 2),
  ('event_reminder', 'Event Reminder', 3),
  ('post_event', 'Thank You', 4);

insert into public.event_types (key, name) values
  ('wedding', 'Wedding'),
  ('henna', 'Henna'),
  ('bar_mitzva', 'Bar Mitzva'),
  ('bat_mitzva', 'Bat Mitzva');

-- =====================================================
-- 4. SEED: message templates (from WHATSAPP_TEMPLATES + SMS bodies)
-- =====================================================

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code, whatsapp_template_name, payload)
values
(
  'invitation_casual', 'whatsapp',
  (select id from public.schedule_types where key = 'initial_invitation'),
  'casual', 'Invitation - Casual',
  $txt$Initial wedding invitation sent to guests with the couple's image. Includes bride and groom names.$txt$,
  'he', 'invitation_casual',
  $json$
{
  "bodyText": "אורחים יקרים,\nשמחים להזמין אתכם לחתונתנו  🎉\nמצורפת ההזמנה עם כל הפרטים – נשמח לראותכם!\n{{1}} ו{{2}} 👰🏻‍♀️🤵🏻",
  "headerType": "IMAGE",
  "headerText": null,
  "footerText": null,
  "parameters": {
    "headerPlaceholders": [
      {
        "type": "image",
        "source": "event.invitations.imageUrl"
      }
    ],
    "placeholders": [
      {
        "name": "bride_name",
        "source": "event.hostDetails.bride.name",
        "transformer": "none"
      },
      {
        "name": "groom_name",
        "source": "event.hostDetails.groom.name",
        "transformer": "none"
      }
    ],
    "buttonPlaceholders": []
  }
}
  $json$::jsonb
),
(
  'confirmation_casual_v1_he', 'whatsapp',
  (select id from public.schedule_types where key = 'confirmation'),
  'casual', 'RSVP Confirmation - Casual',
  'Wedding invitation with RSVP button',
  'he', 'confirmation_initial_with_header_casual',
  $json$
{
  "bodyText": "היי אורחים יקרים\nהחתונה של {{1}} ו{{2}} מתקרבת, נשמח לדעת אם תגיעו.\n\n📅 {{3}}\n📍 {{4}}\n\nמחכים לחגוג איתכם ❤️\nלאישור הגעה, לחצו על הכפתור 👇🏼",
  "headerType": "IMAGE",
  "headerText": null,
  "footerText": null,
  "parameters": {
    "headerPlaceholders": [
      {
        "type": "image",
        "source": "event.invitations.imageUrl"
      }
    ],
    "placeholders": [
      {
        "name": "host.bride.name",
        "source": "event.hostDetails.bride.name",
        "transformer": "none"
      },
      {
        "name": "host.groom.name",
        "source": "event.hostDetails.groom.name",
        "transformer": "none"
      },
      {
        "name": "event.eventDate",
        "source": "event.eventDate",
        "transformer": "formatDate",
        "transformerOptions": {
          "format": "long",
          "locale": "he-IL"
        }
      },
      {
        "name": "event.venueName",
        "source": "event.location.name",
        "transformer": "none"
      }
    ],
    "buttonPlaceholders": [
      {
        "index": 0,
        "subType": "url",
        "text": "אישור הגעה",
        "placeholders": [
          {
            "source": "confirmationToken",
            "transformer": "none"
          }
        ]
      }
    ]
  }
}
  $json$::jsonb
),
(
  'confirmation_casual_v1_he', 'sms',
  (select id from public.schedule_types where key = 'confirmation'),
  'casual', 'RSVP Confirmation - Casual (SMS)',
  'SMS variant of the RSVP confirmation message with an RSVP link',
  'he', null,
  $json$
{
  "bodyText": "היי אורחים יקרים\nהחתונה של {{1}} ו{{2}} מתקרבת, נשמח לדעת אם תגיעו.\n\n📅 {{3}}\n📍 {{4}}\n\nמחכים לחגוג איתכם ❤️\nלאישור הגעה, לחצו על הקישור 👇🏼\n{{5}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "host.bride.name",
        "source": "event.hostDetails.bride.name",
        "transformer": "none"
      },
      {
        "name": "host.groom.name",
        "source": "event.hostDetails.groom.name",
        "transformer": "none"
      },
      {
        "name": "event.eventDate",
        "source": "event.eventDate",
        "transformer": "formatDate",
        "transformerOptions": {
          "format": "long",
          "locale": "he-IL"
        }
      },
      {
        "name": "event.venueName",
        "source": "event.location.name",
        "transformer": "none"
      },
      {
        "name": "confirmationLink",
        "source": "confirmationToken",
        "transformer": "rsvpUrl"
      }
    ],
    "buttonPlaceholders": []
  }
}
  $json$::jsonb
),
(
  'follow_up_confirmation_casual', 'whatsapp',
  (select id from public.schedule_types where key = 'confirmation'),
  'casual', 'RSVP Follow-up - Casual',
  'Follow-up RSVP reminder for guests who have not yet confirmed (no header image)',
  'he', 'follow_up_confirmation_casual',
  $json$
{
  "bodyText": "היי אורחים יקרים \nאם עדיין לא הספקתם לאשר הגעה לחתונה של {{1}} ו{{2}}, נשמח לעדכון קצר דרך הכפתור המצורף.\n\n📅 {{3}} \n📍 {{4}}\n\nתודה, זה ממש עוזר לנו להיערך כמו שצריך 🙏🏼",
  "headerType": null,
  "headerText": null,
  "footerText": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "host.bride.name",
        "source": "event.hostDetails.bride.name",
        "transformer": "none"
      },
      {
        "name": "host.groom.name",
        "source": "event.hostDetails.groom.name",
        "transformer": "none"
      },
      {
        "name": "event.eventDate",
        "source": "event.eventDate",
        "transformer": "formatDate",
        "transformerOptions": {
          "format": "long",
          "locale": "he-IL"
        }
      },
      {
        "name": "event.venueName",
        "source": "event.location.name",
        "transformer": "none"
      }
    ],
    "buttonPlaceholders": [
      {
        "index": 0,
        "subType": "url",
        "text": "אישור הגעה",
        "placeholders": [
          {
            "source": "confirmationToken",
            "transformer": "none"
          }
        ]
      }
    ]
  }
}
  $json$::jsonb
),
(
  'thank_you_v1_he', 'whatsapp',
  (select id from public.schedule_types where key = 'post_event'),
  'casual', 'Thank You',
  'Post-event thank you message sent to guests who attended the wedding',
  'he', 'thank_you_v1_he',
  $json$
{
  "bodyText": "רצינו להגיד תודה ענקית שהגעת לחתונתנו 🙏🏼\nשמחנו מאוד שחלקת איתנו את הרגע!\n{{1}} ו{{2}} ❤️",
  "headerType": null,
  "headerText": null,
  "footerText": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "host.bride.name",
        "source": "event.hostDetails.bride.name",
        "transformer": "none"
      },
      {
        "name": "host.groom.name",
        "source": "event.hostDetails.groom.name",
        "transformer": "none"
      }
    ],
    "buttonPlaceholders": []
  }
}
  $json$::jsonb
),
(
  'event_reminder_casual', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  'casual', 'Event Reminder - Casual',
  'Day-of wedding reminder with Waze navigation and Bit gift buttons',
  'he', 'event_reminder_casual',
  $json$
{
  "bodyText": "היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n🕒 {{4}}\n\nמחכים לראותכם 🎉",
  "headerType": null,
  "headerText": null,
  "footerText": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "host.bride.name",
        "source": "event.hostDetails.bride.name",
        "transformer": "none"
      },
      {
        "name": "host.groom.name",
        "source": "event.hostDetails.groom.name",
        "transformer": "none"
      },
      {
        "name": "event.venueName",
        "source": "event.location.name",
        "transformer": "none"
      },
      {
        "name": "event.receptionTime",
        "source": "event.receptionTime",
        "transformer": "none"
      }
    ],
    "buttonPlaceholders": [
      {
        "index": 0,
        "subType": "url",
        "text": "ניווט לאירוע",
        "placeholders": [
          {
            "source": "event.location.name",
            "transformer": "wazeNavQuery"
          }
        ]
      },
      {
        "index": 1,
        "subType": "url",
        "text": "מתנה בביט",
        "placeholders": [
          {
            "source": "event.eventSettings.bitConfig.phoneNumber",
            "transformer": "none"
          }
        ]
      }
    ]
  }
}
  $json$::jsonb
),
(
  'event_reminder_casual', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  'casual', 'Event Reminder - Casual (SMS)',
  'SMS variant of the day-of reminder with a navigation link',
  'he', null,
  $json$
{
  "bodyText": "היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n‏🕒 {{4}}\n\nמחכים לראותכם 🎉\nלניווט לאירוע, לחצו על הקישור 👇🏼\n{{5}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "host.bride.name",
        "source": "event.hostDetails.bride.name",
        "transformer": "none"
      },
      {
        "name": "host.groom.name",
        "source": "event.hostDetails.groom.name",
        "transformer": "none"
      },
      {
        "name": "event.venueName",
        "source": "event.location.name",
        "transformer": "none"
      },
      {
        "name": "event.receptionTime",
        "source": "event.receptionTime",
        "transformer": "none"
      },
      {
        "name": "event.navShortUrl",
        "source": "event.shortCode",
        "transformer": "navShortUrl"
      }
    ],
    "buttonPlaceholders": []
  }
}
  $json$::jsonb
),
(
  'thank_you_sms_v1_he', 'sms',
  (select id from public.schedule_types where key = 'post_event'),
  'casual', 'Thank You (SMS)',
  'Post-event thank you message sent via SMS',
  'he', null,
  $json$
{
  "bodyText": "היי אורחים יקרים\nתודה שהגעתם לשמוח איתנו ביום המרגש שלנו \n\nאוהבים ומעריכים {{1}} ו{{2}} ❤️",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "host.bride.name",
        "source": "event.hostDetails.bride.name",
        "transformer": "none"
      },
      {
        "name": "host.groom.name",
        "source": "event.hostDetails.groom.name",
        "transformer": "none"
      }
    ],
    "buttonPlaceholders": []
  }
}
  $json$::jsonb
),
(
  'event_reminder_wartime', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  'wartime', 'Event Reminder - Wartime (SMS)',
  'Day-of reminder acknowledging the security situation, with shelter info and navigation link',
  'he', null,
  $json$
{
  "bodyText": "היי אורחים יקרים\nלמרות המצב הרגיש - תזכורת לחתונה של {{1}} ו{{2}} המתקיימת הערב\n\n📍{{3}}\n🕒 {{4}}\n\nהאולם פועל בהתאם להנחיות פיקוד העורף וישנו מרחב מוגן תקני במקום\n\nנשמח לראותכם ❤️\nלניווט לאירוע - לחצו על הקישור\n{{5}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "host.bride.name",
        "source": "event.hostDetails.bride.name",
        "transformer": "none"
      },
      {
        "name": "host.groom.name",
        "source": "event.hostDetails.groom.name",
        "transformer": "none"
      },
      {
        "name": "event.venueName",
        "source": "event.location.name",
        "transformer": "none"
      },
      {
        "name": "event.receptionTime",
        "source": "event.receptionTime",
        "transformer": "none"
      },
      {
        "name": "event.navShortUrl",
        "source": "event.shortCode",
        "transformer": "navShortUrl"
      }
    ],
    "buttonPlaceholders": []
  }
}
  $json$::jsonb
);

-- =====================================================
-- 5. SEED: wedding default schedules
--    (from DEFAULT_SCHEDULES_BY_EVENT_TYPE.wedding)
-- =====================================================

insert into public.event_type_default_schedules
  (event_type_id, schedule_type_id, template_id, days_offset, default_time, target_status, sort_order)
select
  (select id from public.event_types where key = 'wedding'),
  st.id,
  mt.id,
  d.days_offset,
  d.default_time::time,
  d.target_status,
  d.sort_order
from (values
  ('initial_invitation', 'invitation_casual',             'whatsapp', -30, '10:00', 'pending',   1),
  ('confirmation',       'confirmation_casual_v1_he',     'whatsapp', -21, '10:00', 'pending',   2),
  ('confirmation',       'follow_up_confirmation_casual', 'whatsapp', -14, '10:00', 'pending',   3),
  ('event_reminder',     'event_reminder_casual',         'whatsapp',   0, '10:00', 'confirmed', 4),
  ('post_event',         'thank_you_v1_he',               'whatsapp',   1, '10:00', 'confirmed', 5)
) as d(schedule_type_key, template_key, channel, days_offset, default_time, target_status, sort_order)
join public.schedule_types st on st.key = d.schedule_type_key
join public.message_templates mt
  on mt.key = d.template_key and mt.channel = d.channel::delivery_method;

-- =====================================================
-- 6. BACKFILL: events.event_type_id
-- =====================================================

alter table public.events
  add column event_type_id uuid references public.event_types (id);

update public.events e
set event_type_id = et.id
from public.event_types et
where et.key = e.event_type;

create index events_event_type_id_idx on public.events (event_type_id);

alter table public.events drop column event_type;

-- =====================================================
-- 7. BACKFILL: schedules.schedule_type_id + template_id
-- =====================================================

alter table public.schedules
  add column schedule_type_id uuid references public.schedule_types (id),
  add column template_id uuid references public.message_templates (id);

update public.schedules s
set schedule_type_id = st.id
from public.schedule_types st
where st.key = s.action_type::text;

update public.schedules s
set template_id = mt.id
from public.message_templates mt
where mt.key = s.template_key
  and mt.channel = s.delivery_method;

-- Guard: template_key is free text with no FK, so a stale/renamed key
-- (e.g. a template retired in code without a companion data migration -
-- see the 2026-05-30 event_reminder_v1_he -> event_reminder_casual rename)
-- would otherwise backfill to a silent null right before template_key
-- itself is dropped below, permanently losing the ability to diagnose it.
-- Rows with a null template_key are legitimately templateless and are not
-- flagged here.
do $$
declare
  v_unmatched int;
begin
  select count(*) into v_unmatched
  from public.schedules
  where template_key is not null and template_id is null;

  if v_unmatched > 0 then
    raise exception
      'schedules_catalog_refactor: % schedule(s) have a template_key with no matching (key, channel) in message_templates. Add a legacy alias to the backfill join above before re-running.',
      v_unmatched;
  end if;
end $$;

alter table public.schedules alter column schedule_type_id set not null;

create index schedules_schedule_type_id_idx on public.schedules (schedule_type_id);
create index schedules_template_id_idx on public.schedules (template_id);

alter table public.schedules
  drop column action_type,
  drop column template_key,
  drop column delivery_method;

-- =====================================================
-- 8. DROP orphaned enums (verified unbound to any column)
-- =====================================================

drop type public.schedule_action_type;
drop type if exists public.schedule_type_enum;
drop type if exists public.trigger_strategy_enum;
drop type if exists public.schedule_status_enum;
drop type if exists public.message_type;
drop type if exists public.cta_type;

-- =====================================================
-- 9. DROP seed_sandbox_data
--    Wrote to columns this migration removes (events.event_type,
--    schedules.action_type/template_key/delivery_method) using legacy
--    template keys that predate the catalog. Demo/QA seeding, not used by
--    app code; retiring rather than porting it forward.
-- =====================================================

drop function if exists public.seed_sandbox_data(uuid);

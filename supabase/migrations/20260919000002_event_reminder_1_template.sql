-- event_reminder_1: the Event Reminder for every event type.
--
-- Replaces wedding_event_reminder_1 (20260913000000) as the default, the way
-- confirmation_1 replaced the wedding-only Confirmation. Same naming rule:
-- no event-type prefix means "fits every type".
--
-- Generic copy: the wedding family opened "תזכורת לחתונה של {{1}} ו{{2}}
-- שמתקיימת היום", which fixes both the occasion and the verb's gender. Here the
-- whole opening line is one placeholder, event.todayLine - "החתונה של נועה
-- ודורון מתקיימת היום" / "בר המצווה של רועי מתקיים היום" - for the same reason
-- the Confirmation follow-up uses event.approachingLine: the verb agrees with
-- the occasion, which no fixed text around an Occasion Phrase can do. It is
-- null exactly when the Occasion Phrase is, and such a send fails with a
-- reason (missingOccasionPhrase) rather than going out half-written.
--
-- Details stay one placeholder per fact (venue, time, table). Folding them into
-- a single "details" placeholder was considered and rejected: Meta refuses a
-- body parameter containing a line break (error 132018), so one placeholder
-- means one run-on line. Keeping them apart keeps the table-numbers axis.
--
-- Buttons, both URL buttons with event.shortCode as the dynamic suffix:
--   0. "ניווט לאירוע" - always. Registered in Meta with base https://<site>/nav/,
--      so it opens Waze directly instead of stopping at the /r/ page first.
--   1. "שליחת מתנה" - only on the _gift rows, chosen when gifting is
--      configured. Registered with base https://<site>/r/, the page that
--      lists the configured Bit / PayBox links.
-- Gifting is therefore a button-count axis rather than a label axis.
--
-- The organiser's note keeps its axis (schedules.custom_text). On WhatsApp it
-- goes through the singleLine transformer, because a note typed across several
-- lines would otherwise be rejected by Meta (132018).
--
-- Grid: table-numbers x note x gifting = 8 WhatsApp rows, each its own Meta
-- approval (Utility). SMS has no buttons, so there is no gifting axis there:
-- table-numbers x note = 4 rows, each ending in the /r/ link, which covers
-- both navigation and gifting in one line.
--
-- Rollout: new Events only. The wedding event_reminder default moves onto this
-- family, and henna / bar mitzva / bat mitzva - which had no reminder default -
-- get one, on the same day-of 10:00 slot to confirmed guests. Pending
-- Schedules on existing Events keep wedding_event_reminder_1. Push this only
-- after Meta has approved all eight WhatsApp rows.

-- 1. The family --------------------------------------------------------------

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code,
   whatsapp_template_name, requires_table_numbers, requires_gifting, requires_note,
   requires_follow_up, requires_invitation_image, payload)
values

(
  'event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1',
  'Day-of reminder, any event type. Navigation button only.',
  'he', 'event_reminder_1', false, false, false, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
            "source": "event.shortCode",
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
  'event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1, gifting button',
  'Day-of reminder, any event type. Navigation button plus a gifting button.',
  'he', 'event_reminder_1_gift', false, true, false, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
            "source": "event.shortCode",
            "transformer": "none"
          }
        ]
      },
      {
        "index": 1,
        "subType": "url",
        "text": "שליחת מתנה",
        "placeholders": [
          {
            "source": "event.shortCode",
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
  'event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1, note',
  'Day-of reminder, any event type, carrying the organiser''s note. Navigation button only.',
  'he', 'event_reminder_1_note', false, false, true, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n🗒️ {{4}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
        "name": "schedule.customText",
        "source": "schedule.customText",
        "transformer": "singleLine"
      }
    ],
    "buttonPlaceholders": [
      {
        "index": 0,
        "subType": "url",
        "text": "ניווט לאירוע",
        "placeholders": [
          {
            "source": "event.shortCode",
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
  'event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1, note, gifting button',
  'Day-of reminder, any event type, carrying the organiser''s note. Navigation button plus a gifting button.',
  'he', 'event_reminder_1_note_gift', false, true, true, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n🗒️ {{4}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
        "name": "schedule.customText",
        "source": "schedule.customText",
        "transformer": "singleLine"
      }
    ],
    "buttonPlaceholders": [
      {
        "index": 0,
        "subType": "url",
        "text": "ניווט לאירוע",
        "placeholders": [
          {
            "source": "event.shortCode",
            "transformer": "none"
          }
        ]
      },
      {
        "index": 1,
        "subType": "url",
        "text": "שליחת מתנה",
        "placeholders": [
          {
            "source": "event.shortCode",
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
  'event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1, table numbers',
  'Day-of reminder, any event type, carrying the guest''s table number. Navigation button only.',
  'he', 'event_reminder_1_tables', true, false, false, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n🪑 מספר השולחן שלכם: {{4}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
        "name": "guest.tableNumber",
        "source": "table.tableNumber",
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
            "source": "event.shortCode",
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
  'event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1, table numbers, gifting button',
  'Day-of reminder, any event type, carrying the guest''s table number. Navigation button plus a gifting button.',
  'he', 'event_reminder_1_tables_gift', true, true, false, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n🪑 מספר השולחן שלכם: {{4}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
        "name": "guest.tableNumber",
        "source": "table.tableNumber",
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
            "source": "event.shortCode",
            "transformer": "none"
          }
        ]
      },
      {
        "index": 1,
        "subType": "url",
        "text": "שליחת מתנה",
        "placeholders": [
          {
            "source": "event.shortCode",
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
  'event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1, table numbers, note',
  'Day-of reminder, any event type, carrying the guest''s table number and the organiser''s note. Navigation button only.',
  'he', 'event_reminder_1_tables_note', true, false, true, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n🪑 מספר השולחן שלכם: {{4}}\n🗒️ {{5}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
        "name": "guest.tableNumber",
        "source": "table.tableNumber",
        "transformer": "none"
      },
      {
        "name": "schedule.customText",
        "source": "schedule.customText",
        "transformer": "singleLine"
      }
    ],
    "buttonPlaceholders": [
      {
        "index": 0,
        "subType": "url",
        "text": "ניווט לאירוע",
        "placeholders": [
          {
            "source": "event.shortCode",
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
  'event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1, table numbers, note, gifting button',
  'Day-of reminder, any event type, carrying the guest''s table number and the organiser''s note. Navigation button plus a gifting button.',
  'he', 'event_reminder_1_tables_note_gift', true, true, true, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n🪑 מספר השולחן שלכם: {{4}}\n🗒️ {{5}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
        "name": "guest.tableNumber",
        "source": "table.tableNumber",
        "transformer": "none"
      },
      {
        "name": "schedule.customText",
        "source": "schedule.customText",
        "transformer": "singleLine"
      }
    ],
    "buttonPlaceholders": [
      {
        "index": 0,
        "subType": "url",
        "text": "ניווט לאירוע",
        "placeholders": [
          {
            "source": "event.shortCode",
            "transformer": "none"
          }
        ]
      },
      {
        "index": 1,
        "subType": "url",
        "text": "שליחת מתנה",
        "placeholders": [
          {
            "source": "event.shortCode",
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
  'event_reminder_1', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1 (SMS)',
  'Day-of reminder, any event type. SMS rendition, one /r/ link line.',
  'he', null, false, false, false, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 קבלת פנים - {{3}}\n\nמחכים לחגוג איתכם ❤️\nלניווט ולפרטים נוספים:\n{{4}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
        "name": "event.reminderUrl",
        "source": "event.shortCode",
        "transformer": "reminderUrl"
      }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

(
  'event_reminder_1', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1, note (SMS)',
  'Day-of reminder, any event type, carrying the organiser''s note. SMS rendition, one /r/ link line.',
  'he', null, false, false, true, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 קבלת פנים - {{3}}\n🗒️ {{4}}\n\nמחכים לחגוג איתכם ❤️\nלניווט ולפרטים נוספים:\n{{5}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
        "name": "schedule.customText",
        "source": "schedule.customText",
        "transformer": "none"
      },
      {
        "name": "event.reminderUrl",
        "source": "event.shortCode",
        "transformer": "reminderUrl"
      }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

(
  'event_reminder_1', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1, table numbers (SMS)',
  'Day-of reminder, any event type, carrying the guest''s table number. SMS rendition, one /r/ link line.',
  'he', null, true, false, false, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 קבלת פנים - {{3}}\n🪑 מספר השולחן שלכם: {{4}}\n\nמחכים לחגוג איתכם ❤️\nלניווט ולפרטים נוספים:\n{{5}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
        "name": "guest.tableNumber",
        "source": "table.tableNumber",
        "transformer": "none"
      },
      {
        "name": "event.reminderUrl",
        "source": "event.shortCode",
        "transformer": "reminderUrl"
      }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

(
  'event_reminder_1', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Event Reminder - 1, table numbers, note (SMS)',
  'Day-of reminder, any event type, carrying the guest''s table number and the organiser''s note. SMS rendition, one /r/ link line.',
  'he', null, true, false, true, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📍 {{2}}\n🕐 קבלת פנים - {{3}}\n🪑 מספר השולחן שלכם: {{4}}\n🗒️ {{5}}\n\nמחכים לחגוג איתכם ❤️\nלניווט ולפרטים נוספים:\n{{6}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.todayLine",
        "source": "event.todayLine",
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
        "name": "guest.tableNumber",
        "source": "table.tableNumber",
        "transformer": "none"
      },
      {
        "name": "schedule.customText",
        "source": "schedule.customText",
        "transformer": "none"
      },
      {
        "name": "event.reminderUrl",
        "source": "event.shortCode",
        "transformer": "reminderUrl"
      }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
);

-- 2. Defaults: every event type gets the day-of reminder on this family -------
-- The anchor's own axis flags are ignored by the resolver; the plain WhatsApp
-- row is used for readability.

update public.event_type_default_schedules eds
set template_id = (
  select id from public.message_templates
  where key = 'event_reminder_1' and channel = 'whatsapp'
    and not requires_table_numbers and not requires_gifting and not requires_note
)
where eds.event_type_id = (select id from public.event_types where key = 'wedding')
  and eds.schedule_type_id = (select id from public.schedule_types where key = 'event_reminder');

insert into public.event_type_default_schedules
  (event_type_id, schedule_type_id, template_id, days_offset, default_time, target_status, sort_order)
select
  et.id,
  (select id from public.schedule_types where key = 'event_reminder'),
  (select id from public.message_templates
   where key = 'event_reminder_1' and channel = 'whatsapp'
     and not requires_table_numbers and not requires_gifting and not requires_note),
  0,
  '10:00',
  'confirmed',
  4
from public.event_types et
where et.key in ('henna', 'bar_mitzva', 'bat_mitzva')
  and not exists (
    select 1 from public.event_type_default_schedules existing
    where existing.event_type_id = et.id
      and existing.schedule_type_id = (select id from public.schedule_types where key = 'event_reminder')
  );

-- 3. Guard -------------------------------------------------------------------
-- The whole grid landed, every row carries the placeholder count its axes
-- imply (a missing one would send a literal {{n}}), the WhatsApp names are
-- distinct, gifting rows carry exactly two URL buttons and the rest one, and
-- every event type's reminder default points here.

do $$
declare
  v_wa_rows int;
  v_sms_rows int;
  v_bad_placeholders int;
  v_wa_names int;
  v_bad_buttons int;
  v_types_without int;
begin
  select count(*) into v_wa_rows
  from public.message_templates where key = 'event_reminder_1' and channel = 'whatsapp';
  if v_wa_rows <> 8 then
    raise exception 'event_reminder_1_template: expected 8 WhatsApp rows, found %', v_wa_rows;
  end if;

  select count(*) into v_sms_rows
  from public.message_templates where key = 'event_reminder_1' and channel = 'sms';
  if v_sms_rows <> 4 then
    raise exception 'event_reminder_1_template: expected 4 SMS rows, found %', v_sms_rows;
  end if;

  select count(*) into v_bad_placeholders
  from public.message_templates
  where key = 'event_reminder_1'
    and jsonb_array_length(payload -> 'parameters' -> 'placeholders')
        <> (
          (case when channel = 'sms' then 4 else 3 end)
          + (case when requires_table_numbers then 1 else 0 end)
          + (case when requires_note then 1 else 0 end)
        );
  if v_bad_placeholders > 0 then
    raise exception 'event_reminder_1_template: % row(s) have the wrong placeholder count', v_bad_placeholders;
  end if;

  select count(distinct whatsapp_template_name) into v_wa_names
  from public.message_templates where key = 'event_reminder_1' and channel = 'whatsapp';
  if v_wa_names <> 8 then
    raise exception 'event_reminder_1_template: expected 8 distinct whatsapp template names, found %', v_wa_names;
  end if;

  select count(*) into v_bad_buttons
  from public.message_templates mt
  where mt.key = 'event_reminder_1' and mt.channel = 'whatsapp'
    and (
      select count(*) from jsonb_array_elements(mt.payload -> 'parameters' -> 'buttonPlaceholders') b
      where b ->> 'subType' = 'url'
    ) <> (case when mt.requires_gifting then 2 else 1 end);
  if v_bad_buttons > 0 then
    raise exception 'event_reminder_1_template: % WhatsApp row(s) have the wrong URL buttons', v_bad_buttons;
  end if;

  select count(*) into v_types_without
  from public.event_types et
  where et.key in ('wedding', 'henna', 'bar_mitzva', 'bat_mitzva')
    and not exists (
      select 1 from public.event_type_default_schedules eds
      join public.message_templates mt on mt.id = eds.template_id
      where eds.event_type_id = et.id
        and eds.schedule_type_id = (select id from public.schedule_types where key = 'event_reminder')
        and mt.key = 'event_reminder_1'
    );
  if v_types_without > 0 then
    raise exception 'event_reminder_1_template: % event type(s) have no event_reminder default on event_reminder_1', v_types_without;
  end if;
end $$;

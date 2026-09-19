-- thank_you_1: the post-event Thank You for every event type.
--
-- Replaces thank_you_v1_he as the default, the way event_reminder_1 replaced
-- the wedding-only reminder. Same naming rule: no event-type prefix means
-- "fits every type".
--
-- thank_you_v1_he was wedding-only three times over: its WhatsApp copy said
-- "שהגעת לחתונתנו", both channels signed off with the bride's and groom's names
-- (empty for a mitzva, which stores one child), and only weddings had a
-- post_event default at all.
--
-- Generic copy: the occasion arrives in event.occasionPhrase after a
-- preposition - "שהגעתם לחתונה של נועה ודורון" / "לבר המצווה של רועי" - which
-- is the form the Occasion Phrase is built for (no article, and no verb to
-- agree with it, so no whole-line variable is needed). It is null exactly
-- when there are no host names, and such a send fails with a reason
-- (missingOccasionPhrase) rather than going out half-written.
--
-- No names in the sign-off. A couple could sign, but a mitzva has nobody to
-- sign as: the child is not the one thanking, and host_details holds no family
-- name. The hosts are already named in the opening line.
--
-- Plural throughout ("שהגעתם"), on both channels. The old WhatsApp copy was
-- singular and its SMS plural.
--
-- Axes:
--   note    - schedules.custom_text, for the thing a thank-you usually carries
--             (a photo album link, a lost-and-found). singleLine on WhatsApp,
--             because Meta refuses a line break in a parameter (132018). It
--             sits above the closing line: Meta rejects a body that ends in a
--             variable.
--   gifting - WhatsApp: a "שליחת מתנה" URL button, base https://<site>/r/,
--             suffix event.shortCode. SMS: a closing /r/ link line. No
--             navigation button - the event is over.
--
-- Grid: note x gifting = 4 WhatsApp rows (each its own Meta approval,
-- Utility) and 4 SMS rows.
--
-- Rollout: new Events only. The wedding post_event default moves onto this
-- family, and henna / bar mitzva / bat mitzva get one on the same slot (day
-- after, 10:00, confirmed guests). Pending Schedules on existing Events keep
-- thank_you_v1_he. Push this only after Meta has approved all four WhatsApp
-- rows.

-- 1. The family --------------------------------------------------------------

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code,
   whatsapp_template_name, requires_table_numbers, requires_gifting, requires_note,
   requires_follow_up, requires_invitation_image, payload)
values
(
  'thank_you_1', 'whatsapp',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Thank You - 1',
  'Day-after thank-you, any event type.',
  'he', 'thank_you_1', false, false, false, false, false,
  $json$
{
  "bodyText": "תודה ענקית 🙏🏼\nשמחנו מאוד שהגעתם ל{{1}} וחגגתם איתנו\n\nאוהבים ומעריכים ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.occasionPhrase",
        "source": "event.occasionPhrase",
        "transformer": "none"
      }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

(
  'thank_you_1', 'whatsapp',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Thank You - 1, gifting button',
  'Day-after thank-you, any event type. Gifting button.',
  'he', 'thank_you_1_gift', false, true, false, false, false,
  $json$
{
  "bodyText": "תודה ענקית 🙏🏼\nשמחנו מאוד שהגעתם ל{{1}} וחגגתם איתנו\n\nאוהבים ומעריכים ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.occasionPhrase",
        "source": "event.occasionPhrase",
        "transformer": "none"
      }
    ],
    "buttonPlaceholders": [
      {
        "index": 0,
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
  'thank_you_1', 'whatsapp',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Thank You - 1, note',
  'Day-after thank-you, any event type. Carries the organiser''s note.',
  'he', 'thank_you_1_note', false, false, true, false, false,
  $json$
{
  "bodyText": "תודה ענקית 🙏🏼\nשמחנו מאוד שהגעתם ל{{1}} וחגגתם איתנו\n\n{{2}}\n\nאוהבים ומעריכים ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.occasionPhrase",
        "source": "event.occasionPhrase",
        "transformer": "none"
      },
      {
        "name": "schedule.customText",
        "source": "schedule.customText",
        "transformer": "singleLine"
      }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

(
  'thank_you_1', 'whatsapp',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Thank You - 1, note, gifting button',
  'Day-after thank-you, any event type. Carries the organiser''s note. Gifting button.',
  'he', 'thank_you_1_note_gift', false, true, true, false, false,
  $json$
{
  "bodyText": "תודה ענקית 🙏🏼\nשמחנו מאוד שהגעתם ל{{1}} וחגגתם איתנו\n\n{{2}}\n\nאוהבים ומעריכים ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.occasionPhrase",
        "source": "event.occasionPhrase",
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
  'thank_you_1', 'sms',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Thank You - 1 (SMS)',
  'Day-after thank-you, any event type. SMS rendition.',
  'he', null, false, false, false, false, false,
  $json$
{
  "bodyText": "תודה ענקית 🙏🏼\nשמחנו מאוד שהגעתם ל{{1}} וחגגתם איתנו\n\nאוהבים ומעריכים ❤️",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.occasionPhrase",
        "source": "event.occasionPhrase",
        "transformer": "none"
      }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

(
  'thank_you_1', 'sms',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Thank You - 1, gifting link (SMS)',
  'Day-after thank-you, any event type. Ends in the /r/ link for gifting. SMS rendition.',
  'he', null, false, true, false, false, false,
  $json$
{
  "bodyText": "תודה ענקית 🙏🏼\nשמחנו מאוד שהגעתם ל{{1}} וחגגתם איתנו\n\nאוהבים ומעריכים ❤️\nלשליחת מתנה:\n{{2}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.occasionPhrase",
        "source": "event.occasionPhrase",
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
  'thank_you_1', 'sms',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Thank You - 1, note (SMS)',
  'Day-after thank-you, any event type. Carries the organiser''s note. SMS rendition.',
  'he', null, false, false, true, false, false,
  $json$
{
  "bodyText": "תודה ענקית 🙏🏼\nשמחנו מאוד שהגעתם ל{{1}} וחגגתם איתנו\n\n{{2}}\n\nאוהבים ומעריכים ❤️",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.occasionPhrase",
        "source": "event.occasionPhrase",
        "transformer": "none"
      },
      {
        "name": "schedule.customText",
        "source": "schedule.customText",
        "transformer": "none"
      }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

(
  'thank_you_1', 'sms',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Thank You - 1, note, gifting link (SMS)',
  'Day-after thank-you, any event type. Carries the organiser''s note. Ends in the /r/ link for gifting. SMS rendition.',
  'he', null, false, true, true, false, false,
  $json$
{
  "bodyText": "תודה ענקית 🙏🏼\nשמחנו מאוד שהגעתם ל{{1}} וחגגתם איתנו\n\n{{2}}\n\nאוהבים ומעריכים ❤️\nלשליחת מתנה:\n{{3}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      {
        "name": "event.occasionPhrase",
        "source": "event.occasionPhrase",
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

-- 2. Defaults: every event type gets the day-after thank-you on this family ---
-- The anchor's own axis flags are ignored by the resolver; the plain WhatsApp
-- row is used for readability.

update public.event_type_default_schedules eds
set template_id = (
  select id from public.message_templates
  where key = 'thank_you_1' and channel = 'whatsapp'
    and not requires_gifting and not requires_note
)
where eds.event_type_id = (select id from public.event_types where key = 'wedding')
  and eds.schedule_type_id = (select id from public.schedule_types where key = 'post_event');

insert into public.event_type_default_schedules
  (event_type_id, schedule_type_id, template_id, days_offset, default_time, target_status, sort_order)
select
  et.id,
  (select id from public.schedule_types where key = 'post_event'),
  (select id from public.message_templates
   where key = 'thank_you_1' and channel = 'whatsapp'
     and not requires_gifting and not requires_note),
  1,
  '10:00',
  'confirmed',
  5
from public.event_types et
where et.key in ('henna', 'bar_mitzva', 'bat_mitzva')
  and not exists (
    select 1 from public.event_type_default_schedules existing
    where existing.event_type_id = et.id
      and existing.schedule_type_id = (select id from public.schedule_types where key = 'post_event')
  );

-- 3. Guard -------------------------------------------------------------------
-- The whole grid landed, every row carries the placeholder count its axes
-- imply (a missing one would send a literal {{n}}), the WhatsApp names are
-- distinct, gifting rows carry exactly one URL button and the rest none, and
-- every event type's post_event default points here.

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
  from public.message_templates where key = 'thank_you_1' and channel = 'whatsapp';
  if v_wa_rows <> 4 then
    raise exception 'thank_you_1_template: expected 4 WhatsApp rows, found %', v_wa_rows;
  end if;

  select count(*) into v_sms_rows
  from public.message_templates where key = 'thank_you_1' and channel = 'sms';
  if v_sms_rows <> 4 then
    raise exception 'thank_you_1_template: expected 4 SMS rows, found %', v_sms_rows;
  end if;

  select count(*) into v_bad_placeholders
  from public.message_templates
  where key = 'thank_you_1'
    and jsonb_array_length(payload -> 'parameters' -> 'placeholders')
        <> (
          1
          + (case when requires_note then 1 else 0 end)
          + (case when channel = 'sms' and requires_gifting then 1 else 0 end)
        );
  if v_bad_placeholders > 0 then
    raise exception 'thank_you_1_template: % row(s) have the wrong placeholder count', v_bad_placeholders;
  end if;

  select count(distinct whatsapp_template_name) into v_wa_names
  from public.message_templates where key = 'thank_you_1' and channel = 'whatsapp';
  if v_wa_names <> 4 then
    raise exception 'thank_you_1_template: expected 4 distinct whatsapp template names, found %', v_wa_names;
  end if;

  select count(*) into v_bad_buttons
  from public.message_templates mt
  where mt.key = 'thank_you_1' and mt.channel = 'whatsapp'
    and (
      select count(*) from jsonb_array_elements(mt.payload -> 'parameters' -> 'buttonPlaceholders') b
      where b ->> 'subType' = 'url'
    ) <> (case when mt.requires_gifting then 1 else 0 end);
  if v_bad_buttons > 0 then
    raise exception 'thank_you_1_template: % WhatsApp row(s) have the wrong URL buttons', v_bad_buttons;
  end if;

  select count(*) into v_types_without
  from public.event_types et
  where et.key in ('wedding', 'henna', 'bar_mitzva', 'bat_mitzva')
    and not exists (
      select 1 from public.event_type_default_schedules eds
      join public.message_templates mt on mt.id = eds.template_id
      where eds.event_type_id = et.id
        and eds.schedule_type_id = (select id from public.schedule_types where key = 'post_event')
        and mt.key = 'thank_you_1'
    );
  if v_types_without > 0 then
    raise exception 'thank_you_1_template: % event type(s) have no post_event default on thank_you_1', v_types_without;
  end if;
end $$;

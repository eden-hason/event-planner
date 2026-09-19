-- save_the_date_1: the first message to Guests, for every event type.
--
-- Replaces invitation_casual as the initial_invitation default, the way
-- confirmation_1, event_reminder_1 and thank_you_1 replaced their wedding-only
-- predecessors. Same naming rule: no event-type prefix means "fits every type".
-- Named after what the message is (a save-the-date) rather than the schedule
-- type, as thank_you_1 is for post_event.
--
-- invitation_casual was wedding-only twice over: "לחתונתנו" in its copy, and a
-- sign-off built from the bride's and groom's names (empty for a mitzva, which
-- stores one child). It also always carried an image header without declaring
-- requires_invitation_image, so an Event with no invitation image sent a
-- template Meta rejects.
--
-- Generic copy: the occasion arrives in event.occasionPhrase after a
-- preposition - "שמחים להזמין אתכם לחתונה של נועה ודורון" / "לבר המצווה של
-- רועי" - with no verb to agree with it, so no whole-line variable is needed.
-- Date and venue follow in the same form as confirmation_1. No names in the
-- sign-off (see thank_you_1). No RSVP, no gifting, no note - Confirmation is
-- a later Schedule's job.
--
-- One button on every WhatsApp row: "הוספה ליומן", a URL button with base
-- https://<site>/cal/ and suffix event.shortCode (the /nav/ mechanism). The
-- route serves an .ics, or a Google Calendar link on Android; see
-- src/app/cal/[code]/route.ts. It is on every row rather than an axis, since
-- every Event with a date can be added. SMS: a closing link to the
-- save-the-date page (/s/<shortCode>), which shows the invitation image, the
-- details and the same calendar button - what the SMS itself cannot carry.
--
-- Axes:
--   invitation image - resolved per Event, as in confirmation_1: an Event with
--                      an uploaded invitation image gets the image-header row,
--                      the rest the text-only row. WhatsApp only; SMS has no
--                      header.
--
-- Grid: 2 WhatsApp rows (save_the_date_1, save_the_date_1_image; each its own
-- Meta approval) and 1 SMS row.
--
-- Rollout: new Events only. The wedding initial_invitation default moves onto
-- this family, and henna / bar mitzva / bat mitzva get one on the same slot
-- (30 days before, 10:00, pending guests - ahead of the first Confirmation at
-- -21). Pending Schedules on existing Events keep invitation_casual. Push this
-- only after Meta has approved both WhatsApp rows.

-- 1. The family --------------------------------------------------------------

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code,
   whatsapp_template_name, requires_table_numbers, requires_gifting, requires_note,
   requires_follow_up, requires_invitation_image, payload)
values
(
  'save_the_date_1', 'whatsapp',
  (select id from public.schedule_types where key = 'initial_invitation'),
  '1', 'Save the Date - 1',
  'First message to Guests, any event type. Announces the date and venue.',
  'he', 'save_the_date_1', false, false, false, false, false,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\nשמחים להזמין אתכם ל{{1}} 🎉\n\n📅 {{2}}\n📍 {{3}}\n\nשמרו את התאריך 🗓️\nנשמח לראותכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "event.occasionPhrase", "source": "event.occasionPhrase", "transformer": "none" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "הוספה ליומן",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),

(
  'save_the_date_1', 'whatsapp',
  (select id from public.schedule_types where key = 'initial_invitation'),
  '1', 'Save the Date - 1, invitation image',
  'First message to Guests with the invitation image as header. Chosen when the Event has an invitation image.',
  'he', 'save_the_date_1_image', false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\nשמחים להזמין אתכם ל{{1}} 🎉\n\n📅 {{2}}\n📍 {{3}}\n\nשמרו את התאריך 🗓️\nנשמח לראותכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": "IMAGE",
  "parameters": {
    "headerPlaceholders": [{ "type": "image", "source": "event.invitations.imageUrl" }],
    "placeholders": [
      { "name": "event.occasionPhrase", "source": "event.occasionPhrase", "transformer": "none" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "הוספה ליומן",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),

(
  'save_the_date_1', 'sms',
  (select id from public.schedule_types where key = 'initial_invitation'),
  '1', 'Save the Date - 1',
  'First message to Guests, SMS rendition. Ends in the /s/ page link, which carries the image and the calendar button.',
  'he', null, false, false, false, false, false,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\nשמחים להזמין אתכם ל{{1}} 🎉\n\n📅 {{2}}\n📍 {{3}}\n\nשמרו את התאריך 🗓️\nנשמח לראותכם ❤️\nלפרטים והוספה ליומן:\n{{4}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "event.occasionPhrase", "source": "event.occasionPhrase", "transformer": "none" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.saveTheDateUrl", "source": "event.shortCode", "transformer": "saveTheDateUrl" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
);

-- 2. Defaults: every event type gets the save-the-date on this family --------
-- The anchor's own axis flags are ignored by the resolver; the text-only
-- WhatsApp row is used for readability.

update public.event_type_default_schedules eds
set template_id = (
  select id from public.message_templates
  where key = 'save_the_date_1' and channel = 'whatsapp'
    and not requires_invitation_image
)
where eds.event_type_id = (select id from public.event_types where key = 'wedding')
  and eds.schedule_type_id = (select id from public.schedule_types where key = 'initial_invitation');

insert into public.event_type_default_schedules
  (event_type_id, schedule_type_id, template_id, days_offset, default_time, target_status, sort_order)
select
  et.id,
  (select id from public.schedule_types where key = 'initial_invitation'),
  (select id from public.message_templates
   where key = 'save_the_date_1' and channel = 'whatsapp'
     and not requires_invitation_image),
  -30,
  '10:00',
  'pending',
  1
from public.event_types et
where et.key in ('henna', 'bar_mitzva', 'bat_mitzva')
  and not exists (
    select 1 from public.event_type_default_schedules existing
    where existing.event_type_id = et.id
      and existing.schedule_type_id = (select id from public.schedule_types where key = 'initial_invitation')
  );

-- 3. Guard -------------------------------------------------------------------
-- The whole grid landed, every row carries its placeholders (a missing one
-- would send a literal {{n}}), only the image row has an image header, every
-- WhatsApp row has exactly the calendar URL button, and every event type's
-- initial_invitation default points here.

do $$
declare
  v_wa_rows int;
  v_sms_rows int;
  v_bad_placeholders int;
  v_bad_headers int;
  v_bad_buttons int;
  v_types_without int;
begin
  select count(*) into v_wa_rows
  from public.message_templates where key = 'save_the_date_1' and channel = 'whatsapp';
  if v_wa_rows <> 2 then
    raise exception 'save_the_date_1_template: expected 2 WhatsApp rows, found %', v_wa_rows;
  end if;

  select count(*) into v_sms_rows
  from public.message_templates where key = 'save_the_date_1' and channel = 'sms';
  if v_sms_rows <> 1 then
    raise exception 'save_the_date_1_template: expected 1 SMS row, found %', v_sms_rows;
  end if;

  select count(*) into v_bad_placeholders
  from public.message_templates
  where key = 'save_the_date_1'
    and jsonb_array_length(payload -> 'parameters' -> 'placeholders')
        <> (case when channel = 'sms' then 4 else 3 end);
  if v_bad_placeholders > 0 then
    raise exception 'save_the_date_1_template: % row(s) have the wrong placeholder count', v_bad_placeholders;
  end if;

  select count(*) into v_bad_headers
  from public.message_templates
  where key = 'save_the_date_1'
    and jsonb_array_length(payload -> 'parameters' -> 'headerPlaceholders')
        <> (case when requires_invitation_image then 1 else 0 end);
  if v_bad_headers > 0 then
    raise exception 'save_the_date_1_template: % row(s) have the wrong image header', v_bad_headers;
  end if;

  select count(*) into v_bad_buttons
  from public.message_templates mt
  where mt.key = 'save_the_date_1'
    and (
      jsonb_array_length(mt.payload -> 'parameters' -> 'buttonPlaceholders')
        <> (case when mt.channel = 'whatsapp' then 1 else 0 end)
      or exists (
        select 1 from jsonb_array_elements(mt.payload -> 'parameters' -> 'buttonPlaceholders') b
        where b ->> 'subType' <> 'url'
      )
    );
  if v_bad_buttons > 0 then
    raise exception 'save_the_date_1_template: % row(s) have the wrong buttons', v_bad_buttons;
  end if;

  select count(*) into v_types_without
  from public.event_types et
  where et.key in ('wedding', 'henna', 'bar_mitzva', 'bat_mitzva')
    and not exists (
      select 1 from public.event_type_default_schedules eds
      join public.message_templates mt on mt.id = eds.template_id
      where eds.event_type_id = et.id
        and eds.schedule_type_id = (select id from public.schedule_types where key = 'initial_invitation')
        and mt.key = 'save_the_date_1'
    );
  if v_types_without > 0 then
    raise exception 'save_the_date_1_template: % event type(s) have no initial_invitation default on save_the_date_1', v_types_without;
  end if;
end $$;

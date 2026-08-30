-- New default RSVP follow-up template for weddings: follow_up_confirmation_v1.
--
-- The follow-up family had a single WhatsApp row (follow_up_confirmation_casual)
-- and it was the wedding default. This adds a second family, follow_up_confirmation_v1,
-- with reworked body copy, and moves the wedding default onto it. The old family
-- stays in the catalog: one wedding's follow-up runs on its SMS row, and one
-- pending WhatsApp schedule (event 8e4850a3-a2b7-4f78-9d8d-25aaa38f4da2) is left
-- on it deliberately.
--
-- `key` names a *family* (key + channel + variant + language), not a message -
-- template_id on schedules and event_type_default_schedules is an anchor into a
-- family, and the send path resolves the row from the event's current config.
-- The follow-up family offers no choice on either configuration axis, so the new
-- family is a single row with both requires_* flags false.
--
-- whatsapp_template_name must match a template already approved in Meta exactly
-- (case-sensitive). 'follow_up_confirmation_v1' is a fresh Meta registration, not
-- an edit of the approved 'follow_up_confirmation_casual' body.
--
-- Body params mirror the confirmation template (confirmation_casual_v1_he,
-- whatsapp): bride, groom, event date on the 'full' format (adds the weekday),
-- venue name. No header image. One URL button to the confirmation page, built
-- from the per-guest confirmation token exactly as the confirmation template does.

-- 1. Register the new family ------------------------------------------------------

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code,
   whatsapp_template_name, requires_table_numbers, requires_gifting, payload)
values
(
  'follow_up_confirmation_v1', 'whatsapp',
  (select id from public.schedule_types where key = 'confirmation'),
  'casual', 'RSVP Follow-up v1 - Casual',
  'Follow-up RSVP nudge for guests who have not confirmed. No header image. Wedding default.',
  'he', 'follow_up_confirmation_v1', false, false,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\nהחתונה של {{1}} ו{{2}} מתקרבת,\nנשמח לדעת אם תגיעו.\n\n📅 {{3}}\n📍 {{4}}\n\nמחכים לחגוג איתכם ❤️\nלאישור הגעה, לחצו על הכפתור 👇🏼",
  "headerType": null,
  "headerText": null,
  "footerText": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      {
        "name": "event.eventDate",
        "source": "event.eventDate",
        "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0,
        "subType": "url",
        "text": "לאישור הגעה",
        "placeholders": [
          { "source": "confirmationToken", "transformer": "none" }
        ]
      }
    ]
  }
}
  $json$::jsonb
);

-- 2. Move the wedding follow-up default onto the new family -----------------------
-- event_type_default_schedules is seeded in every environment, so this is a
-- deterministic repoint (not a no-op-if-missing data patch).

update public.event_type_default_schedules eds
set template_id = (
  select id from public.message_templates
  where key = 'follow_up_confirmation_v1' and channel = 'whatsapp'
)
where eds.event_type_id = (select id from public.event_types where key = 'wedding')
  and eds.schedule_type_id = (select id from public.schedule_types where key = 'confirmation')
  and eds.template_id = (
    select id from public.message_templates
    where key = 'follow_up_confirmation_casual' and channel = 'whatsapp'
  );

-- 3. Repoint two pending wedding follow-up schedules -----------------------------
-- No-ops where the rows do not exist (they are production data). The guard on
-- template_id keeps this from touching a schedule that was moved off the old
-- follow-up template in the meantime. Event 8e4850a3 is deliberately not here.

update public.schedules
set template_id = (
  select id from public.message_templates
  where key = 'follow_up_confirmation_v1' and channel = 'whatsapp'
)
where id in (
    '3156d96f-adc7-4bcc-b5ab-d0b704eedc18',
    '54d7c23b-9f82-4122-949c-59d02028f44a'
  )
  and template_id = (
    select id from public.message_templates
    where key = 'follow_up_confirmation_casual' and channel = 'whatsapp'
  );

-- 4. Guard ----------------------------------------------------------------------
-- Assert the catalog changes landed: the new row exists with the body params the
-- send path expects, and the wedding follow-up default now resolves to it.

do $$
declare
  v_new_id uuid;
  v_placeholders int;
  v_buttons int;
  v_default_id uuid;
begin
  select id into v_new_id
  from public.message_templates
  where key = 'follow_up_confirmation_v1' and channel = 'whatsapp';

  if v_new_id is null then
    raise exception 'add_follow_up_confirmation_v1_template: new template row was not created';
  end if;

  select
    jsonb_array_length(payload -> 'parameters' -> 'placeholders'),
    jsonb_array_length(payload -> 'parameters' -> 'buttonPlaceholders')
  into v_placeholders, v_buttons
  from public.message_templates
  where id = v_new_id;

  if v_placeholders <> 4 then
    raise exception
      'add_follow_up_confirmation_v1_template: expected 4 body placeholders, found %',
      v_placeholders;
  end if;

  if v_buttons <> 1 then
    raise exception
      'add_follow_up_confirmation_v1_template: expected 1 button placeholder, found %',
      v_buttons;
  end if;

  select template_id into v_default_id
  from public.event_type_default_schedules
  where event_type_id = (select id from public.event_types where key = 'wedding')
    and schedule_type_id = (select id from public.schedule_types where key = 'confirmation')
    and template_id = v_new_id;

  if v_default_id is null then
    raise exception
      'add_follow_up_confirmation_v1_template: wedding follow-up default was not repointed to the new template';
  end if;
end $$;

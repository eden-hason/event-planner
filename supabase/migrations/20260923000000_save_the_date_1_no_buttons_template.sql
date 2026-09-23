-- save_the_date_1_no_buttons: save_the_date_1 with the invitation image and
-- without the "הוספה ליומן" calendar button.
--
-- Same copy and the same three body variables as save_the_date_1 (occasion
-- phrase, date, venue); the only difference is that the approved Meta template
-- carries no button. It exists as an opt-in for a specific Event, set by
-- pointing that Event's initial_invitation Schedule at this family - it is not
-- an event-type default, and no Schedule is moved onto it here.
--
-- Its own key rather than another variant of save_the_date_1: a family is
-- key + channel + variant + language, but message_templates_family_config_key
-- is unique on key + channel + the axis flags, so a second save_the_date_1
-- family would collide with the first on every row.
--
-- Axes:
--   invitation image - the family has only the image row, so it offers the
--                      axis with no text-only fallback. An Event without an
--                      uploaded invitation image fails to resolve (a clear
--                      error) instead of sending a template Meta approved
--                      with an image header and no image. Only point Events
--                      that have an invitation image at this family.
--
-- Grid: 1 WhatsApp row (save_the_date_1_image_no_buttons) and 1 SMS row, the
-- same as save_the_date_1's, so an SMS fallback still has a version to send.

-- 1. The family --------------------------------------------------------------

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code,
   whatsapp_template_name, requires_table_numbers, requires_gifting, requires_note,
   requires_follow_up, requires_invitation_image, payload)
values
(
  'save_the_date_1_no_buttons', 'whatsapp',
  (select id from public.schedule_types where key = 'initial_invitation'),
  '1', 'Save the Date - 1, invitation image, no buttons',
  'First message to Guests with the invitation image as header and no calendar button. Per-Event opt-in; the Event must have an invitation image.',
  'he', 'save_the_date_1_image_no_buttons', false, false, false, false, true,
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
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

(
  'save_the_date_1_no_buttons', 'sms',
  (select id from public.schedule_types where key = 'initial_invitation'),
  '1', 'Save the Date - 1, no buttons',
  'First message to Guests, SMS rendition. Same as save_the_date_1''s SMS row.',
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

-- 2. Guard -------------------------------------------------------------------
-- One row per channel, the WhatsApp row has the image header and no buttons,
-- and every row carries its placeholders (a missing one would send a literal
-- {{n}}).

do $$
declare
  v_wa_rows int;
  v_sms_rows int;
  v_bad_placeholders int;
  v_bad_wa int;
begin
  select count(*) into v_wa_rows
  from public.message_templates
  where key = 'save_the_date_1_no_buttons' and channel = 'whatsapp';
  if v_wa_rows <> 1 then
    raise exception 'save_the_date_1_no_buttons_template: expected 1 WhatsApp row, found %', v_wa_rows;
  end if;

  select count(*) into v_sms_rows
  from public.message_templates
  where key = 'save_the_date_1_no_buttons' and channel = 'sms';
  if v_sms_rows <> 1 then
    raise exception 'save_the_date_1_no_buttons_template: expected 1 SMS row, found %', v_sms_rows;
  end if;

  select count(*) into v_bad_placeholders
  from public.message_templates
  where key = 'save_the_date_1_no_buttons'
    and jsonb_array_length(payload -> 'parameters' -> 'placeholders')
        <> (case when channel = 'sms' then 4 else 3 end);
  if v_bad_placeholders > 0 then
    raise exception 'save_the_date_1_no_buttons_template: % row(s) have the wrong placeholder count', v_bad_placeholders;
  end if;

  select count(*) into v_bad_wa
  from public.message_templates
  where key = 'save_the_date_1_no_buttons' and channel = 'whatsapp'
    and (
      not requires_invitation_image
      or jsonb_array_length(payload -> 'parameters' -> 'headerPlaceholders') <> 1
      or jsonb_array_length(payload -> 'parameters' -> 'buttonPlaceholders') <> 0
    );
  if v_bad_wa > 0 then
    raise exception 'save_the_date_1_no_buttons_template: the WhatsApp row must have the image header and no buttons';
  end if;
end $$;

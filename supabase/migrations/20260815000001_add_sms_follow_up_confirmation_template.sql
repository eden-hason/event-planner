-- SMS follow-up confirmation template.
--
-- The confirmation schedule type has two WhatsApp templates - the first ask
-- (confirmation_casual_v1_he) and the nudge for guests who never answered
-- (follow_up_confirmation_casual) - but SMS only ever had the first ask. A
-- follow-up scheduled on SMS therefore had no template to send, and a WhatsApp
-- follow-up that fell back to SMS reused the generic DEFAULT_SMS_BODY, so the
-- guest got the original invite wording again instead of a reminder.
--
-- Mirrors follow_up_confirmation_casual: same Hebrew copy and the same four
-- placeholders, with the WhatsApp RSVP button replaced by a link placeholder
-- ({{5}}, rsvpUrl) exactly as the SMS confirmation template does.

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code, whatsapp_template_name, payload)
values
(
  'follow_up_confirmation_casual', 'sms',
  (select id from public.schedule_types where key = 'confirmation'),
  'casual', 'RSVP Follow-up - Casual (SMS)',
  'SMS variant of the follow-up RSVP reminder for guests who have not yet confirmed',
  'he', null,
  $json$
{
  "bodyText": "היי אורחים יקרים \nאם עדיין לא הספקתם לאשר הגעה לחתונה של {{1}} ו{{2}}, נשמח לעדכון קצר דרך הקישור המצורף.\n\n📅 {{3}} \n📍 {{4}}\n\nתודה, זה ממש עוזר לנו להיערך כמו שצריך 🙏🏼\n{{5}}",
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
);

-- Guard: the row must exist and carry all five placeholders, or the body's
-- {{5}} would be sent to a guest literally.
do $$
declare
  v_placeholders int;
begin
  select jsonb_array_length(payload -> 'parameters' -> 'placeholders')
  into v_placeholders
  from public.message_templates
  where key = 'follow_up_confirmation_casual' and channel = 'sms';

  if v_placeholders is null then
    raise exception
      'add_sms_follow_up_confirmation_template: template was not inserted';
  end if;

  if v_placeholders <> 5 then
    raise exception
      'add_sms_follow_up_confirmation_template: expected 5 placeholders, found %',
      v_placeholders;
  end if;
end $$;

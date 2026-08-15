-- Rewrite the SMS confirmation follow-up copy.
--
-- The previous body led with an emoji-bulleted block (📅 date / 📍 venue) and
-- never stated the start time, so a guest reading the nudge still had to open
-- the RSVP page to learn when to show up. The new copy states date, hour and
-- venue in one sentence and asks for the confirmation directly.
--
-- Two placeholder changes come with it:
--   * a new {{4}} for the reception time (event.receptionTime, already selected
--     and mapped by the send engine), which pushes the RSVP link to {{6}}
--   * the date switches to dateStyle "full" so it carries the weekday
--     ("יום רביעי, 16 בספטמבר 2026"). The copy therefore says "יתקיים ב{{3}}"
--     and not "יתקיים ביום {{3}}" - the formatted value already opens with
--     "יום", and the old wording would render "ביום יום רביעי".
--
-- Targets the row by key + channel rather than by id so a fresh local database
-- and production converge on the same body.

update public.message_templates
set payload = $json$
{
  "bodyText": "משפחה וחברים יקרים\nהוזמנתם לחתונה של {{1}} ו{{2}}\nועדיין לא אישרתם הגעה\nהאירוע יתקיים ב{{3}}, בשעה {{4}} ב{{5}}\n\nנשמח לדעת אם תגיעו\nלאישור הגעה: {{6}}",
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
          "format": "full",
          "locale": "he-IL"
        }
      },
      {
        "name": "event.receptionTime",
        "source": "event.receptionTime",
        "transformer": "none"
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
$json$::jsonb,
    updated_at = now()
where key = 'follow_up_confirmation_casual'
  and channel = 'sms';

-- Guard: the body and the placeholder array have to agree, or a guest receives
-- a literal "{{6}}" where the RSVP link belongs.
do $$
declare
  v_body text;
  v_placeholders int;
begin
  select payload ->> 'bodyText',
         jsonb_array_length(payload -> 'parameters' -> 'placeholders')
  into v_body, v_placeholders
  from public.message_templates
  where key = 'follow_up_confirmation_casual' and channel = 'sms';

  if v_body is null then
    raise exception
      'rewrite_sms_follow_up_confirmation_body: template row is missing';
  end if;

  if v_placeholders <> 6 then
    raise exception
      'rewrite_sms_follow_up_confirmation_body: expected 6 placeholders, found %',
      v_placeholders;
  end if;

  -- Every position the array declares must appear in the body, and nothing past
  -- the last one may.
  for i in 1..6 loop
    if position('{{' || i || '}}' in v_body) = 0 then
      raise exception
        'rewrite_sms_follow_up_confirmation_body: body is missing placeholder {{%}}',
        i;
    end if;
  end loop;

  if position('{{7}}' in v_body) > 0 then
    raise exception
      'rewrite_sms_follow_up_confirmation_body: body references {{7}}, which nothing resolves';
  end if;
end $$;

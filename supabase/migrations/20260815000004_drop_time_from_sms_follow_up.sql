-- Drop the reception time from the SMS follow-up copy.
--
-- 20260815000003 added the start time so a guest would not have to open the
-- RSVP page to learn when to arrive. On a follow-up it does not earn its
-- segment: the nudge exists to collect an answer, not to brief someone who has
-- already decided, and the time is on the RSVP page the link leads to. The
-- opening line is trimmed the same way.
--
-- Placeholders drop from six to five. The reception time was {{4}}, so venue
-- moves 5 -> 4 and the RSVP link 6 -> 5. The date keeps dateStyle "full": the
-- copy reads "יתקיים ב{{3}}" and the full form opens with the weekday, giving
-- "ביום רביעי, 27 באוגוסט 2026".
--
-- The closing 🙏🏼 costs 4 UCS-2 units (emoji + skin-tone modifier), 5 with its
-- leading space. Hebrew is always UCS-2, so this buys no encoding penalty on
-- top of that - but the provider bills per 201 characters, and after the fixed
-- copy, the date and the RSVP link only 32 remain for the two names plus the
-- venue. A venue name longer than roughly 25 characters costs a second message.
--
-- Targets the row by key + channel rather than by id so a fresh local database
-- and production converge on the same body.

update public.message_templates
set payload = $json$
{
  "bodyText": "אורחים יקרים!\nהוזמנתם לחתונה של {{1}} ו{{2}}\nוטרם אישרתם הגעה.\nהאירוע יתקיים ב{{3}}, ב{{4}}\nנשמח לדעת אם תגיעו 🙏🏼\nלאישור הגעה: {{5}}",
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
-- a literal "{{5}}" where the RSVP link belongs - or worse, the venue rendered
-- where the link was expected because the array still declares the old count.
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
      'drop_time_from_sms_follow_up: template row is missing';
  end if;

  if v_placeholders <> 5 then
    raise exception
      'drop_time_from_sms_follow_up: expected 5 placeholders, found %',
      v_placeholders;
  end if;

  for i in 1..5 loop
    if position('{{' || i || '}}' in v_body) = 0 then
      raise exception
        'drop_time_from_sms_follow_up: body is missing placeholder {{%}}', i;
    end if;
  end loop;

  -- The old link position must be gone, or the link renders as literal text.
  if position('{{6}}' in v_body) > 0 then
    raise exception
      'drop_time_from_sms_follow_up: body still references {{6}}, which nothing resolves';
  end if;
end $$;

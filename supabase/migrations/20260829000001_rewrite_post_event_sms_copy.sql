-- New copy for the post-event thank-you SMS (thank_you_sms_v1_he).
--
-- The previous body opened with "היי אורחים יקרים" and signed off with
-- "אוהבים ומעריכים {{1}} ו{{2}}". This replaces it with the approved copy:
-- a "משפחה וחברים יקרים" greeting, a two-line thank-you, and a bare
-- "{{1}} ו{{2}}❤️" sign-off.
--
-- Only bodyText changes. The two placeholders still resolve bride then groom
-- in that order, so the placeholders array - and every {{n}} binding - is left
-- exactly as it was. jsonb_set rather than a whole-payload rewrite keeps that
-- literally true and preserves the SMS payload shape (no header/footer keys).
--
-- SMS only. The WhatsApp post-event template (thank_you_v1_he) is a separate
-- catalog row whose real text lives in Meta; its payload bodyText drives only
-- the organiser preview and is not touched here.

-- 1. The body ----------------------------------------------------------------
update public.message_templates
set payload = jsonb_set(
  payload,
  '{bodyText}',
  to_jsonb(E'משפחה וחברים יקרים,\nבזכותכם היה לנו אירוע מדהים.\nרצינו להגיד תודה שהגעתם לחגוג איתנו.\n{{1}} ו{{2}}❤️'::text)
)
where key = 'thank_you_sms_v1_he'
  and channel = 'sms';

-- 2. Guard ------------------------------------------------------------------
-- The row must exist and land on the new copy, and every {{n}} it references
-- must have a placeholder behind it - the SMS send path interpolates
-- positionally, so a body referencing more than the array holds would ship a
-- literal '{{n}}' to a guest.

do $$
declare
  v_rewritten int;
  v_unresolvable int;
begin
  select count(*) into v_rewritten
  from public.message_templates
  where key = 'thank_you_sms_v1_he'
    and channel = 'sms'
    and payload ->> 'bodyText' like 'משפחה וחברים יקרים,%'
    and payload ->> 'bodyText' like '%{{1}} ו{{2}}❤️';

  if v_rewritten <> 1 then
    raise exception
      'rewrite_post_event_sms_copy: expected 1 row on the new copy, found %',
      v_rewritten;
  end if;

  select count(*) into v_unresolvable
  from public.message_templates t
  where t.key = 'thank_you_sms_v1_he'
    and t.channel = 'sms'
    and (
      select max((m[1])::int)
      from regexp_matches(t.payload ->> 'bodyText', '\{\{(\d+)\}\}', 'g') m
    ) <> jsonb_array_length(t.payload -> 'parameters' -> 'placeholders');

  if v_unresolvable > 0 then
    raise exception
      'rewrite_post_event_sms_copy: body references a placeholder position the config does not resolve';
  end if;
end $$;

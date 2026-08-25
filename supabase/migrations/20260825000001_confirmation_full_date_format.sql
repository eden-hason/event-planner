-- Add the day name to the event date line on the two WhatsApp confirmation
-- templates.
--
-- Both render 📅 {{n}} from event.eventDate through the formatDate transformer,
-- which was on 'long' (15 בספטמבר 2026). 'full' prepends the weekday
-- (יום שלישי, 15 בספטמבר 2026), which is the detail a guest actually checks
-- before answering an RSVP.
--
-- This is a variable *value*, not template text: the approved bodies in Meta
-- are untouched, so nothing re-enters review. Meta's variable rules are not at
-- risk either - Intl adds ~11 characters and a comma, no newlines, tabs, or
-- runs of spaces.
--
-- WhatsApp only, per the request. The SMS confirmation rows keep 'long'; note
-- that the SMS bar mitzva and follow-up rows already ship 'full', so this
-- narrows an existing split rather than opening a new one.
--
-- Matched on placeholder name rather than array position so the rewrite stays
-- correct if the ordering of a body's {{n}} ever changes.

update public.message_templates t
set payload = jsonb_set(
  t.payload,
  '{parameters,placeholders}',
  (
    select jsonb_agg(
      case
        when e.p ->> 'name' = 'event.eventDate'
          then jsonb_set(e.p, '{transformerOptions,format}', '"full"')
        else e.p
      end
      order by e.ord
    )
    from jsonb_array_elements(t.payload -> 'parameters' -> 'placeholders')
      with ordinality as e(p, ord)
  )
)
where t.channel = 'whatsapp'
  and t.key in ('confirmation_casual_v1_he', 'follow_up_confirmation_casual');

-- Guard ----------------------------------------------------------------------
-- Both rows must carry the new format, and no other placeholder on them may
-- have been disturbed by the array rebuild.

do $$
declare
  v_full int;
  v_stale int;
  v_reordered int;
begin
  select count(*) into v_full
  from public.message_templates t
  where t.channel = 'whatsapp'
    and t.key in ('confirmation_casual_v1_he', 'follow_up_confirmation_casual')
    and exists (
      select 1
      from jsonb_array_elements(t.payload -> 'parameters' -> 'placeholders') p
      where p ->> 'name' = 'event.eventDate'
        and p -> 'transformerOptions' ->> 'format' = 'full'
    );

  if v_full <> 2 then
    raise exception
      'confirmation_full_date_format: expected 2 whatsapp rows on the full date format, found %',
      v_full;
  end if;

  select count(*) into v_stale
  from public.message_templates t
  where t.channel = 'whatsapp'
    and t.key in ('confirmation_casual_v1_he', 'follow_up_confirmation_casual')
    and exists (
      select 1
      from jsonb_array_elements(t.payload -> 'parameters' -> 'placeholders') p
      where p ->> 'name' = 'event.eventDate'
        and p -> 'transformerOptions' ->> 'format' <> 'full'
    );

  if v_stale > 0 then
    raise exception
      'confirmation_full_date_format: % whatsapp row(s) still resolve the date on the old format',
      v_stale;
  end if;

  -- jsonb_agg drops the array if the source is empty and reorders it if the
  -- ordinality is lost, either of which would silently break positional
  -- {{n}} resolution. Every {{n}} in the body must still have a placeholder.
  select count(*) into v_reordered
  from public.message_templates t
  where t.channel = 'whatsapp'
    and t.key in ('confirmation_casual_v1_he', 'follow_up_confirmation_casual')
    and (
      select max((m[1])::int)
      from regexp_matches(t.payload ->> 'bodyText', '\{\{(\d+)\}\}', 'g') m
    ) <> jsonb_array_length(t.payload -> 'parameters' -> 'placeholders');

  if v_reordered > 0 then
    raise exception
      'confirmation_full_date_format: % row(s) reference a placeholder position their config does not resolve',
      v_reordered;
  end if;
end $$;

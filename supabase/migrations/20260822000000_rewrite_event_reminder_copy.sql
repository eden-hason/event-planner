-- Final copy for the day-of reminder grid.
--
-- 20260821000000 built the 2x2 configuration grid (table numbers x gifting)
-- across both channels, but the body text it seeded was carried over from the
-- single pre-grid reminder. This replaces it with the approved copy: shorter,
-- no greeting line, no blank lines, '&' between the hosts instead of 'ו', and
-- the link line collapsed to a bare label ('לניווט:' / 'לניווט והענקת מתנה:')
-- rather than an instruction to press it.
--
-- Only bodyText changes. The four configurations resolve the same values in
-- the same order as before - bride, groom, venue, reception time, [table],
-- reminder url - so every placeholders array, and therefore every {{n}}
-- binding, is left exactly as it was. jsonb_set rather than a whole-payload
-- rewrite keeps that literally true, and keeps the per-channel payload shape
-- (whatsapp rows carry footerText/headerText/headerType, sms rows do not).
--
-- The sign-off ('מחכים לחגוג איתכם היום') sits last rather than second, where
-- the approved copy had it, so that no body ends on a bare {{n}}: Meta's
-- validator rejects a template body that ends with a variable, and every one of
-- these ends on the reminder link. Moving the line down is the smallest change
-- that clears it and it reads the same - none of the existing approved
-- templates end on a variable either (thank_you_v1_he and invitation_casual
-- both close on an emoji after the last one).
--
-- WhatsApp bodies live in Meta, not here: the payload's bodyText drives SMS
-- sends and the organiser-facing preview, while a WhatsApp send passes only
-- whatsapp_template_name plus positional parameters. The four names introduced
-- yesterday (event_reminder_casual{,_tables,_gift,_tables_gift}_v2) had not
-- cleared review yet, so they keep their names and this copy is what gets
-- submitted. If any of them was already approved with the previous body, it
-- must be edited in Meta to match, or WhatsApp guests get the old text while
-- the preview shows the new one.

-- 1. The four bodies ----------------------------------------------------------
-- One statement per configuration, applied to both channels of that
-- configuration - the two channels deliberately carry identical text, since
-- the reminder has no buttons for a WhatsApp row to add.

update public.message_templates t
set payload = jsonb_set(t.payload, '{bodyText}', to_jsonb(c.body))
from (values
  -- no table number, no gifting
  (false, false, E'תזכורת לחתונה של {{1}} & {{2}}\n📍 {{3}}\n🕐 {{4}}\nלניווט:\n{{5}}\nמחכים לחגוג איתכם היום❤️'),
  -- no table number, gifting
  (false, true , E'תזכורת לחתונה של {{1}} & {{2}}\n📍 {{3}}\n🕐 {{4}}\nלניווט והענקת מתנה:\n{{5}}\nמחכים לחגוג איתכם היום❤️'),
  -- table number, no gifting
  (true , false, E'תזכורת לחתונה של {{1}} & {{2}}\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\nלניווט:\n{{6}}\nמחכים לחגוג איתכם היום❤️'),
  -- table number, gifting
  (true , true , E'תזכורת לחתונה של {{1}} & {{2}}\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\nלניווט והענקת מתנה:\n{{6}}\nמחכים לחגוג איתכם היום❤️')
) as c(tables, gifting, body)
where t.key = 'event_reminder_casual'
  and t.requires_table_numbers = c.tables
  and t.requires_gifting = c.gifting;

-- 2. Guard --------------------------------------------------------------------
-- Two things this must not get wrong. The grid has to stay complete, because
-- the resolver hard-fails a send when a configuration has no row. And every
-- {{n}} in a body has to have a placeholder behind it: the send path
-- interpolates positionally, so a body referencing one more than the array
-- holds ships a literal '{{6}}' to a guest on SMS, and desynchronises the
-- parameter count Meta expects on WhatsApp. And no body may end on a bare
-- variable - Meta rejects those at review, which is the whole reason the
-- sign-off moved to the last line.

do $$
declare
  v_rewritten int;
  v_unresolvable int;
  v_trailing_var int;
  v_configs int;
begin
  select count(*) into v_rewritten
  from public.message_templates
  where key = 'event_reminder_casual'
    and payload ->> 'bodyText' like 'תזכורת לחתונה של {{1}} & {{2}}%';

  if v_rewritten <> 8 then
    raise exception
      'rewrite_event_reminder_copy: expected 8 rows on the new copy, found %',
      v_rewritten;
  end if;

  select count(*) into v_unresolvable
  from public.message_templates t
  where t.key = 'event_reminder_casual'
    and (
      select max((m[1])::int)
      from regexp_matches(t.payload ->> 'bodyText', '\{\{(\d+)\}\}', 'g') m
    ) <> jsonb_array_length(t.payload -> 'parameters' -> 'placeholders');

  if v_unresolvable > 0 then
    raise exception
      'rewrite_event_reminder_copy: % row(s) reference a placeholder position their config does not resolve',
      v_unresolvable;
  end if;

  select count(*) into v_trailing_var
  from public.message_templates
  where key = 'event_reminder_casual'
    and payload ->> 'bodyText' ~ '\{\{\d+\}\}$';

  if v_trailing_var > 0 then
    raise exception
      'rewrite_event_reminder_copy: % row(s) end on a bare variable, which Meta rejects at template review',
      v_trailing_var;
  end if;

  select count(distinct (requires_table_numbers, requires_gifting, channel))
    into v_configs
  from public.message_templates
  where key = 'event_reminder_casual';

  if v_configs <> 8 then
    raise exception
      'rewrite_event_reminder_copy: expected 8 distinct channel/config pairs, found %',
      v_configs;
  end if;
end $$;

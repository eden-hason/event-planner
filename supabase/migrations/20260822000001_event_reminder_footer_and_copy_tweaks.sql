-- The copy as submitted to Meta, plus the footer.
--
-- 20260822000000 landed the approved copy, but the four WhatsApp templates were
-- then submitted for review with four adjustments, and Meta is now the source
-- of truth for what a WhatsApp guest actually sees. This brings the payloads
-- back in line with what was submitted:
--
--   * 'שמתקיימת היום' closes the first line, so the message says up front that
--     the event is today rather than leaving it to the sign-off.
--   * the sign-off drops 'היום' accordingly and reads 'מחכים לחגוג איתכם ❤️'.
--   * blank lines fence the navigation section (its label and the link), which
--     is the part a guest is opening the message to find.
--   * a footer on every WhatsApp template.
--
-- The body changes apply to the SMS rows too. Both channels have carried
-- byte-identical text since the grid was built - the reminder has no buttons
-- for a WhatsApp row to add - and there is no reason for these edits to be the
-- thing that splits them.
--
-- The footer does not: a WhatsApp footer is a distinct static component stored
-- in Meta, and SMS has no equivalent, so footerText is set only on the four
-- WhatsApp rows. It is read by exactly one thing in the app - the organiser's
-- preview card - because a send never transmits it: Meta renders the footer
-- from the approved template. Setting it here is what keeps the preview honest
-- about what guests receive.

-- 1. Bodies (both channels) ---------------------------------------------------

update public.message_templates t
set payload = jsonb_set(t.payload, '{bodyText}', to_jsonb(c.body))
from (values
  -- no table number, no gifting
  (false, false, E'תזכורת לחתונה של {{1}} & {{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n\nלניווט:\n{{5}}\n\nמחכים לחגוג איתכם ❤️'),
  -- no table number, with gifting
  (false, true , E'תזכורת לחתונה של {{1}} & {{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n\nלניווט והענקת מתנה:\n{{5}}\n\nמחכים לחגוג איתכם ❤️'),
  -- with table number, no gifting
  (true , false, E'תזכורת לחתונה של {{1}} & {{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n\nלניווט:\n{{6}}\n\nמחכים לחגוג איתכם ❤️'),
  -- with table number, with gifting
  (true , true , E'תזכורת לחתונה של {{1}} & {{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n\nלניווט והענקת מתנה:\n{{6}}\n\nמחכים לחגוג איתכם ❤️')
) as c(tables, gifting, body)
where t.key = 'event_reminder_casual'
  and t.requires_table_numbers = c.tables
  and t.requires_gifting = c.gifting;

-- 2. Footer (WhatsApp only) ---------------------------------------------------

update public.message_templates
set payload = jsonb_set(payload, '{footerText}', to_jsonb('נשלח ע״י Kululu אישורי הגעה'::text))
where key = 'event_reminder_casual'
  and channel = 'whatsapp';

-- 3. Guard --------------------------------------------------------------------
-- Carries forward the two invariants from the previous migration - a complete
-- grid, and no {{n}} without a placeholder behind it - and adds the footer.
-- Meta caps a footer at 60 characters and rejects variables in it, so a footer
-- that violates either would fail at review rather than here, which is far
-- later and far more annoying.

do $$
declare
  v_rewritten int;
  v_unresolvable int;
  v_trailing_var int;
  v_footers int;
  v_bad_footer int;
begin
  select count(*) into v_rewritten
  from public.message_templates
  where key = 'event_reminder_casual'
    and payload ->> 'bodyText' like '%שמתקיימת היום%'
    and payload ->> 'bodyText' like '%מחכים לחגוג איתכם ❤️';

  if v_rewritten <> 8 then
    raise exception
      'event_reminder_footer_and_copy_tweaks: expected 8 rows on the submitted copy, found %',
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
      'event_reminder_footer_and_copy_tweaks: % row(s) reference a placeholder position their config does not resolve',
      v_unresolvable;
  end if;

  select count(*) into v_trailing_var
  from public.message_templates
  where key = 'event_reminder_casual'
    and payload ->> 'bodyText' ~ '\{\{\d+\}\}$';

  if v_trailing_var > 0 then
    raise exception
      'event_reminder_footer_and_copy_tweaks: % row(s) end on a bare variable, which Meta rejects at template review',
      v_trailing_var;
  end if;

  select count(*) into v_footers
  from public.message_templates
  where key = 'event_reminder_casual'
    and channel = 'whatsapp'
    and coalesce(payload ->> 'footerText', '') <> '';

  if v_footers <> 4 then
    raise exception
      'event_reminder_footer_and_copy_tweaks: expected 4 whatsapp rows with a footer, found %',
      v_footers;
  end if;

  select count(*) into v_bad_footer
  from public.message_templates
  where key = 'event_reminder_casual'
    and channel = 'whatsapp'
    and (length(payload ->> 'footerText') > 60
         or payload ->> 'footerText' ~ '\{\{\d+\}\}');

  if v_bad_footer > 0 then
    raise exception
      'event_reminder_footer_and_copy_tweaks: % footer(s) exceed 60 characters or contain a variable',
      v_bad_footer;
  end if;
end $$;

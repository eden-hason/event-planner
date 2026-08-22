-- Move the reminder link from the WhatsApp body onto a URL button.
--
-- 20260821000000 stripped the buttons off this template on the grounds that a
-- Meta URL button is a fixed base plus one variable suffix, and a Paybox link
-- is an arbitrary per-event URL that cannot be expressed that way. That reason
-- dissolves once the button points at a route we own: the button carries
-- https://kulu-lu.com/r/ + the event short code, and /r/[code] resolves
-- navigation and whichever gift providers the event has configured. Paybox
-- never has to fit in the button, because the button never leaves our domain.
--
-- The four templates this replaces were deleted in Meta, which locks their
-- names for 30 days, so the family moves to _v3 names. Nothing reads a template
-- by its Meta name - every read joins through template_id - so renaming is
-- purely what gets submitted for review.
--
-- The gifting axis survives, but it has moved from the body to the button
-- label: with the link gone the two bodies are byte-identical, and the only
-- thing that still tells a guest gifting is available is whether the button
-- reads 'לניווט' or 'לניווט והענקת מתנה'. A Meta button label is static text fixed
-- at approval, so that difference is what earns the second pair of templates.
--
-- SMS is deliberately untouched. It has no buttons, so its four rows keep the
-- link in the body and keep the gifting axis as lead-in copy. The two channels
-- have carried identical text since the grid was built and now permanently
-- diverge - but for a structural reason, not copy drift.
--
-- Numbering is unaffected: the reminder url was always the last body
-- placeholder, so dropping it leaves {{1}}..{{4}} (and {{5}} for the table
-- variants) exactly where they were. The button's own {{1}} is a separate
-- namespace - Meta indexes button parameters per button.

-- 1. The four WhatsApp rows ---------------------------------------------------
-- Whole-payload rewrite rather than jsonb_set: the body, the placeholders array
-- and the buttons all change together, and spelling the result out is easier to
-- check against Meta's template manager than three surgical edits would be.
-- footerText and the header fields keep their existing values.

update public.message_templates t
set
  whatsapp_template_name = c.wa_name,
  payload = t.payload
    || jsonb_build_object('bodyText', c.body)
    || jsonb_build_object('parameters', c.params)
from (values
  -- no table number, no gifting
  (false, false, 'event_reminder_casual_v3', E'תזכורת לחתונה של {{1}} & {{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\nמחכים לחגוג איתכם ❤️',
   $json$
{
  "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" }
  ],
  "buttonPlaceholders": [
    {
      "index": 0,
      "subType": "url",
      "text": "לניווט",
      "placeholders": [
        { "source": "event.shortCode", "transformer": "none" }
      ]
    }
  ],
  "headerPlaceholders": []
}
$json$::jsonb),
  -- no table number, with gifting
  (false, true , 'event_reminder_casual_gift_v3', E'תזכורת לחתונה של {{1}} & {{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\nמחכים לחגוג איתכם ❤️',
   $json$
{
  "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" }
  ],
  "buttonPlaceholders": [
    {
      "index": 0,
      "subType": "url",
      "text": "לניווט והענקת מתנה",
      "placeholders": [
        { "source": "event.shortCode", "transformer": "none" }
      ]
    }
  ],
  "headerPlaceholders": []
}
$json$::jsonb),
  -- with table number, no gifting
  (true , false, 'event_reminder_casual_tables_v3', E'תזכורת לחתונה של {{1}} & {{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\nמחכים לחגוג איתכם ❤️',
   $json$
{
  "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" }
  ],
  "buttonPlaceholders": [
    {
      "index": 0,
      "subType": "url",
      "text": "לניווט",
      "placeholders": [
        { "source": "event.shortCode", "transformer": "none" }
      ]
    }
  ],
  "headerPlaceholders": []
}
$json$::jsonb),
  -- with table number, with gifting
  (true , true , 'event_reminder_casual_tables_gift_v3', E'תזכורת לחתונה של {{1}} & {{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\nמחכים לחגוג איתכם ❤️',
   $json$
{
  "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" }
  ],
  "buttonPlaceholders": [
    {
      "index": 0,
      "subType": "url",
      "text": "לניווט והענקת מתנה",
      "placeholders": [
        { "source": "event.shortCode", "transformer": "none" }
      ]
    }
  ],
  "headerPlaceholders": []
}
$json$::jsonb)
) as c(tables, gifting, wa_name, body, params)
where t.key = 'event_reminder_casual'
  and t.channel = 'whatsapp'
  and t.requires_table_numbers = c.tables
  and t.requires_gifting = c.gifting;

-- 2. Guard --------------------------------------------------------------------
-- Everything here fails loudly at migration time rather than at Meta's review
-- queue or, worse, at 10am on the day of a wedding.

do $$
declare
  v_wa int;
  v_buttons int;
  v_bad_button int;
  v_unresolvable int;
  v_trailing_var int;
  v_names int;
  v_sms_touched int;
begin
  select count(*) into v_wa
  from public.message_templates
  where key = 'event_reminder_casual'
    and channel = 'whatsapp'
    and whatsapp_template_name like '%\_v3'
    and payload ->> 'bodyText' not like '%http%';

  if v_wa <> 4 then
    raise exception
      'event_reminder_url_buttons: expected 4 whatsapp rows on _v3 with no link in the body, found %',
      v_wa;
  end if;

  -- Exactly one button. Meta caps a template at two URL buttons, and a second
  -- one here would silently shift the index the send path resolves against.
  select count(*) into v_buttons
  from public.message_templates
  where key = 'event_reminder_casual'
    and channel = 'whatsapp'
    and jsonb_array_length(payload -> 'parameters' -> 'buttonPlaceholders') = 1;

  if v_buttons <> 4 then
    raise exception
      'event_reminder_url_buttons: expected 4 whatsapp rows with exactly one button, found %',
      v_buttons;
  end if;

  -- The button suffix must be the short code and nothing else: the base is
  -- frozen on the approved template, so a wrong source here produces a URL that
  -- 404s for every guest with no way to fix it short of re-approval.
  select count(*) into v_bad_button
  from public.message_templates
  where key = 'event_reminder_casual'
    and channel = 'whatsapp'
    and (payload -> 'parameters' -> 'buttonPlaceholders' -> 0 -> 'placeholders' -> 0 ->> 'source'
           is distinct from 'event.shortCode'
         or payload -> 'parameters' -> 'buttonPlaceholders' -> 0 ->> 'subType'
           is distinct from 'url'
         or coalesce(payload -> 'parameters' -> 'buttonPlaceholders' -> 0 ->> 'text', '') = '');

  if v_bad_button > 0 then
    raise exception
      'event_reminder_url_buttons: % row(s) have a button that is not a labelled url button on event.shortCode',
      v_bad_button;
  end if;

  -- Carried forward across the whole family, sms included.
  select count(*) into v_unresolvable
  from public.message_templates t
  where t.key = 'event_reminder_casual'
    and (
      select max((m[1])::int)
      from regexp_matches(t.payload ->> 'bodyText', '\{\{(\d+)\}\}', 'g') m
    ) <> jsonb_array_length(t.payload -> 'parameters' -> 'placeholders');

  if v_unresolvable > 0 then
    raise exception
      'event_reminder_url_buttons: % row(s) reference a placeholder position their config does not resolve',
      v_unresolvable;
  end if;

  select count(*) into v_trailing_var
  from public.message_templates
  where key = 'event_reminder_casual'
    and payload ->> 'bodyText' ~ '\{\{\d+\}\}$';

  if v_trailing_var > 0 then
    raise exception
      'event_reminder_url_buttons: % row(s) end on a bare variable, which Meta rejects at template review',
      v_trailing_var;
  end if;

  select count(distinct whatsapp_template_name) into v_names
  from public.message_templates
  where key = 'event_reminder_casual' and channel = 'whatsapp';

  if v_names <> 4 then
    raise exception
      'event_reminder_url_buttons: expected 4 distinct whatsapp template names, found %',
      v_names;
  end if;

  -- SMS keeps the link and gains no buttons. If this trips, the update above
  -- lost its channel filter.
  select count(*) into v_sms_touched
  from public.message_templates
  where key = 'event_reminder_casual'
    and channel = 'sms'
    and (payload ->> 'bodyText' not like '%{{5}}%'
         or jsonb_array_length(coalesce(payload -> 'parameters' -> 'buttonPlaceholders', '[]'::jsonb)) <> 0
         or whatsapp_template_name is not null);

  if v_sms_touched > 0 then
    raise exception
      'event_reminder_url_buttons: % sms row(s) were modified',
      v_sms_touched;
  end if;
end $$;

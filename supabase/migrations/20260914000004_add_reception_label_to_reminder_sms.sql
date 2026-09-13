-- Label the reception time in the wedding event-reminder SMS family.
--
-- All 4 SMS rows of wedding_event_reminder_1 render the reception time as a
-- bare "🕐 {{4}}" line. A guest skimming an SMS (no bubble/header context
-- like WhatsApp) can misread that as the ceremony time, so the line now
-- names what the time is for: "🕐 קבלת פנים - {{4}}". WhatsApp rows and the
-- legacy event_reminder_casual/event_reminder_wartime SMS family are
-- untouched - this only changes the currently-active SMS family.

update public.message_templates
set payload = jsonb_set(
      payload,
      '{bodyText}',
      to_jsonb(replace(payload ->> 'bodyText', '🕐 {{4}}', '🕐 קבלת פנים - {{4}}'))
    ),
    updated_at = now()
where key = 'wedding_event_reminder_1'
  and channel = 'sms';

-- Guard: every targeted row must have actually picked up the new label, and
-- the placeholder count must be unchanged (this is a copy edit, not a new
-- placeholder).
do $$
declare
  v_rows int;
  v_labeled int;
begin
  select count(*) into v_rows
  from public.message_templates
  where key = 'wedding_event_reminder_1' and channel = 'sms';

  if v_rows <> 4 then
    raise exception
      'add_reception_label_to_reminder_sms: expected 4 SMS rows, found %', v_rows;
  end if;

  select count(*) into v_labeled
  from public.message_templates
  where key = 'wedding_event_reminder_1'
    and channel = 'sms'
    and payload ->> 'bodyText' like '%קבלת פנים - {{4}}%';

  if v_labeled <> 4 then
    raise exception
      'add_reception_label_to_reminder_sms: expected all 4 SMS rows to carry the new label, found %',
      v_labeled;
  end if;
end $$;

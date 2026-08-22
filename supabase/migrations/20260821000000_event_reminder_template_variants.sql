-- Event reminder template variants, resolved from event configuration.
--
-- The day-of reminder had exactly one template per channel, so two settings the
-- organiser can already toggle had no effect on what guests received:
--   * guests_experience.send_table_numbers - a switch in the guest experience
--     card that nothing downstream ever read.
--   * event_settings.paybox_config / bit_config - the WhatsApp reminder carried
--     a hardcoded Bit gift button regardless of whether Bit was enabled, and
--     Paybox could not be expressed at all (a Meta URL button has a fixed base,
--     and PAYBOX_REGEX accepts any https URL).
--
-- A template now declares which configuration it is written for, via two flags,
-- and the send path resolves the matching row from the event's current state.
-- The flags are orthogonal to `variant`, which stays an editorial axis (casual,
-- wartime, bar_mitzva) - a wartime reminder can equally need table numbers.
--
-- `key` becomes the name of a *family* rather than of a single row: all four
-- configurations of the casual reminder share key 'event_reminder_casual' and
-- differ only in the flags, so template_id on schedules and on
-- event_type_default_schedules is an anchor naming a family, never a promise
-- about which body ships. Nothing in src/ looks a template up by key - every
-- read joins through the template_id FK - so widening the unique constraint is
-- safe.
--
-- Both channels now carry the same body text ending in a single link to the
-- /r/<short_code> reminder page, which renders the navigation button always and
-- the gift buttons when configured. That keeps gifting out of the template
-- matrix as *structure* (it survives only as a difference in the lead-in copy)
-- and means the gift destination stays correct if the organiser changes
-- providers after the message was delivered.
--
-- The flags are `not null default false` rather than nullable: with a complete
-- grid there is no "applies either way" row to express, and nullable columns in
-- a unique constraint are a footgun (nulls compare distinct, so the constraint
-- would not actually constrain).

-- 1. Configuration axes -------------------------------------------------------

alter table public.message_templates
  add column requires_table_numbers boolean not null default false,
  add column requires_gifting boolean not null default false;

comment on column public.message_templates.requires_table_numbers is
  'Body carries the guest''s table number. Resolved per guest: a guest with no table_id gets the false row.';
comment on column public.message_templates.requires_gifting is
  'Copy mentions gifting alongside navigation. Resolved per event from paybox_config/bit_config.';

alter table public.message_templates
  drop constraint message_templates_key_channel_key;

alter table public.message_templates
  add constraint message_templates_family_config_key
  unique (key, channel, requires_table_numbers, requires_gifting);

-- 2. Rewrite the two existing reminder rows as the plain configuration ---------
-- Updated in place rather than replaced so the FKs on schedules and
-- event_type_default_schedules stay valid and need no repointing. The WhatsApp
-- row loses its Waze and Bit buttons and gains the reminder link in the body,
-- which is a structural change to an approved template, so it takes a new
-- whatsapp_template_name and must clear Meta review before it can send.

update public.message_templates
set
  whatsapp_template_name = 'event_reminder_casual_v2',
  description = 'Day-of reminder with a link to the reminder page. No table numbers, no gifting.',
  payload = $json$
{
  "bodyText": "היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n🕒 {{4}}\n\nמחכים לראותכם 🎉\nלניווט לאירוע, לחצו על הקישור 👇🏼\n{{5}}",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "buttonPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ]
  }
}
$json$::jsonb
where key = 'event_reminder_casual' and channel = 'whatsapp';

update public.message_templates
set
  description = 'SMS day-of reminder with a link to the reminder page. No table numbers, no gifting.',
  payload = $json$
{
  "bodyText": "היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n🕒 {{4}}\n\nמחכים לראותכם 🎉\nלניווט לאירוע, לחצו על הקישור 👇🏼\n{{5}}",
  "parameters": {
    "headerPlaceholders": [],
    "buttonPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ]
  }
}
$json$::jsonb
where key = 'event_reminder_casual' and channel = 'sms';

-- 3. The remaining six rows of the grid ---------------------------------------
-- Table number sits between the time and the sign-off, where a guest scanning
-- the message for it will look. The gifting axis changes only the lead-in line.

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code,
   whatsapp_template_name, requires_table_numbers, requires_gifting, payload)
values
-- tables, no gifting
(
  'event_reminder_casual', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  'casual', 'Event Reminder - Casual, table numbers',
  'Day-of reminder carrying the guest''s table number. No gifting.',
  'he', 'event_reminder_casual_tables_v2', true, false,
  $json$
{
  "bodyText": "היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n🕒 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n\nמחכים לראותכם 🎉\nלניווט לאירוע, לחצו על הקישור 👇🏼\n{{6}}",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "buttonPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ]
  }
}
$json$::jsonb
),
(
  'event_reminder_casual', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  'casual', 'Event Reminder - Casual, table numbers (SMS)',
  'SMS day-of reminder carrying the guest''s table number. No gifting.',
  'he', null, true, false,
  $json$
{
  "bodyText": "היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n🕒 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n\nמחכים לראותכם 🎉\nלניווט לאירוע, לחצו על הקישור 👇🏼\n{{6}}",
  "parameters": {
    "headerPlaceholders": [],
    "buttonPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ]
  }
}
$json$::jsonb
),
-- no tables, gifting
(
  'event_reminder_casual', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  'casual', 'Event Reminder - Casual, gifting',
  'Day-of reminder whose link line mentions gifting as well as navigation.',
  'he', 'event_reminder_casual_gift_v2', false, true,
  $json$
{
  "bodyText": "היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n🕒 {{4}}\n\nמחכים לראותכם 🎉\nלניווט לאירוע ולשליחת מתנה, לחצו על הקישור 👇🏼\n{{5}}",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "buttonPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ]
  }
}
$json$::jsonb
),
(
  'event_reminder_casual', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  'casual', 'Event Reminder - Casual, gifting (SMS)',
  'SMS day-of reminder whose link line mentions gifting as well as navigation.',
  'he', null, false, true,
  $json$
{
  "bodyText": "היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n🕒 {{4}}\n\nמחכים לראותכם 🎉\nלניווט לאירוע ולשליחת מתנה, לחצו על הקישור 👇🏼\n{{5}}",
  "parameters": {
    "headerPlaceholders": [],
    "buttonPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ]
  }
}
$json$::jsonb
),
-- tables and gifting
(
  'event_reminder_casual', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  'casual', 'Event Reminder - Casual, table numbers and gifting',
  'Day-of reminder carrying the table number, link line mentions gifting.',
  'he', 'event_reminder_casual_tables_gift_v2', true, true,
  $json$
{
  "bodyText": "היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n🕒 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n\nמחכים לראותכם 🎉\nלניווט לאירוע ולשליחת מתנה, לחצו על הקישור 👇🏼\n{{6}}",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "buttonPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ]
  }
}
$json$::jsonb
),
(
  'event_reminder_casual', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  'casual', 'Event Reminder - Casual, table numbers and gifting (SMS)',
  'SMS day-of reminder carrying the table number, link line mentions gifting.',
  'he', null, true, true,
  $json$
{
  "bodyText": "היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n🕒 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n\nמחכים לראותכם 🎉\nלניווט לאירוע ולשליחת מתנה, לחצו על הקישור 👇🏼\n{{6}}",
  "parameters": {
    "headerPlaceholders": [],
    "buttonPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ]
  }
}
$json$::jsonb
);

-- 4. Guard --------------------------------------------------------------------
-- The resolver hard-fails a send when no row matches, so an incomplete grid is
-- a day-of reminder that never goes out. Assert the whole grid landed, that the
-- table rows really carry six placeholders (a missing one would send a literal
-- {{6}} to a guest), and that every WhatsApp row has a distinct Meta name.

do $$
declare
  v_rows int;
  v_bad_placeholders int;
  v_wa_names int;
begin
  select count(*) into v_rows
  from public.message_templates
  where key = 'event_reminder_casual';

  if v_rows <> 8 then
    raise exception
      'event_reminder_template_variants: expected 8 rows in the casual family, found %',
      v_rows;
  end if;

  select count(*) into v_bad_placeholders
  from public.message_templates
  where key = 'event_reminder_casual'
    and jsonb_array_length(payload -> 'parameters' -> 'placeholders')
        <> (case when requires_table_numbers then 6 else 5 end);

  if v_bad_placeholders > 0 then
    raise exception
      'event_reminder_template_variants: % row(s) have the wrong placeholder count',
      v_bad_placeholders;
  end if;

  select count(distinct whatsapp_template_name) into v_wa_names
  from public.message_templates
  where key = 'event_reminder_casual' and channel = 'whatsapp';

  if v_wa_names <> 4 then
    raise exception
      'event_reminder_template_variants: expected 4 distinct whatsapp template names, found %',
      v_wa_names;
  end if;
end $$;

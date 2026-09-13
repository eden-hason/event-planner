-- Wedding event-reminder template, v1 of the new naming convention.
--
-- Going forward, message_templates rows are named:
--   key                    = {event_type}_{schedule_type}_{variant}
--   variant                = a short slug ("1", "2", ...)
--   name                   = "{Event Type Name} {Schedule Type Name} - {variant}[, axis...]"
--   whatsapp_template_name = {key}_{axis-suffixes: tables, note, gift} (no
--   language code, no revision suffix). Meta lets you edit an approved
--   template's body/buttons in place under the same name - that just costs a
--   ~24h re-review, no new name needed. A name is only forced to change if the
--   template was deleted in Meta (which locks that name for 30 days - see the
--   _v2/_v3 history on event_reminder_casual), which is not expected here.
-- The event type is baked into the identifiers (not just a naming nicety):
-- this family's copy says "לחתונה" and is only ever meant for wedding events.
-- Existing pre-convention templates (event_reminder_casual and friends) are
-- left exactly as they are - this only binds new templates from here on.
--
-- Content-wise this is a rewrite of the reminder message, not a copy edit:
--   * The Waze/gift buttons are gone. There is a single "visit website" URL
--     button whose fixed base is /r/ (same trick as the body-embedded link
--     the previous family used) and whose dynamic suffix is event.shortCode -
--     Meta buttons only support a fixed base + a dynamic suffix, they cannot
--     point at an arbitrary per-event URL, which is why the /r/<shortCode>
--     landing page exists at all (it does the actual nav/gift branching).
--   * The button's own label depends on whether gifting is configured -
--     "ניווט לאירוע" vs "ניווט ומתנות" - which makes gifting a *label* axis
--     bound at Meta-approval time (structural, like table numbers), not a
--     body-copy axis like the old family's requires_gifting was. (The
--     pre-existing event_reminder_casual family uses "לניווט" /
--     "לניווט והענקת מתנה" for the same idea - this family deliberately uses
--     its own wording instead.)
--   * A new axis, requires_note, carries an organiser-authored free-text line
--     (e.g. a custom note) into the body. It is per *schedule instance*, not
--     per event - schedules.custom_text - because two schedules of the same
--     type on the same event could carry different notes. Like the other two
--     axes, a family that offers it must be complete on it: the resolver
--     hard-fails on a missing cell rather than silently dropping the note.
--
-- Grid: table-numbers x note x gifting = 8 WhatsApp rows (each needs its own
-- Meta approval - the button label is baked into the approved template).
-- SMS has no button, so gifting doesn't apply to it: table-numbers x note = 4
-- rows, keeping the /r/<shortCode> link as a plain-text line like today.
--
-- The wedding default for event_reminder is repointed at this family
-- immediately (accepting the risk that a reminder could fire before all 8
-- WhatsApp variants clear Meta review). henna/bar_mitzva/bat_mitzva have no
-- event_reminder default today and none is added here.

-- 1. New axis ------------------------------------------------------------

alter table public.message_templates
  add column requires_note boolean not null default false;

comment on column public.message_templates.requires_note is
  'Body carries an organiser-authored free-text line. Resolved per schedule instance from schedules.custom_text, not per event - see resolve-reminder-templates.ts.';

alter table public.message_templates
  drop constraint message_templates_family_config_key;

alter table public.message_templates
  add constraint message_templates_family_config_key
  unique (key, channel, requires_table_numbers, requires_gifting, requires_note);

-- 2. Where the organiser's note text actually lives -----------------------

alter table public.schedules
  add column custom_text text;

comment on column public.schedules.custom_text is
  'Organiser-authored free-text line for this schedule instance (e.g. a custom note). Read by templates whose family offers requires_note - see resolve-reminder-templates.ts. Null/blank means the without-note variant is sent.';

-- 3. The 12-row grid -------------------------------------------------------
-- Button placeholder note: the dynamic parameter is the raw shortCode
-- (transformer "none"), never the full URL - Meta appends it to the button's
-- own fixed base (registered as https://<site>/r/ at template-approval time).
-- The SMS link line uses the full "reminderUrl" transform instead, since it
-- is plain text with no fixed-base button to append to.

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code,
   whatsapp_template_name, requires_table_numbers, requires_gifting, requires_note, payload)
values

-- --- WhatsApp: 4 bodies x 2 button labels = 8 rows -------------------------

(
  'wedding_event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1',
  'Day-of wedding reminder. No table number, no note. Button navigates only.',
  'he', 'wedding_event_reminder_1', false, false, false,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "ניווט לאירוע",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),
(
  'wedding_event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1, gifting button',
  'Day-of wedding reminder. No table number, no note. Button mentions gifting.',
  'he', 'wedding_event_reminder_1_gift', false, true, false,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "ניווט ושליחת מתנה",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),
(
  'wedding_event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1, table numbers',
  'Day-of wedding reminder carrying the guest''s table number. No note. Button navigates only.',
  'he', 'wedding_event_reminder_1_tables', true, false, false,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "ניווט לאירוע",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),
(
  'wedding_event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1, table numbers, gifting button',
  'Day-of wedding reminder carrying the guest''s table number. No note. Button mentions gifting.',
  'he', 'wedding_event_reminder_1_tables_gift', true, true, false,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "ניווט ושליחת מתנה",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),
(
  'wedding_event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1, note',
  'Day-of wedding reminder carrying the organiser''s note. No table number. Button navigates only.',
  'he', 'wedding_event_reminder_1_note', false, false, true,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n{{5}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "schedule.customText", "source": "schedule.customText", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "ניווט לאירוע",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),
(
  'wedding_event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1, note, gifting button',
  'Day-of wedding reminder carrying the organiser''s note. No table number. Button mentions gifting.',
  'he', 'wedding_event_reminder_1_note_gift', false, true, true,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n{{5}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "schedule.customText", "source": "schedule.customText", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "ניווט ושליחת מתנה",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),
(
  'wedding_event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1, table numbers, note',
  'Day-of wedding reminder carrying the table number and the organiser''s note. Button navigates only.',
  'he', 'wedding_event_reminder_1_tables_note', true, false, true,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n{{6}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" },
      { "name": "schedule.customText", "source": "schedule.customText", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "ניווט לאירוע",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),
(
  'wedding_event_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1, table numbers, note, gifting button',
  'Day-of wedding reminder carrying the table number and the organiser''s note. Button mentions gifting.',
  'he', 'wedding_event_reminder_1_tables_note_gift', true, true, true,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n{{6}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" },
      { "name": "schedule.customText", "source": "schedule.customText", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "ניווט ושליחת מתנה",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),

-- --- SMS: table x note = 4 rows (no gifting axis, no button) --------------

(
  'wedding_event_reminder_1', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1 (SMS)',
  'SMS day-of wedding reminder. No table number, no note.',
  'he', null, false, false, false,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n\nמחכים לחגוג איתכם ❤️\nלניווט ולפרטים נוספים:\n{{5}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),
(
  'wedding_event_reminder_1', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1, table numbers (SMS)',
  'SMS day-of wedding reminder carrying the guest''s table number. No note.',
  'he', null, true, false, false,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n\nמחכים לחגוג איתכם ❤️\nלניווט ולפרטים נוספים:\n{{6}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),
(
  'wedding_event_reminder_1', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1, note (SMS)',
  'SMS day-of wedding reminder carrying the organiser''s note. No table number.',
  'he', null, false, false, true,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n{{5}}\n\nמחכים לחגוג איתכם ❤️\nלניווט ולפרטים נוספים:\n{{6}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "schedule.customText", "source": "schedule.customText", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),
(
  'wedding_event_reminder_1', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Wedding Event Reminder - 1, table numbers, note (SMS)',
  'SMS day-of wedding reminder carrying the table number and the organiser''s note.',
  'he', null, true, false, true,
  $json$
{
  "bodyText": "תזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n📍 {{3}}\n🕐 {{4}}\n🪑 מספר השולחן שלכם: {{5}}\n{{6}}\n\nמחכים לחגוג איתכם ❤️\nלניווט ולפרטים נוספים:\n{{7}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "host.bride.name", "source": "event.hostDetails.bride.name", "transformer": "none" },
      { "name": "host.groom.name", "source": "event.hostDetails.groom.name", "transformer": "none" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" },
      { "name": "schedule.customText", "source": "schedule.customText", "transformer": "none" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
);

-- 4. Repoint the wedding default at this family -----------------------------
-- The anchor's own axis flags are ignored by the resolver (it is a pointer
-- into the family, not a promise about which body ships), so any row would
-- do; the plain WhatsApp row is used for readability.

update public.event_type_default_schedules eds
set template_id = mt.id
from public.message_templates mt
where mt.key = 'wedding_event_reminder_1'
  and mt.channel = 'whatsapp'
  and mt.requires_table_numbers = false
  and mt.requires_gifting = false
  and mt.requires_note = false
  and eds.event_type_id = (select id from public.event_types where key = 'wedding')
  and eds.schedule_type_id = (select id from public.schedule_types where key = 'event_reminder');

-- 5. Guard -------------------------------------------------------------------
-- Assert the whole grid landed (8 WhatsApp + 4 SMS), that every row carries
-- the placeholder count its axes imply (a missing one would send a literal
-- {{n}} to a guest), that every WhatsApp row has a distinct Meta name, and
-- that the wedding default was actually repointed.

do $$
declare
  v_wa_rows int;
  v_sms_rows int;
  v_bad_placeholders int;
  v_wa_names int;
  v_default_ok boolean;
begin
  select count(*) into v_wa_rows
  from public.message_templates
  where key = 'wedding_event_reminder_1' and channel = 'whatsapp';

  if v_wa_rows <> 8 then
    raise exception
      'wedding_event_reminder_v1_template: expected 8 WhatsApp rows, found %', v_wa_rows;
  end if;

  select count(*) into v_sms_rows
  from public.message_templates
  where key = 'wedding_event_reminder_1' and channel = 'sms';

  if v_sms_rows <> 4 then
    raise exception
      'wedding_event_reminder_v1_template: expected 4 SMS rows, found %', v_sms_rows;
  end if;

  select count(*) into v_bad_placeholders
  from public.message_templates
  where key = 'wedding_event_reminder_1'
    and jsonb_array_length(payload -> 'parameters' -> 'placeholders')
        <> (
          (case when channel = 'sms' then 5 else 4 end)
          + (case when requires_table_numbers then 1 else 0 end)
          + (case when requires_note then 1 else 0 end)
        );

  if v_bad_placeholders > 0 then
    raise exception
      'wedding_event_reminder_v1_template: % row(s) have the wrong placeholder count',
      v_bad_placeholders;
  end if;

  select count(distinct whatsapp_template_name) into v_wa_names
  from public.message_templates
  where key = 'wedding_event_reminder_1' and channel = 'whatsapp';

  if v_wa_names <> 8 then
    raise exception
      'wedding_event_reminder_v1_template: expected 8 distinct whatsapp template names, found %',
      v_wa_names;
  end if;

  select exists (
    select 1
    from public.event_type_default_schedules eds
    join public.message_templates mt on mt.id = eds.template_id
    where eds.event_type_id = (select id from public.event_types where key = 'wedding')
      and eds.schedule_type_id = (select id from public.schedule_types where key = 'event_reminder')
      and mt.key = 'wedding_event_reminder_1'
  ) into v_default_ok;

  if not v_default_ok then
    raise exception
      'wedding_event_reminder_v1_template: wedding event_reminder default was not repointed';
  end if;
end $$;

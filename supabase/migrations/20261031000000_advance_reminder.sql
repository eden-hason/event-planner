-- The Advance Reminder: a reminder sent on a day before the Event (ADR 0051).
--
-- The Event Reminder cannot be moved earlier. Its copy opens on event.todayLine
-- ("...מתקיימת היום"), and pinnedDueDay keeps every event_reminder Schedule on the
-- Event day so that line stays true. A reminder before the day is therefore a
-- Schedule Type of its own, between Confirmation and Event Reminder, rather than a
-- second family of event_reminder: the day rule, the Personal Message frame, the
-- gift-button default, labels and icons are all keyed by Schedule Type.
--
-- What it says: the Event's day by name, never "today" or "tomorrow", so it reads
-- right on whichever day before the Event it goes out. The opening line is
-- event.approachingLine ("החתונה של נועה ודורון מתקרבת"), the Confirmation
-- follow-up's, true on any day before and agreeing with the occasion. The date is
-- formatDate full / he-IL, which prints the weekday, as in save_the_date_1.
--
-- Who it goes to: every Guest who has not declined. That is a new audience,
-- 'not_declined', since target_status could only name one RSVP status or everyone.
-- Which form a Guest gets is picked per Guest, the way the table-number row is:
--   - confirmed: the reminder, no buttons
--   - pending:   the same reminder plus confirmation_1's two RSVP quick replies,
--                which open the Confirmation Conversation like a tap on any
--                Confirmation (every Delivery carries its own token)
-- That choice is the new requires_rsvp_ask axis. No table number (seating still
-- moves days before), no gift button, no note, no Personal Message.
--
-- Grid: 2 WhatsApp rows, each its own Meta approval (Utility), and 2 SMS rows. The
-- pending SMS ends in the Guest's /c/<token> RSVP link instead of buttons.
--
-- Rollout: no Event Type gets it by default. An Operator adds one to an Event from
-- the Back Office. Push only after Meta has approved both WhatsApp rows.

-- 1. The Schedule Type ------------------------------------------------------------

update public.schedule_types
set sort_order = sort_order + 1
where sort_order >= 3;

insert into public.schedule_types (key, name, sort_order, execution_kind)
values ('advance_reminder', 'Advance Reminder', 3, 'message');

-- 2. The audience: everyone who has not declined ------------------------------------

alter table public.schedules
  drop constraint schedules_target_status_check;

alter table public.schedules
  add constraint schedules_target_status_check
  check (target_status in ('pending', 'confirmed', 'not_declined'));

alter table public.event_type_default_schedules
  drop constraint event_type_default_schedules_target_status_check;

alter table public.event_type_default_schedules
  add constraint event_type_default_schedules_target_status_check
  check (target_status in ('pending', 'confirmed', 'not_declined'));

-- 3. The per-Guest axis -------------------------------------------------------------

alter table public.message_templates
  add column requires_rsvp_ask boolean not null default false;

comment on column public.message_templates.requires_rsvp_ask is
  'Asks a Guest who has not answered yet whether they are coming, with RSVP quick replies. Resolved per guest: true for a pending Guest when the family offers it.';

alter table public.message_templates
  drop constraint message_templates_family_config_key;

alter table public.message_templates
  add constraint message_templates_family_config_key
  unique (key, channel, requires_table_numbers, requires_gifting, requires_note, requires_follow_up,
          requires_invitation_image, requires_rsvp_ask);

drop index public.message_templates_personal_message_cell_key;

create unique index message_templates_personal_message_cell_key
  on public.message_templates (schedule_type_id, channel, language_code, requires_table_numbers,
    requires_gifting, requires_note, requires_follow_up, requires_invitation_image, requires_rsvp_ask)
  where personal_message;

-- 4. The family ---------------------------------------------------------------------

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code,
   whatsapp_template_name, requires_table_numbers, requires_gifting, requires_note,
   requires_follow_up, requires_invitation_image, requires_rsvp_ask, payload)
values

(
  'advance_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'advance_reminder'),
  '1', 'Advance Reminder - 1',
  'Reminder on a day before the Event, any event type, to a confirmed Guest. No buttons.',
  'he', 'advance_reminder_1', false, false, false, false, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n🕐 {{4}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "event.approachingLine", "source": "event.approachingLine", "transformer": "none" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

(
  'advance_reminder_1', 'whatsapp',
  (select id from public.schedule_types where key = 'advance_reminder'),
  '1', 'Advance Reminder - 1, RSVP ask',
  'Reminder on a day before the Event, any event type, to a Guest who has not answered. RSVP quick replies.',
  'he', 'advance_reminder_1_rsvp', false, false, false, false, false, true,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n🕐 {{4}}\n\nעוד לא עדכנתם אם תגיעו - נשמח לדעת 🙏🏼",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "event.approachingLine", "source": "event.approachingLine", "transformer": "none" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "quick_reply", "text": "נגיע בשמחה",
        "placeholders": [{ "source": "confirmationToken", "transformer": "rsvpYesPayload" }]
      },
      {
        "index": 1, "subType": "quick_reply", "text": "לא נוכל להגיע",
        "placeholders": [{ "source": "confirmationToken", "transformer": "rsvpNoPayload" }]
      }
    ]
  }
}
$json$::jsonb
),

(
  'advance_reminder_1', 'sms',
  (select id from public.schedule_types where key = 'advance_reminder'),
  '1', 'Advance Reminder - 1 (SMS)',
  'Reminder on a day before the Event, any event type, to a confirmed Guest. SMS rendition, no link.',
  'he', null, false, false, false, false, false, false,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n🕐 {{4}}\n\nמחכים לחגוג איתכם ❤️",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "event.approachingLine", "source": "event.approachingLine", "transformer": "none" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

(
  'advance_reminder_1', 'sms',
  (select id from public.schedule_types where key = 'advance_reminder'),
  '1', 'Advance Reminder - 1, RSVP ask (SMS)',
  'Reminder on a day before the Event, any event type, to a Guest who has not answered. SMS rendition, ending in their RSVP link.',
  'he', null, false, false, false, false, false, true,
  $json$
{
  "bodyText": "תזכורת 🎉\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n🕐 {{4}}\n\nעוד לא עדכנתם אם תגיעו - לאישור הגעה: {{5}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "event.approachingLine", "source": "event.approachingLine", "transformer": "none" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "rsvpUrl", "source": "confirmationToken", "transformer": "rsvpUrl" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
);

-- 5. Guard --------------------------------------------------------------------------
-- The type sits between Confirmation and Event Reminder, the grid landed whole with
-- one row per channel and axis value, the WhatsApp names are distinct, only the ask
-- rows carry quick replies (exactly two) and nothing carries a URL button, and the
-- pending SMS is the only row with a fifth placeholder.

do $$
declare
  v_order text;
  v_rows int;
  v_wa_names int;
  v_bad_buttons int;
  v_bad_placeholders int;
begin
  select string_agg(key, ',' order by sort_order) into v_order
  from public.schedule_types
  where key in ('confirmation', 'advance_reminder', 'event_reminder');
  if v_order <> 'confirmation,advance_reminder,event_reminder' then
    raise exception 'advance_reminder: schedule types are ordered %', v_order;
  end if;

  select count(*) into v_rows
  from public.message_templates
  where key = 'advance_reminder_1'
    and not (requires_table_numbers or requires_gifting or requires_note
             or requires_follow_up or requires_invitation_image);
  if v_rows <> 4
     or (select count(distinct (channel, requires_rsvp_ask))
         from public.message_templates where key = 'advance_reminder_1') <> 4 then
    raise exception 'advance_reminder: expected one row per channel and RSVP ask, found % rows', v_rows;
  end if;

  select count(distinct whatsapp_template_name) into v_wa_names
  from public.message_templates where key = 'advance_reminder_1' and channel = 'whatsapp';
  if v_wa_names <> 2 then
    raise exception 'advance_reminder: expected 2 distinct whatsapp template names, found %', v_wa_names;
  end if;

  select count(*) into v_bad_buttons
  from public.message_templates mt
  where mt.key = 'advance_reminder_1'
    and (
      (select count(*) from jsonb_array_elements(mt.payload -> 'parameters' -> 'buttonPlaceholders') b
       where b ->> 'subType' = 'quick_reply')
        <> (case when mt.channel = 'whatsapp' and mt.requires_rsvp_ask then 2 else 0 end)
      or exists (
        select 1 from jsonb_array_elements(mt.payload -> 'parameters' -> 'buttonPlaceholders') b
        where b ->> 'subType' = 'url'
      )
    );
  if v_bad_buttons > 0 then
    raise exception 'advance_reminder: % row(s) have the wrong buttons', v_bad_buttons;
  end if;

  select count(*) into v_bad_placeholders
  from public.message_templates
  where key = 'advance_reminder_1'
    and jsonb_array_length(payload -> 'parameters' -> 'placeholders')
        <> (case when channel = 'sms' and requires_rsvp_ask then 5 else 4 end);
  if v_bad_placeholders > 0 then
    raise exception 'advance_reminder: % row(s) have the wrong placeholder count', v_bad_placeholders;
  end if;
end $$;

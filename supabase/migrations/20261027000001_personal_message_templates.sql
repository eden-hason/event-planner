-- Personal Message: the Owner's own paragraph inside a fixed Kululu frame (ADR 0046).
--
-- A Personal Message is an alternative to a Variant, not one of them, so it is not
-- seeded into each Variant family. There is one Personal Message family per Schedule
-- Type, found by schedule type rather than by key, and the resolver swaps to it
-- whenever the Schedule carries Personal Message text. Every Schedule therefore gets
-- the option whatever family it is anchored on, legacy ones included
-- (wedding_event_reminder_1, event_reminder_casual), and schedules.template_id keeps
-- naming the Variant that is sent when the text is blank.
--
-- The text lives in its own column, not schedules.custom_text. The personal note is
-- retired, but the Schedules that already carry one keep sending it on their note rows.
-- A Schedule holding both sends the Personal Message: its family offers no note axis,
-- so the note is ignored by the resolver's ordinary rules.
--
-- Every frame opens on the same greeting, "משפחה וחברים יקרים,", and the Owner's
-- paragraph follows it directly: the Owner says who is inviting, to what, and (on a
-- reminder) that it is today. The frame keeps only the facts - date and venue, time and
-- table on a reminder - and the stage's buttons. No frame carries an Occasion Phrase or
-- event.todayLine, so a Personal Message sends for an Event with no hosts named.
-- Placeholders and buttons are the same as the current default families
-- (save_the_date_1_no_button, confirmation_1, event_reminder_1, thank_you_1). The
-- paragraph never opens or closes the body and never sits directly against another
-- variable, which Meta's review rejects.
--
-- The paragraph goes through the personalMessage transformer on both channels: a line
-- break becomes " | ", so what the Owner previews is what every Guest gets, and Meta
-- never sees a newline inside a parameter (error 132018). At most 300 characters.
--
-- Meta category: MARKETING, deliberately (ADR 0046). Kululu does not author the
-- paragraph, so it cannot promise Meta it is non-promotional.
--
-- Axes:
--   initial_invitation  invitation image; no button, like save_the_date_1_no_button
--   confirmation        invitation image; no follow-up axis - the Owner writes each
--                       round's paragraph, so one frame serves every round
--   event_reminder      table numbers x gifting (gifting adds the /r/ button)
--   post_event          gifting
-- Grid: 10 WhatsApp rows (each its own Meta approval) and 6 SMS rows. Templates are
-- specified in docs/design/personal-message-templates.md.
--
-- Rollout: the option is shown as soon as this is on production, before Meta has
-- approved the ten WhatsApp templates. That risk was accepted.

-- 1. Where the Owner's paragraph lives --------------------------------------

alter table public.schedules
  add column personal_message text
  constraint schedules_personal_message_length check (char_length(personal_message) <= 300);

comment on column public.schedules.personal_message is
  'The Owner''s Personal Message for this Schedule (ADR 0046). Null means the Schedule sends its Variant (template_id). When set, the resolver sends the Schedule Type''s Personal Message family instead.';

-- 2. Which catalog rows are Personal Message frames ---------------------------

alter table public.message_templates
  add column personal_message boolean not null default false;

comment on column public.message_templates.personal_message is
  'Row belongs to its Schedule Type''s Personal Message family: a Kululu frame around schedule.personalMessage. Looked up by schedule type, not by key - see resolve-reminder-templates.ts.';

-- One frame per Schedule Type, channel, language and axis cell, so the lookup by
-- schedule type can never find two candidates for the same configuration.
create unique index message_templates_personal_message_cell_key
  on public.message_templates
  (schedule_type_id, channel, language_code, requires_table_numbers, requires_gifting,
   requires_note, requires_follow_up, requires_invitation_image)
  where personal_message;

-- 3. The families ------------------------------------------------------------

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code,
   whatsapp_template_name, requires_table_numbers, requires_gifting, requires_note,
   requires_follow_up, requires_invitation_image, personal_message, payload)
values

-- --- Initial Invitation: 2 WhatsApp + 1 SMS ----------------------------------

(
  'personal_message_initial_invitation', 'whatsapp',
  (select id from public.schedule_types where key = 'initial_invitation'),
  '1', 'Personal Message - Initial Invitation',
  'Invitation in the Owner''s words, no invitation image, no button.',
  'he', 'personal_message_initial_invitation', false, false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לראותכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),
(
  'personal_message_initial_invitation', 'whatsapp',
  (select id from public.schedule_types where key = 'initial_invitation'),
  '1', 'Personal Message - Initial Invitation, invitation image',
  'Invitation in the Owner''s words with the invitation image as header, no button.',
  'he', 'personal_message_initial_invitation_image', false, false, false, false, true, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לראותכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": "IMAGE",
  "parameters": {
    "headerPlaceholders": [{ "type": "image", "source": "event.invitations.imageUrl" }],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),
(
  'personal_message_initial_invitation', 'sms',
  (select id from public.schedule_types where key = 'initial_invitation'),
  '1', 'Personal Message - Initial Invitation',
  'Invitation in the Owner''s words, SMS rendition, ending in the details link.',
  'he', null, false, false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לראותכם ❤️\nלפרטים והוספה ליומן:\n{{4}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.saveTheDateUrl", "source": "event.shortCode", "transformer": "saveTheDateUrl" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

-- --- Confirmation: 2 WhatsApp + 1 SMS ----------------------------------------

(
  'personal_message_confirmation', 'whatsapp',
  (select id from public.schedule_types where key = 'confirmation'),
  '1', 'Personal Message - Confirmation',
  'Confirmation in the Owner''s words, every round. Quick replies start the Confirmation Conversation.',
  'he', 'personal_message_confirmation', false, false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לדעת אם תגיעו 🙏🏼",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" }
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
  'personal_message_confirmation', 'whatsapp',
  (select id from public.schedule_types where key = 'confirmation'),
  '1', 'Personal Message - Confirmation, invitation image',
  'Confirmation in the Owner''s words with the invitation image as header, every round.',
  'he', 'personal_message_confirmation_image', false, false, false, false, true, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לדעת אם תגיעו 🙏🏼",
  "footerText": null,
  "headerText": null,
  "headerType": "IMAGE",
  "parameters": {
    "headerPlaceholders": [{ "type": "image", "source": "event.invitations.imageUrl" }],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" }
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
  'personal_message_confirmation', 'sms',
  (select id from public.schedule_types where key = 'confirmation'),
  '1', 'Personal Message - Confirmation',
  'Confirmation in the Owner''s words, SMS rendition. Link only - the conversation is WhatsApp-only.',
  'he', null, false, false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לדעת אם תגיעו 🙏🏼\nלאישור הגעה: {{4}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
      {
        "name": "event.eventDate", "source": "event.eventDate", "transformer": "formatDate",
        "transformerOptions": { "format": "full", "locale": "he-IL" }
      },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "rsvpUrl", "source": "confirmationToken", "transformer": "rsvpUrl" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),

-- --- Event Reminder: 4 WhatsApp + 2 SMS --------------------------------------

(
  'personal_message_event_reminder', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Personal Message - Event Reminder',
  'Day-of reminder in the Owner''s words. Navigation button only.',
  'he', 'personal_message_event_reminder', false, false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
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
  'personal_message_event_reminder', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Personal Message - Event Reminder, gifting button',
  'Day-of reminder in the Owner''s words. Navigation and gift buttons.',
  'he', 'personal_message_event_reminder_gift', false, true, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "ניווט לאירוע",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      },
      {
        "index": 1, "subType": "url", "text": "שליחת מתנה",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),
(
  'personal_message_event_reminder', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Personal Message - Event Reminder, table numbers',
  'Day-of reminder in the Owner''s words carrying the guest''s table number. Navigation button only.',
  'he', 'personal_message_event_reminder_tables', true, false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n🪑 מספר השולחן שלכם: {{4}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
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
  'personal_message_event_reminder', 'whatsapp',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Personal Message - Event Reminder, table numbers, gifting button',
  'Day-of reminder in the Owner''s words carrying the guest''s table number. Navigation and gift buttons.',
  'he', 'personal_message_event_reminder_tables_gift', true, true, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📍 {{2}}\n🕐 {{3}}\n🪑 מספר השולחן שלכם: {{4}}\n\nמחכים לחגוג איתכם ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
      { "name": "event.venueName", "source": "event.location.name", "transformer": "none" },
      { "name": "event.receptionTime", "source": "event.receptionTime", "transformer": "none" },
      { "name": "guest.tableNumber", "source": "table.tableNumber", "transformer": "none" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "ניווט לאירוע",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      },
      {
        "index": 1, "subType": "url", "text": "שליחת מתנה",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),
(
  'personal_message_event_reminder', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Personal Message - Event Reminder',
  'Day-of reminder in the Owner''s words, SMS rendition, ending in the /r/ link.',
  'he', null, false, false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📍 {{2}}\n🕐 קבלת פנים - {{3}}\n\nמחכים לחגוג איתכם ❤️\nלניווט ולפרטים נוספים:\n{{4}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
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
  'personal_message_event_reminder', 'sms',
  (select id from public.schedule_types where key = 'event_reminder'),
  '1', 'Personal Message - Event Reminder, table numbers',
  'Day-of reminder in the Owner''s words carrying the guest''s table number, SMS rendition.',
  'he', null, true, false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📍 {{2}}\n🕐 קבלת פנים - {{3}}\n🪑 מספר השולחן שלכם: {{4}}\n\nמחכים לחגוג איתכם ❤️\nלניווט ולפרטים נוספים:\n{{5}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
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

-- --- Thank You: 2 WhatsApp + 2 SMS -------------------------------------------

(
  'personal_message_post_event', 'whatsapp',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Personal Message - Thank You',
  'Thank You in the Owner''s words, no button.',
  'he', 'personal_message_post_event', false, false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\nאוהבים ומעריכים ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),
(
  'personal_message_post_event', 'whatsapp',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Personal Message - Thank You, gifting button',
  'Thank You in the Owner''s words with a gift button.',
  'he', 'personal_message_post_event_gift', false, true, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\nאוהבים ומעריכים ❤️",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" }
    ],
    "buttonPlaceholders": [
      {
        "index": 0, "subType": "url", "text": "שליחת מתנה",
        "placeholders": [{ "source": "event.shortCode", "transformer": "none" }]
      }
    ]
  }
}
$json$::jsonb
),
(
  'personal_message_post_event', 'sms',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Personal Message - Thank You',
  'Thank You in the Owner''s words, SMS rendition, no link.',
  'he', null, false, false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\nאוהבים ומעריכים ❤️",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
),
(
  'personal_message_post_event', 'sms',
  (select id from public.schedule_types where key = 'post_event'),
  '1', 'Personal Message - Thank You, gifting link',
  'Thank You in the Owner''s words, SMS rendition, ending in the gift link.',
  'he', null, false, true, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\nאוהבים ומעריכים ❤️\nלשליחת מתנה:\n{{2}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
      { "name": "event.reminderUrl", "source": "event.shortCode", "transformer": "reminderUrl" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
);

-- 4. Guard -------------------------------------------------------------------
-- The resolver hard-fails on a missing cell, so an incomplete family would only be
-- found when a Personal Message is sent. Fail here instead.

do $$
declare
  expected record;
  found integer;
begin
  for expected in
    select * from (values
      ('initial_invitation', 'whatsapp', 2), ('initial_invitation', 'sms', 1),
      ('confirmation',       'whatsapp', 2), ('confirmation',       'sms', 1),
      ('event_reminder',     'whatsapp', 4), ('event_reminder',     'sms', 2),
      ('post_event',         'whatsapp', 2), ('post_event',         'sms', 2)
    ) as e(schedule_type, channel, row_count)
  loop
    select count(*) into found
    from public.message_templates mt
    join public.schedule_types st on st.id = mt.schedule_type_id
    where mt.personal_message
      and st.key = expected.schedule_type
      and mt.channel::text = expected.channel
      and mt.language_code = 'he';

    if found <> expected.row_count then
      raise exception 'Personal Message family for % / % has % rows, expected %',
        expected.schedule_type, expected.channel, found, expected.row_count;
    end if;
  end loop;
end $$;

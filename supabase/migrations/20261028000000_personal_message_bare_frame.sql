-- Bare Frame: a Personal Message Confirmation whose frame carries no Event details.
--
-- The Personal Message frames (20261027000001) keep the Event's date and venue under
-- the Owner's paragraph. Some Owners want to say all of it themselves - the date in
-- their own words, a venue Kululu has spelled differently, or nothing about either -
-- and the frame then repeats or contradicts them. A Bare Frame keeps only what makes
-- the template valid for Meta: the opening greeting before the Owner's paragraph and a
-- closing line after it, so the variable never opens or closes the body. Everything
-- else is the Owner's.
--
-- Confirmation only, for now. It is the one stage whose buttons carry the whole job
-- (the quick replies start the Confirmation Conversation), so a frame with no facts
-- still does what the stage needs. A reminder without the venue and time, or an
-- invitation without the date, is not offered.
--
-- It is a new axis of the Confirmation's Personal Message family, not a second
-- family: the rows share its key and are told apart by bare_frame, which the
-- resolver picks on like any other axis. A family that offers no Bare Frame resolves
-- as if it were off, so the other Schedule Types are untouched.
--
-- The Owner's choice lives on the Schedule beside the paragraph, and only means
-- something while there is a paragraph: a blank Personal Message sends the Variant,
-- so the flag is cleared with it.
--
-- Meta category: MARKETING, as every Personal Message frame (ADR 0046). Templates are
-- specified in docs/design/personal-message-templates.md.

-- 1. The Owner's choice --------------------------------------------------------

alter table public.schedules
  add column personal_message_bare_frame boolean not null default false,
  add constraint schedules_personal_message_bare_frame_needs_text
    check (not personal_message_bare_frame or personal_message is not null);

comment on column public.schedules.personal_message_bare_frame is
  'The Personal Message is sent in its Bare Frame: greeting and closing line only, no Event details. Only set while personal_message is. Ignored by a Schedule Type whose family offers no Bare Frame.';

-- 2. Which frames are bare -----------------------------------------------------

alter table public.message_templates
  add column bare_frame boolean not null default false;

comment on column public.message_templates.bare_frame is
  'Personal Message frame with no Event details, only the greeting and closing line around schedule.personalMessage. Picked when the Schedule sets personal_message_bare_frame - see resolve-reminder-templates.ts.';

-- The new axis is part of what makes a cell unique, in a family and among the
-- Personal Message frames alike.
alter table public.message_templates
  drop constraint message_templates_family_config_key;

alter table public.message_templates
  add constraint message_templates_family_config_key
  unique (key, channel, requires_table_numbers, requires_gifting, requires_note, requires_follow_up,
          requires_invitation_image, bare_frame);

drop index public.message_templates_personal_message_cell_key;

create unique index message_templates_personal_message_cell_key
  on public.message_templates
  (schedule_type_id, channel, language_code, requires_table_numbers, requires_gifting,
   requires_note, requires_follow_up, requires_invitation_image, bare_frame)
  where personal_message;

-- 3. The Confirmation's Bare Frames: 2 WhatsApp + 1 SMS ------------------------

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code,
   whatsapp_template_name, requires_table_numbers, requires_gifting, requires_note,
   requires_follow_up, requires_invitation_image, personal_message, bare_frame, payload)
values
(
  'personal_message_confirmation', 'whatsapp',
  (select id from public.schedule_types where key = 'confirmation'),
  '1', 'Personal Message - Confirmation, bare frame',
  'Confirmation entirely in the Owner''s words, no Event details, every round. Quick replies start the Confirmation Conversation.',
  'he', 'personal_message_confirmation_bare', false, false, false, false, false, true, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\nנשמח לדעת אם תגיעו 🙏🏼",
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
  '1', 'Personal Message - Confirmation, bare frame, invitation image',
  'Confirmation entirely in the Owner''s words with the invitation image as header, no Event details, every round.',
  'he', 'personal_message_confirmation_bare_image', false, false, false, false, true, true, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\nנשמח לדעת אם תגיעו 🙏🏼",
  "footerText": null,
  "headerText": null,
  "headerType": "IMAGE",
  "parameters": {
    "headerPlaceholders": [{ "type": "image", "source": "event.invitations.imageUrl" }],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" }
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
  '1', 'Personal Message - Confirmation, bare frame',
  'Confirmation entirely in the Owner''s words, SMS rendition, no Event details. Link only - the conversation is WhatsApp-only.',
  'he', null, false, false, false, false, false, true, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\nנשמח לדעת אם תגיעו 🙏🏼\nלאישור הגעה: {{2}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "schedule.personalMessage", "source": "schedule.personalMessage", "transformer": "personalMessage" },
      { "name": "rsvpUrl", "source": "confirmationToken", "transformer": "rsvpUrl" }
    ],
    "buttonPlaceholders": []
  }
}
$json$::jsonb
);

-- 4. Guard ---------------------------------------------------------------------
-- The resolver hard-fails on a missing cell once a family offers the axis, so the
-- Confirmation family must be complete on both sides of it. No other family may
-- carry a Bare Frame yet.

do $$
declare
  expected record;
  found integer;
begin
  for expected in
    select * from (values
      ('confirmation', 'whatsapp', false, 2), ('confirmation', 'sms', false, 1),
      ('confirmation', 'whatsapp', true,  2), ('confirmation', 'sms', true,  1)
    ) as e(schedule_type, channel, bare_frame, row_count)
  loop
    select count(*) into found
    from public.message_templates mt
    join public.schedule_types st on st.id = mt.schedule_type_id
    where mt.personal_message
      and st.key = expected.schedule_type
      and mt.channel::text = expected.channel
      and mt.bare_frame = expected.bare_frame
      and mt.language_code = 'he';

    if found <> expected.row_count then
      raise exception 'Personal Message family for % / % (bare_frame=%) has % rows, expected %',
        expected.schedule_type, expected.channel, expected.bare_frame, found, expected.row_count;
    end if;
  end loop;

  select count(*) into found
  from public.message_templates mt
  join public.schedule_types st on st.id = mt.schedule_type_id
  where mt.bare_frame and (not mt.personal_message or st.key <> 'confirmation');

  if found <> 0 then
    raise exception '% Bare Frame rows outside the Confirmation''s Personal Message family', found;
  end if;
end $$;

-- confirmation_1: the conversational Confirmation template, for every event type.
--
-- Two things change at once here.
--
-- 1. The Guest answers inside WhatsApp. The template carries two quick-reply
--    buttons - "נגיע בשמחה" / "לא נוכל להגיע" - and a tap starts a
--    Confirmation Conversation (CONTEXT.md, ADR 0017): Kululu asks how many are
--    coming and about Special Meals with interactive messages, then sends a
--    summary the Guest can reopen. There is no website button: the RSVP page
--    link arrives in the conversation's summary instead, so the template
--    offers exactly one way to answer. Each quick reply's payload is the
--    Delivery's confirmation token plus the answer (see
--    src/features/confirmation/utils/conversation-ids.ts), so a tap identifies
--    its own Guest Record with no stored conversation state. There is no
--    "Not sure" button: a Guest who does not know yet simply does not answer.
--
-- 2. Naming. This is the first event-type-generic family under the convention
--    set in 20260913000000_wedding_event_reminder_v1_template.sql, which is
--    extended rather than broken:
--      key                    = [{event_type}_]{schedule_type}_{variant}
--    An absent event-type prefix means "fits every event type". Hence
--    key = confirmation_1, name = "Confirmation - 1[, axis]", and
--    whatsapp_template_name = confirmation_1[_follow_up][_image].
--    ("general_" was rejected as the prefix: it would collide with a future
--    "general" event type.)
--
-- Generic copy: event-type wording ("חתונה של", "בר המצווה של") cannot live in
-- the fixed text Meta approves, so it arrives in one placeholder, the Occasion
-- Phrase (event.occasionPhrase - built per event type from its hosts). It is
-- written without the article so it joins the preposition directly:
-- "הוזמנתם ל{{1}}" -> "הוזמנתם לחתונה של נועה ודורון", "לבר המצווה של רועי".
-- There is no fallback to the Event's title - an Event with no phrase fails its
-- send with a reason instead (missingOccasionPhrase). An event type without a
-- frame, like a future "general" type, gets a template of its own.
--
-- Header image: the Event's invitation image, when it has one. A second axis,
-- requires_invitation_image, resolved per Event from whether an invitation
-- image is uploaded. It is an axis rather than a Variant: a Variant is an
-- editorial tone the Owner picks, while this follows the Event's setup, like
-- gifting and table numbers do. Resolving it automatically is also what keeps a
-- send from failing - Meta rejects a template approved with an image header
-- when no image comes with it, so an Event without one gets the text-only row.
-- SMS has no header, so the SMS rows do not offer the axis.
--
-- New axis: requires_follow_up. The first Confirmation round opens "הוזמנתם
-- ל{{1}}"; a later round opens with the whole line as one placeholder -
-- event.approachingLine, "החתונה של נועה ודורון מתקרבת" / "בר המצווה של רועי
-- מתקרב" - because its verb agrees with the occasion, which fixed text cannot. It is resolved per Schedule - true when
-- another, unexpired Confirmation Schedule on the same Event has an earlier Due
-- Time (see isFollowUpConfirmation). Same hard-fail-on-missing-row contract as
-- the other axes, so both channels carry both rounds. WhatsApp: round x image =
-- 4 rows, each its own Meta approval; SMS: 2 rows. whatsapp_template_name
-- appends axis suffixes in the order follow_up, image.
-- Registered in Meta as Utility (cheaper, and outside marketing opt-outs and caps).
--
-- Rollout: new Events only. The wedding Confirmation defaults (both rounds) move
-- onto this family, and henna / bar mitzva / bat mitzva - which had no defaults
-- at all - get the same two rounds. Pending Schedules on existing Events are not
-- touched. Push this only after Meta has approved all four WhatsApp rows.

-- 1. The axis -------------------------------------------------------------

alter table public.message_templates
  add column requires_follow_up boolean not null default false;

comment on column public.message_templates.requires_follow_up is
  'Copy for a repeat Confirmation round ("we have not heard from you yet"). Resolved per schedule: true when an earlier, unexpired Confirmation Schedule exists on the Event.';

alter table public.message_templates
  add column requires_invitation_image boolean not null default false;

comment on column public.message_templates.requires_invitation_image is
  'Carries the Event''s invitation image as an image header. Resolved per event: true when an invitation image is uploaded.';

alter table public.message_templates
  drop constraint message_templates_family_config_key;

alter table public.message_templates
  add constraint message_templates_family_config_key
  unique (key, channel, requires_table_numbers, requires_gifting, requires_note, requires_follow_up,
          requires_invitation_image);

-- 2. The family -------------------------------------------------------------

insert into public.message_templates
  (key, channel, schedule_type_id, variant, name, description, language_code,
   whatsapp_template_name, requires_table_numbers, requires_gifting, requires_note,
   requires_follow_up, requires_invitation_image, payload)
values

(
  'confirmation_1', 'whatsapp',
  (select id from public.schedule_types where key = 'confirmation'),
  '1', 'Confirmation - 1',
  'First Confirmation round, any event type. Quick replies start the Confirmation Conversation.',
  'he', 'confirmation_1', false, false, false, false, false,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\nהוזמנתם ל{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לדעת אם תגיעו 🙏🏼",
  "footerText": null,
  "headerText": null,
  "headerType": null,
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "event.occasionPhrase", "source": "event.occasionPhrase", "transformer": "none" },
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
  'confirmation_1', 'whatsapp',
  (select id from public.schedule_types where key = 'confirmation'),
  '1', 'Confirmation - 1, follow-up',
  'Repeat Confirmation round, any event type. Same buttons and conversation as the first round.',
  'he', 'confirmation_1_follow_up', false, false, false, true, false,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לדעת אם תגיעו 🙏🏼",
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
  'confirmation_1', 'whatsapp',
  (select id from public.schedule_types where key = 'confirmation'),
  '1', 'Confirmation - 1, invitation image',
  'First Confirmation round with the invitation image as header. Chosen when the Event has an invitation image.',
  'he', 'confirmation_1_image', false, false, false, false, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\nהוזמנתם ל{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לדעת אם תגיעו 🙏🏼",
  "footerText": null,
  "headerText": null,
  "headerType": "IMAGE",
  "parameters": {
    "headerPlaceholders": [{ "type": "image", "source": "event.invitations.imageUrl" }],
    "placeholders": [
      { "name": "event.occasionPhrase", "source": "event.occasionPhrase", "transformer": "none" },
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
  'confirmation_1', 'whatsapp',
  (select id from public.schedule_types where key = 'confirmation'),
  '1', 'Confirmation - 1, follow-up, invitation image',
  'Repeat Confirmation round with the invitation image as header.',
  'he', 'confirmation_1_follow_up_image', false, false, false, true, true,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לדעת אם תגיעו 🙏🏼",
  "footerText": null,
  "headerText": null,
  "headerType": "IMAGE",
  "parameters": {
    "headerPlaceholders": [{ "type": "image", "source": "event.invitations.imageUrl" }],
    "placeholders": [
      { "name": "event.approachingLine", "source": "event.approachingLine", "transformer": "none" },
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
  'confirmation_1', 'sms',
  (select id from public.schedule_types where key = 'confirmation'),
  '1', 'Confirmation - 1',
  'First Confirmation round, SMS rendition. Link only - the conversation is WhatsApp-only.',
  'he', null, false, false, false, false, false,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\nהוזמנתם ל{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לדעת אם תגיעו 🙏🏼\nלאישור הגעה: {{4}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "event.occasionPhrase", "source": "event.occasionPhrase", "transformer": "none" },
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

(
  'confirmation_1', 'sms',
  (select id from public.schedule_types where key = 'confirmation'),
  '1', 'Confirmation - 1, follow-up',
  'Repeat Confirmation round, SMS rendition. Link only.',
  'he', null, false, false, false, true, false,
  $json$
{
  "bodyText": "משפחה וחברים יקרים,\n{{1}}\n\n📅 {{2}}\n📍 {{3}}\n\nנשמח לדעת אם תגיעו 🙏🏼\nלאישור הגעה: {{4}}",
  "parameters": {
    "headerPlaceholders": [],
    "placeholders": [
      { "name": "event.approachingLine", "source": "event.approachingLine", "transformer": "none" },
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
);

-- 3. Defaults: every event type gets both Confirmation rounds on this family ----
-- The anchor is the first-round WhatsApp row; the anchor's own flags are
-- ignored by the resolver, which picks the round per Schedule.

update public.event_type_default_schedules eds
set template_id = (
  select id from public.message_templates
  where key = 'confirmation_1' and channel = 'whatsapp' and requires_follow_up = false
    and requires_invitation_image = false
)
where eds.event_type_id = (select id from public.event_types where key = 'wedding')
  and eds.schedule_type_id = (select id from public.schedule_types where key = 'confirmation');

insert into public.event_type_default_schedules
  (event_type_id, schedule_type_id, template_id, days_offset, default_time, target_status, sort_order)
select
  et.id,
  (select id from public.schedule_types where key = 'confirmation'),
  (select id from public.message_templates
   where key = 'confirmation_1' and channel = 'whatsapp' and requires_follow_up = false
     and requires_invitation_image = false),
  round.days_offset,
  '10:00',
  'pending',
  round.sort_order
from public.event_types et
cross join (values (-21, 2), (-14, 3)) as round(days_offset, sort_order)
where et.key in ('henna', 'bar_mitzva', 'bat_mitzva')
  and not exists (
    select 1 from public.event_type_default_schedules existing
    where existing.event_type_id = et.id
      and existing.schedule_type_id = (select id from public.schedule_types where key = 'confirmation')
  );

-- 4. Guard -----------------------------------------------------------------

do $$
declare
  v_rows int;
  v_quick_replies int;
  v_types_without int;
begin
  select count(*) into v_rows
  from public.message_templates where key = 'confirmation_1';
  if v_rows <> 6 then
    raise exception 'confirmation_1_template: expected 6 rows, found %', v_rows;
  end if;

  select count(*) into v_quick_replies
  from public.message_templates mt,
       jsonb_array_elements(mt.payload -> 'parameters' -> 'buttonPlaceholders') b
  where mt.key = 'confirmation_1' and mt.channel = 'whatsapp'
    and b ->> 'subType' = 'quick_reply';
  if v_quick_replies <> 8 then
    raise exception 'confirmation_1_template: expected 2 quick replies per WhatsApp row, found % in total', v_quick_replies;
  end if;

  if (select count(*) from public.message_templates
      where key = 'confirmation_1' and requires_invitation_image
        and payload -> 'parameters' -> 'headerPlaceholders' -> 0 ->> 'type' = 'image') <> 2 then
    raise exception 'confirmation_1_template: expected 2 image-header rows';
  end if;

  -- Every event type has exactly two Confirmation defaults, both on this family.
  select count(*) into v_types_without
  from public.event_types et
  where et.key in ('wedding', 'henna', 'bar_mitzva', 'bat_mitzva')
    and (
      select count(*) from public.event_type_default_schedules eds
      join public.message_templates mt on mt.id = eds.template_id
      where eds.event_type_id = et.id
        and eds.schedule_type_id = (select id from public.schedule_types where key = 'confirmation')
        and mt.key = 'confirmation_1'
    ) <> 2;
  if v_types_without > 0 then
    raise exception 'confirmation_1_template: % event type(s) do not have both Confirmation defaults on confirmation_1', v_types_without;
  end if;
end $$;

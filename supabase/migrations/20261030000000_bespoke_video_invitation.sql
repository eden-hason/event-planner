-- A Bespoke Template: one Event's Initial Invitation, sent as fixed wording with a
-- video the Owner uploads (CONTEXT.md, "Bespoke Template").
--
-- One customer asked for a video invitation in their own fixed words. It is a
-- one-off by choice: there is no back office picker and no reusable mechanism for
-- binding a template to an Event. This migration writes the family and points the
-- Event's Initial Invitation Schedule at it. The next customer who wants one is new
-- work, not a click.
--
-- What it is:
--   - WhatsApp: fixed body, the video as header, no variables, no buttons. Submitted
--     to Meta as MARKETING, for the reason in ADR 0046: a body with nothing Guest-
--     or Event-specific in it is not Utility, and claiming it is puts the account's
--     Utility templates at risk.
--   - SMS: the same fixed text, ending in a link to /v/<shortCode>, a guest page that
--     plays the video. Every Template has an SMS Rendition, so SMS Fallback has
--     something to send.
--   - The video lives on the Event (events.invitation_video_url, beside the
--     invitation image) and is uploaded from the schedule page. Its own column, not
--     a key in events.invitations: the event details form rewrites that jsonb whole
--     and would drop it.
--
-- Deliberately not done:
--   - No send gating. A Schedule dated before a video is uploaded goes to Meta with
--     no header, which Meta rejects as a parameter mismatch. That is a Kululu-side
--     failure, so no SMS Fallback fires and no Guest gets half a message.
--   - The binding lands before Meta approves the template. This Event's Initial
--     Invitation was already dated (2026-11-05 19:00 Israel) when this was written,
--     so the template has to be approved and the video uploaded before then, or
--     the Schedule re-dated.
--
-- message_templates.event_id marks the family as belonging to one Event, so no
-- default schedule and no future picker can offer it to another. The Owner sees no
-- message choice on a Schedule anchored on such a row, and the resolver ignores any
-- Personal Message text on it.

-- 1. Where the video lives ------------------------------------------------------

alter table public.events
  add column invitation_video_url text;

comment on column public.events.invitation_video_url is
  'Public URL of the video a Bespoke Template sends as its WhatsApp header and the /v/<shortCode> page plays. Uploaded from the schedule page into the invitation-videos bucket.';

-- 2. Which catalog rows belong to one Event ----------------------------------------

alter table public.message_templates
  add column event_id uuid references public.events (id) on delete cascade;

comment on column public.message_templates.event_id is
  'Set on a Bespoke Template: the one Event it was written for. Null for every catalog row any Event may send.';

-- 3. The bucket ------------------------------------------------------------------
-- Separate from `invitations`, which takes images up to 5 MB. 16 MB and MP4 are
-- WhatsApp's own limits for a video header. Public for the same reason as the
-- invitation image: Meta fetches the header URL unauthenticated. Writes reuse the
-- invitation image's folder check (objects foldered by event id).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invitation-videos', 'invitation-videos', true, 16777216, array['video/mp4'])
on conflict (id) do nothing;

create policy "Invitation videos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'invitation-videos');

create policy "Event owners can upload invitation videos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'invitation-videos'
    and public.user_can_manage_event_invitation((storage.foldername(name))[1])
  );

-- Required by the client's upsert: true.
create policy "Event owners can update invitation videos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'invitation-videos'
    and public.user_can_manage_event_invitation((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'invitation-videos'
    and public.user_can_manage_event_invitation((storage.foldername(name))[1])
  );

create policy "Event owners can delete invitation videos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'invitation-videos'
    and public.user_can_manage_event_invitation((storage.foldername(name))[1])
  );

-- 4. The family and its binding ---------------------------------------------------
-- Skipped, with a notice, where the Event does not exist: a fresh local database
-- has no production Events. On production it must run - check after the push that
-- the Schedule's template_id names the WhatsApp row below.

do $$
declare
  -- The wedding of נועה ודויד, 01/07/2027 (short code PArbUZ).
  v_event_id uuid := '4c3357d8-c15f-4fc7-85fe-3277093c2b51';
  -- The copy as the customer wrote it. The SMS adds one line to introduce the link.
  v_whatsapp_body text := $copy$משפחה וחברים יקרים,

אנו מתכבדים להזמינכם
לשבוע חגיגות נישואינו.

נשמח לראותכם בכל אירועי השבוע,
אך יותר מכול נשמח שתהיו איתנו ביום חתונתנו❤️
01/07/2027$copy$;
  v_sms_body text := v_whatsapp_body || E'\n\nלצפייה בהזמנה:';
  v_schedule_type_id uuid;
  v_template_id uuid;
  v_bound int;
begin
  if v_event_id is null or not exists (select 1 from public.events where id = v_event_id) then
    raise notice 'bespoke_video_invitation: event % not found, family not written', v_event_id;
    return;
  end if;

  select id into strict v_schedule_type_id
  from public.schedule_types where key = 'initial_invitation';

  insert into public.message_templates
    (key, channel, schedule_type_id, variant, name, description, language_code,
     whatsapp_template_name, requires_table_numbers, requires_gifting, requires_note,
     requires_follow_up, requires_invitation_image, personal_message, event_id, payload)
  values
  (
    'bespoke_video_invitation', 'whatsapp', v_schedule_type_id,
    '1', 'Bespoke - Video Invitation',
    'One Event''s fixed-wording invitation with its uploaded video as header, no buttons.',
    'he', 'bespoke_video_invitation', false, false, false, false, false, false, v_event_id,
    jsonb_build_object(
      'bodyText', v_whatsapp_body,
      'footerText', null,
      'headerText', null,
      'headerType', 'VIDEO',
      'parameters', jsonb_build_object(
        'headerPlaceholders', jsonb_build_array(
          jsonb_build_object('type', 'video', 'source', 'event.invitationVideoUrl')
        ),
        'placeholders', jsonb_build_array(),
        'buttonPlaceholders', jsonb_build_array()
      )
    )
  )
  returning id into v_template_id;

  insert into public.message_templates
    (key, channel, schedule_type_id, variant, name, description, language_code,
     whatsapp_template_name, requires_table_numbers, requires_gifting, requires_note,
     requires_follow_up, requires_invitation_image, personal_message, event_id, payload)
  values
  (
    'bespoke_video_invitation', 'sms', v_schedule_type_id,
    '1', 'Bespoke - Video Invitation',
    'One Event''s fixed-wording invitation, SMS rendition, ending in the /v/ video page link.',
    'he', null, false, false, false, false, false, false, v_event_id,
    jsonb_build_object(
      'bodyText', v_sms_body || E'\n{{1}}',
      'parameters', jsonb_build_object(
        'headerPlaceholders', jsonb_build_array(),
        'placeholders', jsonb_build_array(
          jsonb_build_object(
            'name', 'event.videoPageUrl', 'source', 'event.shortCode',
            'transformer', 'videoPageUrl'
          )
        ),
        'buttonPlaceholders', jsonb_build_array()
      )
    )
  );

  -- Point the Event's Initial Invitation at the family. Its Personal Message text,
  -- if any, is cleared: the Owner is shown no message choice on this Schedule.
  update public.schedules
  set template_id = v_template_id, personal_message = null
  where event_id = v_event_id
    and schedule_type_id = v_schedule_type_id
    and sent_at is null
    and dispatched_at is null;
  get diagnostics v_bound = row_count;

  if v_bound <> 1 then
    raise exception 'bespoke_video_invitation: expected 1 unsent Initial Invitation on event %, bound %',
      v_event_id, v_bound;
  end if;
end;
$$;

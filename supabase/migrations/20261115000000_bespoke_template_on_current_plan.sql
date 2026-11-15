-- A Bespoke Template on a current-plan Event.
--
-- An invitation video went out to Esther & Meir's guests at a resolution their
-- phones could not play, and the fix is a one-off re-send: the fixed video as a
-- WhatsApp header, a fixed text, no RSVP buttons. That is a Bespoke Template,
-- which until now only a Classic Event could carry. The send path learned to
-- send one on a current Event in 3c9f089 (rendersFromMessagePlan); this lets
-- the row exist.
--
-- enforce_schedule_message_plan refused it twice over: initial_invitation is a
-- Classic Schedule Type, and a current message Schedule has no template_id
-- (ADR 0055). It now allows exactly one shape: an initial_invitation Schedule
-- whose template_id is a Bespoke Template of the same Event (message_templates
-- .event_id = the Schedule's event_id), with none of the plan's choices set.
-- A catalog template, another Event's Bespoke Template, or any other Schedule
-- Type is refused as before, and so is everything else the trigger guarded.
--
-- Rows like this are written by an Operator by hand; nothing in the app
-- creates them.

create or replace function public.enforce_schedule_message_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.message_plan;
  v_key  text;
  v_bespoke boolean;
begin
  select e.message_plan into v_plan from public.events e where e.id = new.event_id;
  select st.key into v_key from public.schedule_types st where st.id = new.schedule_type_id;

  if v_plan is null then
    return new;  -- the foreign key reports the missing Event
  end if;

  if v_plan = 'classic' then
    if v_key in ('invitation', 'follow_up') then
      raise exception 'Schedule Type % belongs to the current Message Plan; Event % is Classic', v_key, new.event_id
        using errcode = 'check_violation';
    end if;
    if new.wording is not null or new.personal_text is not null
       or new.attachment is not null or new.gift_button is not null then
      raise exception 'wording, personal_text, attachment and gift_button are for the current Message Plan; Event % is Classic', new.event_id
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- current
  -- The one exception: a Bespoke Template of this same Event, on an
  -- initial_invitation Schedule an Operator writes by hand. It is sent as
  -- written, through the catalog path (rendersFromMessagePlan), and carries
  -- none of the plan's choices.
  v_bespoke := new.template_id is not null and exists (
    select 1 from public.message_templates mt
     where mt.id = new.template_id and mt.event_id = new.event_id
  );
  if v_bespoke then
    if v_key is distinct from 'initial_invitation' then
      raise exception 'A Bespoke Template on the current Message Plan goes on an initial_invitation Schedule, not %', v_key
        using errcode = 'check_violation';
    end if;
    if new.personal_message is not null or new.wording is not null or new.personal_text is not null
       or new.attachment is not null or new.gift_button is not null then
      raise exception 'A Bespoke Template Schedule carries no message choices'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if v_key in ('initial_invitation', 'confirmation', 'advance_reminder') then
    raise exception 'Schedule Type % belongs to the Classic Message Plan; Event % is on the current one', v_key, new.event_id
      using errcode = 'check_violation';
  end if;

  if not public.schedule_type_is_message(new.schedule_type_id) then
    if new.wording is not null or new.personal_text is not null
       or new.attachment is not null or new.gift_button is not null then
      raise exception 'A Schedule of type % carries no message choices', v_key
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.template_id is not null or new.personal_message is not null then
    raise exception 'A Schedule on the current Message Plan has no template_id or Classic personal_message (ADR 0055)'
      using errcode = 'check_violation';
  end if;

  new.wording := coalesce(new.wording, 'kululu');

  if v_key in ('invitation', 'follow_up') then
    new.attachment := coalesce(new.attachment, 'none');
    if v_key = 'follow_up' and new.attachment = 'video' then
      raise exception 'A Follow-up attaches the image or nothing, never the video'
        using errcode = 'check_violation';
    end if;
    if new.gift_button is not null then
      raise exception 'An Ask has no gift button' using errcode = 'check_violation';
    end if;
  elsif v_key in ('event_reminder', 'post_event') then
    new.gift_button := coalesce(new.gift_button, false);
    if new.attachment is not null then
      raise exception 'A Schedule of type % has no attachment', v_key using errcode = 'check_violation';
    end if;
  elsif new.attachment is not null or new.gift_button is not null then
    raise exception 'A Schedule of type % has no attachment or gift button', v_key
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- The current Message Plan's seed read the Event's JSON in the app's
-- camelCase (invitations ->> 'imageUrl', event_settings -> 'payboxConfig' /
-- 'bitConfig'), but the app stores both in snake_case (image_url,
-- paybox_config, bit_config - see mapEventRow and updateGiftingSettings). So
-- every seeded Ask had no attachment and every Reminder and Thank You had the
-- gift switch off, whatever the Event had set up. Found while building the
-- send path (phase 3 of docs/message-plan-build-plan.md).
--
-- Only the two key lookups change; everything else is
-- 20261113000000_message_plan.sql's function, word for word. Schedules already
-- seeded are left alone: no Event is on the current plan yet outside local
-- test data, and the renderer re-checks both choices against the Event at send
-- time anyway (an image that is not there sends no header, a gift button with
-- no Gifting set up is left off).

create or replace function public.seed_current_message_plan_schedules(
  p_event      public.events,
  p_status     public.schedule_completion_status,
  p_with_calls boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day        date := (p_event.event_date at time zone 'UTC')::date;
  v_attachment text;
  v_gift       boolean;
  v_inserted   integer;
  v_calls      integer := 0;
begin
  v_attachment := case
    when coalesce(btrim(p_event.invitations ->> 'image_url'), '') ~* '^https?://\S+$' then 'image'
    else 'none'
  end;

  v_gift := coalesce(
       ((p_event.event_settings -> 'paybox_config' ->> 'enabled') = 'true'
         and coalesce(btrim(p_event.event_settings -> 'paybox_config' ->> 'link'), '') <> '')
    or ((p_event.event_settings -> 'bit_config' ->> 'enabled') = 'true'
         and coalesce(btrim(p_event.event_settings -> 'bit_config' ->> 'link'), '') <> ''),
    false);

  insert into public.schedules
    (event_id, schedule_type_id, template_id, scheduled_date, target_status, status,
     wording, attachment, gift_button)
  select
    p_event.id, st.id, null, v.due, v.target_status, p_status,
    'kululu', v.attachment, v.gift_button
  from (values
    (1, 'invitation',     null::timestamptz, null::text,  v_attachment, null::boolean),
    (2, 'follow_up',      null,              'pending',   v_attachment, null),
    (3, 'follow_up',      null,              'pending',   v_attachment, null),
    (4, 'event_reminder',
        public.message_plan_reminder_proposal(
          v_day, public.message_plan_start_time(p_event.reception_time, p_event.ceremony_time)),
                                             'confirmed', null,         v_gift),
    (5, 'post_event',     public.message_plan_thank_you_due(v_day),
                                             'confirmed', null,         v_gift)
  ) as v (ord, key, due, target_status, attachment, gift_button)
  join public.schedule_types st on st.key = v.key
  order by v.ord;

  get diagnostics v_inserted = row_count;
  if v_inserted <> 5 then
    raise exception 'seed_current_message_plan_schedules: seeded % message Schedules, expected 5', v_inserted;
  end if;

  -- Call Schedules exactly as the Classic seed writes them.
  if p_with_calls then
    insert into public.schedules
      (event_id, schedule_type_id, template_id, scheduled_date, target_status, status)
    select
      p_event.id,
      d.schedule_type_id,
      d.template_id,
      case
        when d.days_offset is null then null
        else ((((p_event.event_date at time zone 'UTC')::date + d.days_offset)
          + d.default_time) at time zone 'Asia/Jerusalem')
      end,
      d.target_status,
      p_status
    from public.event_type_default_schedules d
    where d.event_type_id = p_event.event_type_id
      and not public.schedule_type_is_message(d.schedule_type_id)
    order by d.sort_order;
    get diagnostics v_calls = row_count;
  end if;

  return v_inserted + v_calls;
end;
$$;


revoke execute on function public.seed_current_message_plan_schedules(public.events, public.schedule_completion_status, boolean)
  from public, anon, authenticated;

-- Guard: the function reads the stored keys, and no longer the camelCase ones.
do $$
declare
  v_src text;
begin
  select p.prosrc into v_src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'seed_current_message_plan_schedules';

  if v_src is null then
    raise exception 'seed_current_message_plan_schedules is missing';
  end if;
  if v_src not like '%''image_url''%' or v_src not like '%''paybox_config''%' or v_src not like '%''bit_config''%' then
    raise exception 'seed_current_message_plan_schedules does not read image_url, paybox_config and bit_config';
  end if;
  if v_src like '%''imageUrl''%' or v_src like '%''payboxConfig''%' or v_src like '%''bitConfig''%' then
    raise exception 'seed_current_message_plan_schedules still reads a camelCase key';
  end if;
end;
$$;

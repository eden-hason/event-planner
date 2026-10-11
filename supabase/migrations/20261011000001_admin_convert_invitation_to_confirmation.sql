-- An Operator can turn an Event's Initial Invitation into its first Confirmation.
--
-- The Initial Invitation is seeded on save_the_date_1_no_button: the invitation
-- image and the details, and no ask. Some Owners want the invitation itself to
-- ask for an RSVP. Only a Confirmation asks - the RSVP conversation, the
-- follow-up copy and the results all key off the schedule type - so the
-- Schedule changes type rather than just pointing at another template.
--
-- What one call does, atomically:
--   1. The Invitation becomes a Confirmation on the event type's first
--      Confirmation family (confirmation_1 today), still to every guest. Its
--      Due Time and note are kept.
--   2. Every other Confirmation of the Event that has not gone out and still
--      targets every guest is narrowed to 'pending'. The converted Invitation
--      is now the opening ask, so what used to be the first Confirmation is the
--      chase-up to those who have not answered - the same rule
--      20260921000000_first_outreach_targets_all_guests.sql set for the seed.
--
-- A sent, dispatched or expired Invitation is refused: what went out stays what
-- went out (prevent_sent_schedule_mutation would refuse the first two anyway).
--
-- Callable by the service role only. The Back Office runs it after assertAdmin;
-- an Owner has no way to reach it.

create or replace function public.admin_convert_invitation_to_confirmation(p_schedule_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_event_type_id uuid;
  v_confirmation_type_id uuid;
  v_template_id uuid;
  v_narrowed integer;
begin
  select s.event_id, e.event_type_id
    into v_event_id, v_event_type_id
    from public.schedules s
    join public.schedule_types st on st.id = s.schedule_type_id
    join public.events e on e.id = s.event_id
   where s.id = p_schedule_id
     and st.key = 'initial_invitation'
     and s.sent_at is null
     and s.dispatched_at is null
     and (s.status is null or s.status not in ('sent', 'expired'))
   for update of s;

  if v_event_id is null then
    raise exception 'admin_convert_invitation_to_confirmation: % is not an Initial Invitation that can still change', p_schedule_id
      using errcode = 'P0002';
  end if;

  select id into v_confirmation_type_id
    from public.schedule_types
   where key = 'confirmation';

  -- The family the event type opens its Confirmations with, so a converted
  -- Invitation sends what a seeded first Confirmation would. The catalog is the
  -- only source: an event type with no Confirmation default is refused below.
  select d.template_id into v_template_id
    from public.event_type_default_schedules d
   where d.event_type_id = v_event_type_id
     and d.schedule_type_id = v_confirmation_type_id
     and d.template_id is not null
   order by d.sort_order
   limit 1;

  if v_confirmation_type_id is null or v_template_id is null then
    raise exception 'admin_convert_invitation_to_confirmation: no Confirmation template to convert to';
  end if;

  update public.schedules s
     set target_status = 'pending'
   where s.event_id = v_event_id
     and s.id <> p_schedule_id
     and s.schedule_type_id = v_confirmation_type_id
     and s.target_status is null
     and s.sent_at is null
     and s.dispatched_at is null
     and (s.status is null or s.status in ('disabled', 'cancelled'));
  get diagnostics v_narrowed = row_count;

  update public.schedules
     set schedule_type_id = v_confirmation_type_id,
         template_id = v_template_id,
         target_status = null
   where id = p_schedule_id;

  return v_narrowed;
end;
$$;

revoke all on function public.admin_convert_invitation_to_confirmation(uuid) from public, anon, authenticated;
grant execute on function public.admin_convert_invitation_to_confirmation(uuid) to service_role;

-- Guard: nobody but the service role can run it.
do $$
begin
  if has_function_privilege('authenticated', 'public.admin_convert_invitation_to_confirmation(uuid)', 'execute')
     or has_function_privilege('anon', 'public.admin_convert_invitation_to_confirmation(uuid)', 'execute') then
    raise exception 'admin_convert_invitation_to_confirmation: callable by a non-service role';
  end if;
end $$;

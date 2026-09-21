-- The first invitation and the first confirmation go to every guest, not just
-- the ones who have not answered.
--
-- Both were seeded with target_status = 'pending' ("guests who have not
-- responded"). That is right for a reminder or a follow-up, which chase people,
-- but wrong for the two messages that open a conversation: at the time they go
-- out nobody has answered anything, and a guest who happened to reply early
-- (a call, a text, the RSVP link) should still get the invitation and the
-- first confirmation like everyone else. NULL means "all guests" (see
-- filterGuestsByTargetStatus in src/features/schedules/utils).
--
-- What changes:
--   1. The per-event-type defaults, so events created from now on are right.
--      Every event type: initial_invitation, and the FIRST confirmation only
--      (lowest sort_order). The second confirmation is the follow-up to
--      non-responders and stays 'pending', as do the event reminder's
--      'confirmed' and the phone calls' 'pending'.
--   2. Schedules already seeded for existing events, for the same two, while
--      they can still change: status is NULL (active) or 'disabled' (seeded but
--      not enabled yet). A schedule that has been sent or dispatched is left
--      exactly as it went out (prevent_sent_schedule_mutation would refuse it
--      anyway), and so is one the organiser cancelled. The organiser has no
--      control over a schedule's audience, so no unsent row can hold a
--      deliberate choice that this would overwrite. For confirmations, "first"
--      is the event's earliest confirmation by scheduled_date; when that one
--      has already been sent, the remaining one is the follow-up and keeps
--      'pending'.

-- ---------------------------------------------------------------------------
-- 1. Defaults
-- ---------------------------------------------------------------------------

update public.event_type_default_schedules d
   set target_status = null
  from public.schedule_types st
 where st.id = d.schedule_type_id
   and d.target_status is not null
   and (
     st.key = 'initial_invitation'
     or (
       st.key = 'confirmation'
       and d.sort_order = (
         select min(d2.sort_order)
           from public.event_type_default_schedules d2
          where d2.event_type_id = d.event_type_id
            and d2.schedule_type_id = d.schedule_type_id
       )
     )
   );

-- ---------------------------------------------------------------------------
-- 2. Schedules already seeded and not yet sent
-- ---------------------------------------------------------------------------

update public.schedules s
   set target_status = null
  from public.schedule_types st
 where st.id = s.schedule_type_id
   and s.target_status is not null
   and s.sent_at is null
   and s.dispatched_at is null
   and (s.status is null or s.status = 'disabled')
   and (
     st.key = 'initial_invitation'
     or (
       st.key = 'confirmation'
       and s.scheduled_date = (
         select min(s2.scheduled_date)
           from public.schedules s2
          where s2.event_id = s.event_id
            and s2.schedule_type_id = s.schedule_type_id
       )
     )
   );

-- ---------------------------------------------------------------------------
-- Guard: the change must have landed everywhere it was meant to
-- ---------------------------------------------------------------------------

do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
    from public.event_type_default_schedules d
    join public.schedule_types st on st.id = d.schedule_type_id
   where d.target_status is not null
     and (
       st.key = 'initial_invitation'
       or (
         st.key = 'confirmation'
         and d.sort_order = (
           select min(d2.sort_order)
             from public.event_type_default_schedules d2
            where d2.event_type_id = d.event_type_id
              and d2.schedule_type_id = d.schedule_type_id
         )
       )
     );
  if v_bad > 0 then
    raise exception 'first_outreach_targets_all_guests: % default row(s) still target a subset', v_bad;
  end if;

  -- The follow-up must not have been swept up with the first confirmation.
  select count(*) into v_bad
    from public.event_type_default_schedules d
    join public.schedule_types st on st.id = d.schedule_type_id
   where st.key = 'confirmation'
     and d.target_status is null
     and d.sort_order <> (
       select min(d2.sort_order)
         from public.event_type_default_schedules d2
        where d2.event_type_id = d.event_type_id
          and d2.schedule_type_id = d.schedule_type_id
     );
  if v_bad > 0 then
    raise exception 'first_outreach_targets_all_guests: % follow-up confirmation default(s) were widened', v_bad;
  end if;

  select count(*) into v_bad
    from public.schedules s
    join public.schedule_types st on st.id = s.schedule_type_id
   where st.key = 'initial_invitation'
     and s.target_status is not null
     and s.sent_at is null
     and s.dispatched_at is null
     and (s.status is null or s.status = 'disabled');
  if v_bad > 0 then
    raise exception 'first_outreach_targets_all_guests: % unsent invitation(s) still target a subset', v_bad;
  end if;
end;
$$;

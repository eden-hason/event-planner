-- Every Owner of an Event reads its outreach, not only the one who created it.
--
-- The select policies on guest_interactions, message_deliveries and
-- message_delivery_attempts admitted only `events.user_id = auth.uid()`, the
-- Event's creator. An Owner who joined through the Co-planner Link (ADR 0041,
-- an `owner` row in event_collaborators) read zero rows with no error, so their
-- Schedule Results showed nothing sent and nothing answered, and the guest
-- drawer's Communication tab had no deliveries or answers - while the same
-- Owner saw every Guest Record. On production, 13 Events have a co-owner. On
-- caaa26b4 the co-owner saw 536 Guest Records and 0 of the 393 interactions
-- (checked 2026-11-07).
--
-- CONTEXT.md and ADR 0041 say every Owner has full access to the Event, and
-- every other planning table already admits them through
-- user_has_event_access. Only reads change: the Dispatcher, the webhooks, the
-- RSVP writer and the Catch-up Send write these tables with the service role.
-- Payments (event_billing_events) stay creator-only; that is an open decision
-- in backlog 0034, not this one. All three tables are already in
-- visitor_open_tables(), so a Visitor's own Event is read as before.
--
-- message_deliveries carried two identical creator-only select policies; both
-- go, and one replaces them.

drop policy if exists "Users can view own event interactions" on public.guest_interactions;

create policy "Owners can view event interactions"
  on public.guest_interactions
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.schedules s
        join public.events e on e.id = s.event_id
       where s.id = guest_interactions.schedule_id
         and (e.user_id = (select auth.uid()) or public.user_has_event_access(e.id))
    )
  );

drop policy if exists "Users can view deliveries for their events" on public.message_deliveries;
drop policy if exists "Users can view own event deliveries" on public.message_deliveries;

create policy "Owners can view event deliveries"
  on public.message_deliveries
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.schedules s
        join public.events e on e.id = s.event_id
       where s.id = message_deliveries.schedule_id
         and (e.user_id = (select auth.uid()) or public.user_has_event_access(e.id))
    )
  );

drop policy if exists "Owners can view attempts for their events" on public.message_delivery_attempts;

create policy "Owners can view event delivery attempts"
  on public.message_delivery_attempts
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.message_deliveries d
        join public.schedules s on s.id = d.schedule_id
        join public.events e on e.id = s.event_id
       where d.id = message_delivery_attempts.delivery_id
         and (e.user_id = (select auth.uid()) or public.user_has_event_access(e.id))
    )
  );

-- Fail rather than leave a table with no select policy for Owners, or with a
-- creator-only one still standing beside the new one.
do $$
declare
  v_missing text;
begin
  select string_agg(t, ', ')
    into v_missing
    from unnest(array['guest_interactions', 'message_deliveries', 'message_delivery_attempts']) t
   where not exists (
     select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = t and p.cmd = 'SELECT'
        and p.permissive = 'PERMISSIVE' and p.qual ~ 'user_has_event_access'
   )
   or exists (
     select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = t and p.cmd = 'SELECT'
        and p.permissive = 'PERMISSIVE' and p.qual !~ 'user_has_event_access'
   );
  if v_missing is not null then
    raise exception 'owners_read_outreach: select policies not as intended on %', v_missing;
  end if;
end $$;

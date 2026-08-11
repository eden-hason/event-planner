-- Make call rounds visible (read-only) to the Owner of the event they belong to,
-- so they render alongside message schedules on the schedules page.
--
-- Three parts:
--   1. Explicit round completion, so a round can be declared over even when
--      some guests were never reached.
--   2. SELECT policies for the Owner. Deliberately narrower than
--      schedules_select: user_is_event_owner (the 'owner' collaborator role)
--      rather than user_has_event_access (any collaborator), so a
--      seating_manager - whose guest access is scoped via
--      collaborator_guest_scope - never sees call data for guests outside
--      their scope.
--   3. Column-level grants hiding call notes and caller identity from the
--      Owner. RLS is row-level only, so without this an Owner could read
--      call_logs.notes straight from the API even though the app never
--      selects it. The back office reads these through the service client,
--      which bypasses column grants, so it is unaffected.

alter table call_rounds
  add column completed_at timestamptz;

comment on column call_rounds.completed_at is
  'When the round was declared over by the operator running it. Null = in progress. Explicit rather than derived: a round can legitimately end with guests still on no_answer.';

-- 2. Owner read access

create policy "Owners can view call rounds for their events"
  on call_rounds
  for select
  to authenticated
  using (
    exists (
      select 1 from events
      where events.id = call_rounds.event_id
        and events.user_id = auth.uid()
    )
    or user_is_event_owner(call_rounds.event_id)
  );

create policy "Owners can view call logs for their events"
  on call_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from call_rounds cr
      join events e on e.id = cr.event_id
      where cr.id = call_logs.round_id
        and (e.user_id = auth.uid() or user_is_event_owner(e.id))
    )
  );

-- 3. Keep notes and caller identity out of reach of the Owner.
-- A table-level grant overrides column-level ones, so the table grant has to
-- go before the per-column grant means anything.

revoke select on call_logs from authenticated;

grant select (id, round_id, guest_id, outcome, called_at, created_at, updated_at)
  on call_logs
  to authenticated;

-- message_deliveries had INSERT and SELECT policies scoped to the event
-- owner, but no UPDATE policy. Manual sends persist delivery rows via
-- `upsert(..., { onConflict: 'schedule_id,guest_id' })`, which compiles to
-- INSERT ... ON CONFLICT DO UPDATE. Postgres requires UPDATE privilege on
-- the table for that statement to run at all, regardless of whether a row
-- actually conflicts. Without this policy, the upsert silently failed under
-- RLS for any owner-triggered send (service-role sends were unaffected),
-- so delivery rows - including the guest's confirmation_token - were never
-- persisted even though the SMS/WhatsApp message itself went out.
create policy "Users can update deliveries for their schedules"
on public.message_deliveries
for update
using (
  exists (
    select 1
    from schedules s
    join events e on e.id = s.event_id
    where s.id = message_deliveries.schedule_id
      and e.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from schedules s
    join events e on e.id = s.event_id
    where s.id = message_deliveries.schedule_id
      and e.user_id = auth.uid()
  )
);

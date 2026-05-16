-- Wire guests to tables for the Seating feature

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS table_id uuid NULL REFERENCES public.tables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_guests_table_id ON public.guests(table_id);

-- Allow seating_managers to UPDATE guests in their scope so they can assign / unassign tables.
-- The existing guests_update policy is owner-only; this adds an OR-branch for seating managers.
-- Policies are OR'd by Postgres when multiple permissive policies exist.
DROP POLICY IF EXISTS "guests_update_seating_manager" ON public.guests;
CREATE POLICY "guests_update_seating_manager" ON public.guests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.event_collaborators ec
      JOIN public.collaborator_guest_scope cgs ON cgs.collaborator_id = ec.id
      WHERE ec.event_id = guests.event_id
        AND ec.user_id = auth.uid()
        AND ec.role = 'seating_manager'
        AND (cgs.guest_id = guests.id OR cgs.group_id = guests.group_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.event_collaborators ec
      JOIN public.collaborator_guest_scope cgs ON cgs.collaborator_id = ec.id
      WHERE ec.event_id = guests.event_id
        AND ec.user_id = auth.uid()
        AND ec.role = 'seating_manager'
        AND (cgs.guest_id = guests.id OR cgs.group_id = guests.group_id)
    )
  );

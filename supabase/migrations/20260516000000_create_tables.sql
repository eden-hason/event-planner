-- Create table_shape enum and tables table for the Seating feature

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_shape') THEN
    CREATE TYPE public.table_shape AS ENUM ('round', 'rectangle', 'square');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.tables (
  id          uuid               DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    uuid               NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label       text               NOT NULL,
  shape       public.table_shape NOT NULL DEFAULT 'round',
  capacity    integer            NOT NULL DEFAULT 8 CHECK (capacity > 0 AND capacity <= 100),
  position_x  real               NOT NULL DEFAULT 0,
  position_y  real               NOT NULL DEFAULT 0,
  rotation    real               NOT NULL DEFAULT 0,
  created_at  timestamptz        NOT NULL DEFAULT now(),
  updated_at  timestamptz        NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tables_event_id ON public.tables(event_id);

DROP TRIGGER IF EXISTS update_tables_updated_at ON public.tables;
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON public.tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Owner (via events.user_id) OR any event collaborator (owner or seating_manager) has full access.
-- Seating managers intentionally get full table CRUD per product decision.
CREATE POLICY "tables_select" ON public.tables FOR SELECT TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_has_event_access(event_id));

CREATE POLICY "tables_insert" ON public.tables FOR INSERT TO authenticated
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_has_event_access(event_id));

CREATE POLICY "tables_update" ON public.tables FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_has_event_access(event_id))
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_has_event_access(event_id));

CREATE POLICY "tables_delete" ON public.tables FOR DELETE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_has_event_access(event_id));

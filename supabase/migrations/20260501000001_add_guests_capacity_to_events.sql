ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS guests_capacity integer;

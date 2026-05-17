ALTER TABLE public.message_deliveries
  ADD COLUMN IF NOT EXISTS triggered_by text NOT NULL DEFAULT 'scheduled'
  CHECK (triggered_by IN ('scheduled', 'manual'));

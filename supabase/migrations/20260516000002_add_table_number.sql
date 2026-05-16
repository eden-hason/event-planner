-- Auto-incrementing table number (per event) so tables fall back to "1", "2"
-- when no label is provided

ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS table_number int NOT NULL DEFAULT 0;

ALTER TABLE public.tables
  ALTER COLUMN label DROP NOT NULL;

-- Backfill existing rows (anything still at 0) — assign 1..N per event by creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at, id) AS rn
  FROM public.tables
  WHERE table_number = 0
)
UPDATE public.tables t
SET table_number = n.rn
FROM numbered n
WHERE t.id = n.id;

CREATE UNIQUE INDEX IF NOT EXISTS tables_event_id_table_number_unique
  ON public.tables(event_id, table_number);

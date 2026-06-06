-- Add a short, human-friendly unique code to events for use in short URLs (e.g. /nav/<code>).
-- Uses a 6-char base62 charset that excludes visually ambiguous characters (0, O, I, i, l, 1).
-- 55^6 ≈ 27.7 billion combinations; collision risk is negligible at any realistic event volume.

-- 1. Generator function
CREATE OR REPLACE FUNCTION public.gen_event_short_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  charset text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result  text := '';
  i       int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(charset, floor(random() * length(charset) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 2. Add nullable column first so the backfill can populate it
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS short_code text;

-- 3. Backfill existing rows one at a time, retrying on the rare collision
DO $$
DECLARE
  rec  RECORD;
  code text;
BEGIN
  FOR rec IN SELECT id FROM public.events WHERE short_code IS NULL LOOP
    LOOP
      code := public.gen_event_short_code();
      IF NOT EXISTS (SELECT 1 FROM public.events WHERE short_code = code) THEN
        UPDATE public.events SET short_code = code WHERE id = rec.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- 4. Now that every row has a value, enforce NOT NULL and set the default for future inserts
ALTER TABLE public.events ALTER COLUMN short_code SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN short_code SET DEFAULT public.gen_event_short_code();

-- 5. Unique index
CREATE UNIQUE INDEX IF NOT EXISTS events_short_code_idx ON public.events (short_code);

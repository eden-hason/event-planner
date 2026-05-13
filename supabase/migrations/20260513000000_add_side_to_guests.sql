ALTER TABLE guests ADD COLUMN IF NOT EXISTS side varchar(20) NULL;

ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_side_check;
ALTER TABLE guests
  ADD CONSTRAINT guests_side_check
  CHECK (side IS NULL OR side IN ('bride', 'groom'));

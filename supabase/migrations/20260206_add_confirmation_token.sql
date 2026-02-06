-- Add confirmation_token column to message_deliveries for guest confirmation landing page
ALTER TABLE message_deliveries
  ADD COLUMN IF NOT EXISTS confirmation_token VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_message_deliveries_confirmation_token
  ON message_deliveries(confirmation_token)
  WHERE confirmation_token IS NOT NULL;

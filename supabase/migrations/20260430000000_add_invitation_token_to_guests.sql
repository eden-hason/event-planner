ALTER TABLE guests
  ADD COLUMN invitation_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX guests_invitation_token_idx ON guests (invitation_token);

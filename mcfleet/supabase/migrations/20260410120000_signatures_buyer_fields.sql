-- Add buyer contact and sale data to signatures for e-conomic invoice draft creation
ALTER TABLE signatures
  ADD COLUMN IF NOT EXISTS buyer_adresse  TEXT,
  ADD COLUMN IF NOT EXISTS buyer_postby   TEXT,
  ADD COLUMN IF NOT EXISTS buyer_telefon  TEXT,
  ADD COLUMN IF NOT EXISTS pris_kr        INTEGER,
  ADD COLUMN IF NOT EXISTS eco_draft_id   TEXT;

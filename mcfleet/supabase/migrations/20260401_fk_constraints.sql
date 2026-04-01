-- Migration: Tilføj foreign key constraints
-- Dato: 2026-04-01
-- Køres i Supabase SQL Editor: https://supabase.com/dashboard/project/qiqgrafjzcijaphegffr/sql/new

-- ── Trin 1: Ryd evt. forældreløse referencer op ──
-- Sætter mc_id til NULL hvis den refererer til en mc der ikke eksisterer
UPDATE fakturaer
  SET mc_id = NULL
  WHERE mc_id IS NOT NULL
    AND mc_id NOT IN (SELECT id FROM mcs);

UPDATE opgaver
  SET mc_id = NULL
  WHERE mc_id IS NOT NULL
    AND mc_id NOT IN (SELECT id FROM mcs);

-- Signatures med mc_id = 0 eller ugyldigt id — nulstil
UPDATE signatures
  SET mc_id = NULL
  WHERE mc_id IS NOT NULL
    AND (mc_id = 0 OR mc_id NOT IN (SELECT id FROM mcs));

-- ── Trin 2: Tilføj FK constraints ──

ALTER TABLE fakturaer
  ADD CONSTRAINT fk_fakturaer_mc
  FOREIGN KEY (mc_id) REFERENCES mcs(id)
  ON DELETE SET NULL;

ALTER TABLE signatures
  ADD CONSTRAINT fk_signatures_mc
  FOREIGN KEY (mc_id) REFERENCES mcs(id)
  ON DELETE CASCADE;

ALTER TABLE opgaver
  ADD CONSTRAINT fk_opgaver_mc
  FOREIGN KEY (mc_id) REFERENCES mcs(id)
  ON DELETE SET NULL;

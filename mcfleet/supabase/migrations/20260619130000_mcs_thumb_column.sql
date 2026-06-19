-- Tilføj lille thumbnail-kolonne til mcs så oversigten kan vise billeder
-- uden at hente de tunge fuldstørrelses-fotos (foto/fotos) ved hvert load.
-- Kolonnen er nullable: NULL = ikke genereret endnu (bruges af backfill),
-- '' = behandlet uden billede, ellers en lille base64 JPEG-dataURL.
ALTER TABLE mcs
  ADD COLUMN IF NOT EXISTS thumb TEXT;

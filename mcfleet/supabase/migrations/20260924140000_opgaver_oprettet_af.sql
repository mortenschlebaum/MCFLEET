-- Navn på den der opretter opgaven. Tekst, ikke bruger-id,
-- så feltet kan rettes i formularen uden at koble til login.
ALTER TABLE opgaver
  ADD COLUMN IF NOT EXISTS oprettet_af TEXT;

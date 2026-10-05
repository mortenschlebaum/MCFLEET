-- Email bruges til glemt adgangskode.
-- reset_kode_hash er en HMAC og kan ikke omregnes til koden uden serverens nøgle.
-- Ingen ny tabel: felterne hører til den eksisterende bruger.
ALTER TABLE brugere ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE brugere ADD COLUMN IF NOT EXISTS reset_kode_hash TEXT;
ALTER TABLE brugere ADD COLUMN IF NOT EXISTS reset_udloeber TIMESTAMPTZ;

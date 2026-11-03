-- Tomt skjema for Supabase sitt Data API (PostgREST).
--
-- Appen bruker ikke Data API. Men når det er slått av i Supabase, kjører
-- PostgREST likevel og ser etter plassholderskjemaet
-- `pg_pgrst_no_exposed_schemas`, som ikke finnes. Den prøver på nytt hvert
-- 32. sekund, og Postgres-loggen fylles med feilen 3F000 (rundt 110 i timen).
-- Skjemaet kan ikke lages selv, fordi navn som starter med `pg_` er reservert.
--
-- I stedet slås Data API på med bare dette skjemaet eksponert
-- (docs/publisering.md). Skjemaet er tomt og ingen andre enn eieren har
-- rettigheter i det, så API-et kommer ikke til noen data.

CREATE SCHEMA IF NOT EXISTS data_api_tom;

REVOKE ALL ON SCHEMA data_api_tom FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA data_api_tom FROM anon, authenticated';
  END IF;
END
$$;

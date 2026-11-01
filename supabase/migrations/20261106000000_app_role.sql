-- Egen databasebruker for appen, med minst mulig rettigheter.
--
-- Appen har koblet til som `postgres`, som eier tabellene og går forbi RLS.
-- `nymark_app` kan bare lese og skrive rader i tabellene i `public`: ingen
-- endring av skjemaet, ingen tilgang til Supabase sine egne skjemaer, og RLS
-- gjelder. Migreringene kjører fortsatt som `postgres`.
--
-- Rollen lages uten innlogging. Slik tas den i bruk (docs/publisering.md):
--   ALTER ROLE nymark_app WITH LOGIN PASSWORD '<eget passord>';
-- og DATABASE_URL med brukeren nymark_app.<prosjekt-ref>.
--
-- NB: en ny tabell trenger en policy for nymark_app (se slutten av fila).
-- En test i tests/unit/migrations.test.ts stopper tabeller som mangler den.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nymark_app') THEN
    CREATE ROLE nymark_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO nymark_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nymark_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nymark_app;

-- Tabeller som migreringene lager senere, får de samme rettighetene.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nymark_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO nymark_app;

-- RLS er på for alle tabeller. Uten policy ser nymark_app ingen rader.
-- Tilgangen per gruppe sjekkes i lib/store/, så policyen slipper appen til
-- alle rader, men bare appens rolle (anon og authenticated har fortsatt ingen).
-- En ny tabell legger til:
--   CREATE POLICY nymark_app_all ON <tabell> TO nymark_app USING (true) WITH CHECK (true);
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'local_migrations' LOOP
    EXECUTE format('DROP POLICY IF EXISTS nymark_app_all ON public.%I', t);
    EXECUTE format('CREATE POLICY nymark_app_all ON public.%I TO nymark_app USING (true) WITH CHECK (true)', t);
  END LOOP;
END
$$;

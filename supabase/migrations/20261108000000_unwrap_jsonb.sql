-- JSON som ble lagret som tekst.
--
-- Appen sendte JSON som tekst, og postgres.js pakket den inn én gang til.
-- Da ble for eksempel exercise_patterns.bands lagret som en JSON-streng
-- ('"[...]"') og ikke som en liste, og «Ny øvelse med KI» feilet
-- («a?.bands.find is not a function»). lib/db/postgres.ts sender nå teksten
-- som den er. Denne migreringen pakker ut verdiene som allerede er lagret.
--
-- Bare strenger som selv er et JSON-objekt eller en JSON-liste pakkes ut.
-- Feiler en kolonne, står den som før, og resten pakkes ut likevel.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND data_type = 'jsonb'
  LOOP
    BEGIN
      EXECUTE format(
        $q$UPDATE public.%I SET %I = (%I #>> '{}')::jsonb
             WHERE jsonb_typeof(%I) = 'string' AND (%I #>> '{}') ~ '^\s*[\[{]'$q$,
        c.table_name, c.column_name, c.column_name, c.column_name, c.column_name);
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Kunne ikke pakke ut %.%: %', c.table_name, c.column_name, SQLERRM;
    END;
  END LOOP;
END
$$;

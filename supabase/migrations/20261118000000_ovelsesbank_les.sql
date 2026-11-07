-- Lesetilgang til øvelsesbanken for Claude (og senere andre lesere).
--
-- Skjemaet `ovelsesbank` har views over den felles banken og materialet som
-- forbedrer den: øvelser, versjoner, evalueringer, kommentarer, observasjoner,
-- mønstre, forbedringsforslag, endringslogg og lærdommer på tvers av lag.
-- Ingen spillerdata (nivåer, tagger, par, lagforslag), ingen Spond-ID-er for
-- personer (forfatter, opprettet av, besluttet av), ingen lag-ID-er.
--
-- Rollen `claude_les` kan bare lese disse viewene. Den har ingen rettigheter
-- i `public`, og RLS uten policy for den stenger tabellene uansett. Viewene
-- eies av migreringsbrukeren (postgres) og leser tabellene med dens rettigheter;
-- derfor bestemmer viewene, og bare de, hva rollen ser.
--
-- Rollen lages uten innlogging. Slik tas den i bruk (docs/publisering.md §12):
--   ALTER ROLE claude_les WITH LOGIN PASSWORD '<eget passord>';
-- og en URL med brukeren claude_les.<prosjekt-ref> mot den delte pooleren.
--
-- NB: en kolonne som legges til en tabell her, kommer ikke med av seg selv.
-- Viewene lister kolonnene, og tests/unit/ovelsesbank.test.ts stopper
-- personkolonner (PERSON_COLUMNS) og andre skjemaer enn ovelsesbank.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'claude_les') THEN
    CREATE ROLE claude_les NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT CONNECTION LIMIT 3;
  END IF;
END
$$;

-- Bare lesing, og et spørsmål kan ikke gå lenge.
ALTER ROLE claude_les SET default_transaction_read_only = on;
ALTER ROLE claude_les SET statement_timeout = '15s';

CREATE SCHEMA IF NOT EXISTS ovelsesbank;
REVOKE ALL ON SCHEMA ovelsesbank FROM PUBLIC;
COMMENT ON SCHEMA ovelsesbank IS 'Lesbare views over den felles øvelsesbanken og forbedringsmaterialet. Ingen persondata.';

-- Øvelsene i den felles banken (alle statuser: aktive, kandidater, arkiverte).
CREATE OR REPLACE VIEW ovelsesbank.ovelser AS
  SELECT id, code, version, name, category, status, bands, themes, nff_activity, nff_tags,
         min_players, max_players, duration_minutes, area, organisation, execution,
         learning_points, questions, easier, harder, nff_url, drawing, source, based_on,
         created_at, updated_at
    FROM public.exercises
   WHERE spond_group_id = 'felles';

-- Hver versjon av en øvelse (feltene slik de var), og hvor den kom fra.
CREATE OR REPLACE VIEW ovelsesbank.versjoner AS
  SELECT id, exercise_code, version, vals, source, proposal_id, created_at
    FROM public.exercise_versions
   WHERE spond_group_id = 'felles';

-- Trenernes evalueringer av bankøvelser, uten trener, lag og arrangement.
CREATE OR REPLACE VIEW ovelsesbank.evalueringer AS
  SELECT f.id, f.exercise_code, f.exercise_version, f.rating, f.tags, f.use_again, f.body,
         f.actual_minutes, f.actual_players, f.registered_players, f.observed_at, f.created_at, f.updated_at
    FROM public.exercise_feedback f
   WHERE EXISTS (SELECT 1 FROM public.exercises e WHERE e.spond_group_id = 'felles' AND e.code = f.exercise_code);

-- Kommentarer til en øvelse i et opplegg, uten forfatter.
CREATE OR REPLACE VIEW ovelsesbank.kommentarer AS
  SELECT c.id, c.exercise_code, c.body, c.created_at
    FROM public.training_plan_comments c
   WHERE EXISTS (SELECT 1 FROM public.exercises e WHERE e.spond_group_id = 'felles' AND e.code = c.exercise_code);

-- Det KI har lest ut av kommentarene (styrker og forslag per del av øvelsen).
CREATE OR REPLACE VIEW ovelsesbank.observasjoner AS
  SELECT id, exercise_code, feedback_id, kind, part, strength, suggestion, created_at
    FROM public.exercise_observations
   WHERE spond_group_id = 'felles';

-- Mønsteret per øvelse: snitt, antall, trend og snitt per aldersbånd.
CREATE OR REPLACE VIEW ovelsesbank.monstre AS
  SELECT exercise_code, score, ratings, trend, patterns, bands, computed_at
    FROM public.exercise_patterns
   WHERE spond_group_id = 'felles';

-- Forbedringsforslagene (Forbedringer) og hva som ble bestemt, uten hvem.
CREATE OR REPLACE VIEW ovelsesbank.forbedringer AS
  SELECT id, exercise_code, kind, status, reason, base_values, proposed, rejection, model, decided_at, created_at
    FROM public.improvement_proposals
   WHERE spond_group_id = 'felles';

-- Endringer i bankøvelser (KI-forslag, trenernes rettinger, manuelle endringer).
CREATE OR REPLACE VIEW ovelsesbank.endringer AS
  SELECT id, kind, exercise_code, changes, created_at
    FROM public.edit_log
   WHERE spond_group_id = 'felles' AND exercise_code IS NOT NULL;

-- Lærdommer på tvers av lag (bare tellinger og snitt, aldri hvilket lag).
CREATE OR REPLACE VIEW ovelsesbank.laerdommer AS
  SELECT id, kind, band, key, codes, sessions, trainers, groups, mean, tags, computed_at
    FROM public.learning_insights
   WHERE spond_group_id = 'felles';

GRANT USAGE ON SCHEMA ovelsesbank TO claude_les;
GRANT SELECT ON ALL TABLES IN SCHEMA ovelsesbank TO claude_les;
-- Appens egen rolle trenger ikke skjemaet.
REVOKE ALL ON ALL TABLES IN SCHEMA ovelsesbank FROM PUBLIC;

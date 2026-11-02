-- Feillogg: feil i appen (server og nettleser), gruppert per fingeravtrykk.
-- En ny type feil blir et GitHub-issue med etiketten «auto-feil» (bare i prod,
-- maks fem per døgn). Repoet er offentlig, så issuet får bare en vasket
-- melding; detaljene blir her og vises bare for superadmin. Rader som ikke er
-- sett på 90 dager slettes av vedlikeholdet.

CREATE TABLE error_events (
  id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fingerprint       text NOT NULL UNIQUE CHECK (char_length(fingerprint) <= 64),
  area              text NOT NULL CHECK (char_length(area) <= 100),
  source            text NOT NULL CHECK (source IN ('server', 'klient')),
  message           text NOT NULL CHECK (char_length(message) <= 1000),
  stack             text NOT NULL DEFAULT '' CHECK (char_length(stack) <= 4000),
  route             text NOT NULL DEFAULT '' CHECK (char_length(route) <= 200),
  app_version       text NOT NULL CHECK (char_length(app_version) <= 20),
  count             integer NOT NULL DEFAULT 1,
  first_seen        timestamptz NOT NULL DEFAULT now(),
  last_seen         timestamptz NOT NULL DEFAULT now(),
  issue_number      integer,
  issue_url         text,
  issue_version     text,
  issue_created_at  timestamptz,
  issue_claimed_at  timestamptz
);

CREATE INDEX error_events_last_seen_idx ON error_events (last_seen);
CREATE INDEX error_events_issue_created_idx ON error_events (issue_created_at);

ALTER TABLE error_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY nymark_app_all ON error_events TO nymark_app USING (true) WITH CHECK (true);

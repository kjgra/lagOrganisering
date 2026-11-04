-- Faste baner per ukedag. Banefordelingen kommer to ganger i året, og da får
-- hver treningsdag de samme banene til neste fordeling. En rad sier «disse
-- banene på mandager fra denne datoen», med en valgfri sluttdato (når neste
-- fordeling ventes). Den nyeste raden som har startet gjelder. En undergruppe
-- uten egne rader bruker hovedgruppas (spond_subgroup_id = '').
--
-- Banene er ID-er i `pitches`, valgt blant lagets baner (team_pitches).

CREATE TABLE weekday_pitches (
  id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id    text NOT NULL,
  spond_subgroup_id text NOT NULL DEFAULT '',
  weekday           smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  valid_from        date NOT NULL,
  valid_to          date CHECK (valid_to IS NULL OR valid_to >= valid_from),
  pitch_ids         integer[] NOT NULL CHECK (cardinality(pitch_ids) BETWEEN 1 AND 12),
  updated_by        text NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spond_group_id, spond_subgroup_id, weekday, valid_from)
);

ALTER TABLE weekday_pitches ENABLE ROW LEVEL SECURITY;
CREATE POLICY nymark_app_all ON weekday_pitches TO nymark_app USING (true) WITH CHECK (true);

-- Baner for én trening, når de ikke er de faste for ukedagen.
CREATE TABLE event_pitches (
  spond_group_id text NOT NULL,
  spond_event_id text NOT NULL,
  pitch_ids      integer[] NOT NULL CHECK (cardinality(pitch_ids) BETWEEN 1 AND 12),
  updated_by     text NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, spond_event_id)
);

ALTER TABLE event_pitches ENABLE ROW LEVEL SECURITY;
CREATE POLICY nymark_app_all ON event_pitches TO nymark_app USING (true) WITH CHECK (true);

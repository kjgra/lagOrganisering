-- Læring på øktnivå, steg 5: mønstre for hele økter. Om natta telles øktvurderingene
-- («Hele økta») per aldersbånd: øvelser som fungerer sammen (kombinasjon), rekkefølge
-- i økter uten rotasjon (progresjon) og oppbygging (struktur). Erstattes hver natt,
-- som exercise_patterns. spond_group_id er 'felles' for mønstre på tvers av lag, ellers
-- laget sitt eget. Ingen tekst fra trenerne lagres her, bare koder, tall og stikkord.

CREATE TABLE learning_insights (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id text NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('kombinasjon', 'progresjon', 'struktur')),
  band           text NOT NULL CHECK (band ~ '^[0-9]{1,2}-[0-9]{1,2}$'),
  key            text NOT NULL CHECK (length(key) <= 130),
  codes          text[] NOT NULL DEFAULT '{}',
  sessions       integer NOT NULL CHECK (sessions >= 0),
  trainers       integer NOT NULL CHECK (trainers >= 0),
  groups         integer NOT NULL CHECK (groups >= 0),
  mean           numeric(4, 2) NOT NULL,
  tags           text[] NOT NULL DEFAULT '{}',
  computed_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spond_group_id, band, kind, key)
);

ALTER TABLE learning_insights ENABLE ROW LEVEL SECURITY;

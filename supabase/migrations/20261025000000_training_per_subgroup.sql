-- «Trening» per lag: årshjul, laget (alder, økt, baner, utstyr), prinsipper og
-- lærdommer kan være egne for en undergruppe i Spond. '' er hele hovedgruppa,
-- som også er standard for lagene som ikke har sitt eget. Øvelsesbanken er
-- fortsatt felles for hovedgruppa.

ALTER TABLE season_themes ADD COLUMN spond_subgroup_id text NOT NULL DEFAULT '';
ALTER TABLE season_themes DROP CONSTRAINT season_themes_pkey;
ALTER TABLE season_themes ADD PRIMARY KEY (spond_group_id, spond_subgroup_id, year, month);

ALTER TABLE team_settings ADD COLUMN spond_subgroup_id text NOT NULL DEFAULT '';
ALTER TABLE team_settings DROP CONSTRAINT team_settings_pkey;
ALTER TABLE team_settings ADD PRIMARY KEY (spond_group_id, spond_subgroup_id);

ALTER TABLE team_pitches ADD COLUMN spond_subgroup_id text NOT NULL DEFAULT '';
ALTER TABLE team_pitches DROP CONSTRAINT team_pitches_pkey;
ALTER TABLE team_pitches ADD PRIMARY KEY (spond_group_id, spond_subgroup_id, pitch_id);

ALTER TABLE team_learnings ADD COLUMN spond_subgroup_id text NOT NULL DEFAULT '';
DROP INDEX team_learnings_group_idx;
CREATE INDEX team_learnings_group_idx ON team_learnings (spond_group_id, spond_subgroup_id, created_at);

-- Prinsippene («Slik trener vi») får egen tabell med versjoner, som lærdommene.
CREATE TABLE team_principles (
  id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id    text NOT NULL,
  spond_subgroup_id text NOT NULL DEFAULT '',
  body              text NOT NULL CHECK (length(body) <= 2000),
  created_by        text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX team_principles_group_idx ON team_principles (spond_group_id, spond_subgroup_id, created_at);
ALTER TABLE team_principles ENABLE ROW LEVEL SECURITY;

INSERT INTO team_principles (spond_group_id, body, created_by, created_at)
SELECT spond_group_id, btrim(principles), updated_by, updated_at FROM team_settings WHERE btrim(coalesce(principles, '')) <> '';

ALTER TABLE team_settings DROP COLUMN principles;

-- Hvilke undergrupper økta var for (fra Spond), så lærdommene til et lag
-- bygger på lagets egne evalueringer. Tom liste er hele hovedgruppa: eldre
-- evalueringer og evalueringer fra øvelsesbanken teller for alle lag.
ALTER TABLE exercise_feedback ADD COLUMN spond_subgroup_ids text[] NOT NULL DEFAULT '{}';


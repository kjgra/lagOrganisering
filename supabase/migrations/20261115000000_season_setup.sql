-- Oppsett av årshjulet per år og lag: NFFs begreper (nedtrekk) eller egne
-- begreper (fritekst som kobles til NFF), og hva trenerne velger først hver
-- måned. Uten rad for året er årshjulet «egne begreper», som før.
-- season_themes får delferdighet_id, så en måned kan ha delferdighet som
-- primærnivå (eller som tagg når hovedtema er primært).

CREATE TABLE season_setup (
  spond_group_id    text NOT NULL,
  spond_subgroup_id text NOT NULL DEFAULT '',
  year              integer NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  mode              text NOT NULL CHECK (mode IN ('nff', 'egne')),
  primary_level     text NOT NULL DEFAULT 'hovedtema' CHECK (primary_level IN ('hovedtema', 'delferdighet', 'laeringsmoment')),
  updated_by        text NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, spond_subgroup_id, year)
);

ALTER TABLE season_setup ENABLE ROW LEVEL SECURITY;
CREATE POLICY nymark_app_all ON season_setup TO nymark_app USING (true) WITH CHECK (true);

ALTER TABLE season_themes ADD COLUMN delferdighet_id text REFERENCES nff_topics (id);

-- «Fordeling» på lagtavla: hvordan lagene fordeles automatisk, valgt per
-- undergruppe og felles for trenerne der. '' er hele hovedgruppa. Rollene er
-- frie tagger (f.eks. «Keeper») som spres på lagene. history er for «Som
-- sist» og «Rullér» (forrige treninger); 'off' bruker ikke historikk.

CREATE TABLE board_settings (
  spond_group_id    text NOT NULL,
  spond_subgroup_id text NOT NULL DEFAULT '',
  mode              text NOT NULL DEFAULT 'even' CHECK (mode IN ('even', 'levels')),
  roles             text[] NOT NULL DEFAULT '{Keeper}' CHECK (cardinality(roles) <= 20),
  pairs             boolean NOT NULL DEFAULT true,
  history           text NOT NULL DEFAULT 'off' CHECK (history IN ('off', 'same', 'rotate')),
  updated_by        text NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, spond_subgroup_id)
);

ALTER TABLE board_settings ENABLE ROW LEVEL SECURITY;

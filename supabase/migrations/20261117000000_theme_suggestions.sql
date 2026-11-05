-- KI-ens kobling av egne ord i årshjulet til NFFs begreper. Når et lag skriver et
-- ord appens ordliste ikke kjenner («Spilleforståelse»), spør appen KI én gang per
-- ord og aldersbånd og lagrer svaret her. Svaret deles av alle lag, så samme ord
-- gir samme kobling. Bare NFFs egne begreper (ingen lagdata), ordet lagres som
-- nøkkel (themeKey), aldri med navn. Tomme lister: KI fant ingen kobling.

CREATE TABLE theme_suggestions (
  term               text NOT NULL CHECK (length(term) BETWEEN 1 AND 80),
  band               text NOT NULL CHECK (band IN ('6-7', '8-9', '10-12')),
  hovedtema_ids      text[] NOT NULL DEFAULT '{}' CHECK (cardinality(hovedtema_ids) <= 4),
  delferdighet_ids   text[] NOT NULL DEFAULT '{}' CHECK (cardinality(delferdighet_ids) <= 6),
  learning_point_ids text[] NOT NULL DEFAULT '{}' CHECK (cardinality(learning_point_ids) <= 2),
  model              text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (term, band)
);

ALTER TABLE theme_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY nymark_app_all ON theme_suggestions TO nymark_app USING (true) WITH CHECK (true);

ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_kind_check;
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_kind_check CHECK (kind IN ('draft', 'revision', 'visual', 'learning', 'exercise', 'feedback', 'observations', 'needs', 'themes'));

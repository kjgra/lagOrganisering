-- Lagets ordliste: et eget ord i årshjulet («Spille oss frem») koblet til NFFs
-- begreper av trenerne selv. Gjelder hele hovedgruppa og alle år, og går foran
-- appens faste ordliste (lib/nff/theme-link.ts). Ordet lagres normalisert
-- (små bokstaver, bare bokstaver og tall), aldri med navn.

CREATE TABLE theme_links (
  spond_group_id     text NOT NULL,
  term               text NOT NULL CHECK (length(term) BETWEEN 1 AND 80),
  hovedtema_ids      text[] NOT NULL DEFAULT '{}' CHECK (cardinality(hovedtema_ids) <= 4),
  delferdighet_ids   text[] NOT NULL DEFAULT '{}' CHECK (cardinality(delferdighet_ids) <= 6),
  learning_point_ids text[] NOT NULL DEFAULT '{}' CHECK (cardinality(learning_point_ids) <= 2),
  updated_by         text NOT NULL,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, term)
);

ALTER TABLE theme_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY nymark_app_all ON theme_links TO nymark_app USING (true) WITH CHECK (true);

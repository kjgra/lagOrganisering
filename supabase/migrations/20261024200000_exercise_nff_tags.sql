-- Øvelser tagges etter NFFs fagplaner (lib/nff/fagplan.ts): hvilke bånd øvelsen passer for,
-- én aktivitetskategori, og hovedtema, delferdigheter og læringsmomenter som koder
-- (tema.*, delf.*, lm.*). Katalogen ligger i koden, så koder valideres der.

ALTER TABLE exercises ADD COLUMN bands text[] NOT NULL DEFAULT '{}'
  CHECK (bands <@ ARRAY['6-7', '8-9', '10-12']::text[]);
ALTER TABLE exercises ADD COLUMN nff_activity text
  CHECK (nff_activity IN ('sjef-intro', 'sjef-repetisjon', 'med-og-mot', 'spill'));
ALTER TABLE exercises ADD COLUMN nff_tags text[] NOT NULL DEFAULT '{}'
  CHECK (cardinality(nff_tags) <= 60);

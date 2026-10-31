-- Mønstre per aldersgruppe og «Variant»-forslag.
-- exercise_patterns.bands: snitt per NFF-bånd. Et forslag av typen «variant»
-- blir en ny øvelse basert på den som finnes, for ett aldersbånd.

ALTER TABLE exercise_patterns ADD COLUMN bands jsonb NOT NULL DEFAULT '[]';

ALTER TABLE improvement_proposals DROP CONSTRAINT improvement_proposals_kind_check;
ALTER TABLE improvement_proposals ADD CONSTRAINT improvement_proposals_kind_check CHECK (kind IN ('ny_versjon', 'tilpasning', 'variant', 'arkiver', 'tilbakerulling'));

-- Forslag for hele øvelsesbanken (Forbedringer):
-- ny_ovelse: en ny øvelse der et aldersbånd har for få gode øvelser for et hovedtema
--   (exercise_code er da «ny-<bånd>-<tema>», ikke en øvelse i banken).
-- overlapp: arkiver den svakeste av to nesten like øvelser. Slås aldri sammen automatisk.
-- metadata: fyll inn det en øvelse mangler (spillere, minutter, område, NFF-tagger, aldersbånd).

ALTER TABLE improvement_proposals DROP CONSTRAINT improvement_proposals_kind_check;
ALTER TABLE improvement_proposals ADD CONSTRAINT improvement_proposals_kind_check
  CHECK (kind IN ('ny_versjon', 'tilpasning', 'variant', 'arkiver', 'tilbakerulling', 'ny_ovelse', 'overlapp', 'metadata'));

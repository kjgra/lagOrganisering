-- Rangering av øvelser for KI (lib/plans/ranking.ts): per øvelse og
-- aldersbånd, vektet sum av «fungerte» (s) og «fungerte ikke» (f) fra
-- vurderinger og fra hva trenerne beholdt eller tok ut av KI-opplegg.
-- Bare tall per øvelseskode og bånd, ingen personer. Regnes ut på nytt hver
-- natt og etter hver lagrede evaluering, sammen med resten av mønsteret.

ALTER TABLE exercise_patterns ADD COLUMN evidence jsonb NOT NULL DEFAULT '[]';

-- Claudes lesetilgang (ovelsesbank.monstre) får med rangeringsgrunnlaget.
CREATE OR REPLACE VIEW ovelsesbank.monstre AS
  SELECT exercise_code, score, ratings, trend, patterns, bands, computed_at, evidence
    FROM public.exercise_patterns
   WHERE spond_group_id = 'felles';

-- Læring på øktnivå, steg 2: hva trenerne ber KI om. Ønskene i KI-opplegg
-- (training_plans.context->>'wish') og kommentarene på opplegg gjøres om til faste
-- behov (f.eks. «mindre kø», «lite utstyr») av KI om natta, så de kan telles per
-- aldersbånd. Bare nøkkelen lagres, aldri teksten. needs_at merker at en kilde er
-- gått gjennom.

CREATE TABLE ki_needs (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id text NOT NULL,
  band           text CHECK (band ~ '^[0-9]{1,2}-[0-9]{1,2}$'),
  source         text NOT NULL CHECK (source IN ('opplegg', 'kommentar')),
  source_id      integer NOT NULL,
  need           text NOT NULL CHECK (need ~ '^[a-z0-9_]{1,30}$'),
  author         text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id, need)
);

CREATE INDEX ki_needs_band_idx ON ki_needs (band, need);

ALTER TABLE ki_needs ENABLE ROW LEVEL SECURITY;

ALTER TABLE training_plans ADD COLUMN needs_at timestamptz;
ALTER TABLE training_plan_comments ADD COLUMN needs_at timestamptz;

CREATE INDEX training_plans_needs_idx ON training_plans (id) WHERE needs_at IS NULL AND context IS NOT NULL;
CREATE INDEX training_plan_comments_needs_idx ON training_plan_comments (id) WHERE needs_at IS NULL;

ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_kind_check;
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_kind_check CHECK (kind IN ('draft', 'revision', 'visual', 'learning', 'exercise', 'feedback', 'observations', 'needs'));

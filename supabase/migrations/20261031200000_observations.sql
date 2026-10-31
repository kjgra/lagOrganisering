-- Observasjoner og mønstre per øvelse (trinn 2 i «Fra treneres innspill til
-- bedre øvelser»). Stikkordene i en evaluering er allerede observasjoner; KI
-- gjør fritekstkommentaren om til flere (exercise_observations), og
-- exercise_feedback.observed_at sier at kommentaren er gått gjennom. En
-- evaluering som lagres på nytt, får nye rader og går gjennom på nytt.
-- Hver natt (og etter hver evaluering) regnes et mønster ut per øvelse og
-- lagres i exercise_patterns. Tersklene for et mønster står i ai_settings.

ALTER TABLE exercise_feedback ADD COLUMN observed_at timestamptz;

CREATE TABLE exercise_observations (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id text NOT NULL,
  exercise_code  text NOT NULL CHECK (length(exercise_code) <= 60),
  feedback_id    integer NOT NULL REFERENCES exercise_feedback (id) ON DELETE CASCADE,
  kind           text NOT NULL CHECK (kind ~ '^[a-z_]{1,30}$'),
  part           text NOT NULL DEFAULT '' CHECK (part IN ('', 'organisering', 'gjennomforing', 'tilpasning', 'tegning')),
  strength       text NOT NULL CHECK (strength IN ('svak', 'tydelig')),
  suggestion     text NOT NULL DEFAULT '' CHECK (length(suggestion) <= 200),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX exercise_observations_code_idx ON exercise_observations (spond_group_id, exercise_code);
CREATE INDEX exercise_observations_feedback_idx ON exercise_observations (feedback_id);
CREATE INDEX exercise_feedback_unobserved_idx ON exercise_feedback (spond_group_id) WHERE observed_at IS NULL AND body IS NOT NULL;

CREATE TABLE exercise_patterns (
  spond_group_id text NOT NULL,
  exercise_code  text NOT NULL CHECK (length(exercise_code) <= 60),
  score          numeric(4, 2),
  ratings        integer NOT NULL DEFAULT 0,
  trend          text NOT NULL DEFAULT '' CHECK (trend IN ('', 'faller', 'byttes_ut')),
  patterns       jsonb NOT NULL DEFAULT '[]',
  computed_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, exercise_code)
);

ALTER TABLE exercise_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_patterns ENABLE ROW LEVEL SECURITY;

ALTER TABLE ai_settings ADD COLUMN pattern_min_sessions integer NOT NULL DEFAULT 3 CHECK (pattern_min_sessions BETWEEN 1 AND 20);
ALTER TABLE ai_settings ADD COLUMN pattern_min_trainers integer NOT NULL DEFAULT 2 CHECK (pattern_min_trainers BETWEEN 1 AND 10);

ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_kind_check;
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_kind_check CHECK (kind IN ('draft', 'revision', 'visual', 'learning', 'exercise', 'feedback', 'observations'));

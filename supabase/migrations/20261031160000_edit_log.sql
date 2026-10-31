-- Hva trenerne endrer i øvelser og i KIs forslag, som signal om hva som
-- fungerer. Én rad per lagring: feltene som ble endret, før og etter.
-- kind: ki_forslag (hva «Juster med KI» foreslo), retting_av_ki (hva treneren
-- endret i KIs versjon), manuell, opplegg_etter_ki (øvelser beholdt, fjernet
-- og lagt til i et opplegg KI laget).

CREATE TABLE edit_log (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id text NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('ki_forslag', 'retting_av_ki', 'manuell', 'opplegg_etter_ki')),
  exercise_code  text CHECK (length(exercise_code) <= 60),
  plan_id        integer REFERENCES training_plans (id) ON DELETE CASCADE,
  changes        jsonb NOT NULL,
  author         text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX edit_log_exercise_idx ON edit_log (spond_group_id, exercise_code, created_at DESC);
ALTER TABLE edit_log ENABLE ROW LEVEL SECURITY;

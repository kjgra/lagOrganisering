-- Forslag til bedre øvelser (trinn 3 i «Fra treneres innspill til bedre
-- øvelser»). Når et mønster i innspillene passerer terskelen, lager KI et
-- forslag uten at noen ber om det: en ny versjon, en tilpasning for en
-- bestemt situasjon, eller å arkivere øvelsen. Forslagene venter i
-- «Forbedringer» til en trener bruker, endrer eller avviser dem.
-- base_values er øvelsen da forslaget ble laget, values er forslaget (begge
-- som skjemaet viser dem). signature (problemtyper og trend) hindrer at samme
-- forslag lages igjen rett etter at det er behandlet. rejection er
-- begrunnelsen ved avslag, som KI får med seg neste gang.

CREATE TABLE improvement_proposals (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id text NOT NULL,
  exercise_code  text NOT NULL CHECK (length(exercise_code) <= 60),
  kind           text NOT NULL CHECK (kind IN ('ny_versjon', 'tilpasning', 'arkiver')),
  status         text NOT NULL DEFAULT 'ny' CHECK (status IN ('ny', 'brukt', 'endret', 'avvist', 'utdatert')),
  reason         text NOT NULL CHECK (length(reason) <= 1000),
  signature      text NOT NULL CHECK (length(signature) <= 300),
  base_values    jsonb NOT NULL,
  proposed       jsonb NOT NULL,
  model          text CHECK (length(model) <= 60),
  cost_usd       numeric(10, 5) NOT NULL DEFAULT 0,
  rejection      text CHECK (length(rejection) <= 300),
  decided_by     text,
  decided_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX improvement_proposals_open_idx ON improvement_proposals (spond_group_id, exercise_code) WHERE status = 'ny';
CREATE INDEX improvement_proposals_group_idx ON improvement_proposals (spond_group_id, created_at DESC);

ALTER TABLE improvement_proposals ENABLE ROW LEVEL SECURITY;

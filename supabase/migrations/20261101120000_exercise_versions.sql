-- Versjoner av øvelser (trinn 4 i «Fra treneres innspill til bedre øvelser»).
-- Hver endring av en øvelse gir en ny versjon (exercises.version), og
-- exercise_versions tar vare på hver versjon slik skjemaet viser den, så
-- appen kan måle snittet før og etter og gå tilbake. Første rad for en øvelse
-- lagres først når den endres. Hver evaluering knyttes til versjonen den
-- gjaldt: for en trening versjonen da opplegget ble laget, fra banken
-- versjonen da evalueringen ble lagret. Evalueringer fra før dette er versjon 1.
-- improvement_proposals får to nye ting: kind 'tilbakerulling' (appen gikk
-- tilbake fordi en ny versjon var klart dårligere) og status 'auto' (brukt
-- automatisk). ai_settings.auto_approve_small slår på automatisk bruk av små
-- forslag (bare nye linjer under enklere, vanskeligere, spørsmål og
-- læringsmomenter).

ALTER TABLE exercises ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version >= 1);

CREATE TABLE exercise_versions (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id text NOT NULL,
  exercise_code  text NOT NULL CHECK (length(exercise_code) <= 60),
  version        integer NOT NULL CHECK (version >= 1),
  vals           jsonb NOT NULL,
  source         text NOT NULL CHECK (source IN ('tidligere', 'endret', 'forbedring', 'automatisk', 'tilbakerulling')),
  proposal_id    integer REFERENCES improvement_proposals (id) ON DELETE SET NULL,
  created_by     text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spond_group_id, exercise_code, version)
);

ALTER TABLE exercise_versions ENABLE ROW LEVEL SECURITY;

ALTER TABLE exercise_feedback ADD COLUMN exercise_version integer NOT NULL DEFAULT 1 CHECK (exercise_version >= 1);

ALTER TABLE improvement_proposals DROP CONSTRAINT improvement_proposals_kind_check;
ALTER TABLE improvement_proposals ADD CONSTRAINT improvement_proposals_kind_check CHECK (kind IN ('ny_versjon', 'tilpasning', 'arkiver', 'tilbakerulling'));
ALTER TABLE improvement_proposals DROP CONSTRAINT improvement_proposals_status_check;
ALTER TABLE improvement_proposals ADD CONSTRAINT improvement_proposals_status_check CHECK (status IN ('ny', 'brukt', 'endret', 'avvist', 'utdatert', 'auto'));

ALTER TABLE ai_settings ADD COLUMN auto_approve_small boolean NOT NULL DEFAULT false;

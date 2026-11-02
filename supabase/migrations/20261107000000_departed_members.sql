-- Spillere som har sluttet: nivå, tagger og par slettes når en spiller har
-- vært borte fra Spond-gruppen i 90 dager (lib/store/departed.ts).
--
-- En rad her betyr at spilleren har data i appen, men ikke lenger står i
-- gruppen i Spond. Raden fjernes hvis spilleren kommer tilbake, og når
-- dataene er slettet. Ingen navn, bare ID-er.

CREATE TABLE departed_members (
  spond_group_id  text NOT NULL,
  spond_member_id text NOT NULL,
  missing_since   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, spond_member_id)
);

ALTER TABLE departed_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY nymark_app_all ON departed_members TO nymark_app USING (true) WITH CHECK (true);

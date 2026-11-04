-- Utstyr per lag: antall av hver type, så KI kan tilpasse øvelsene til det
-- laget har, og så vi senere kan regne ut hva NFFs rekkefølge krever når alle
-- gruppene trener samtidig. Følger «Laget» (team_settings): en undergruppe uten
-- egne innstillinger bruker hovedgruppas utstyr. Fritekstfeltet
-- team_settings.equipment blir en merknad om annet utstyr.

CREATE TABLE team_equipment (
  spond_group_id    text NOT NULL,
  spond_subgroup_id text NOT NULL DEFAULT '',
  kind              text NOT NULL CHECK (kind IN (
                      'ball', 'kjegle', 'dukkemaal', 'smaamaal', 'maal_7er',
                      'vest_gul', 'vest_oransje', 'vest_gronn', 'vest_bla', 'vest_rod', 'vest_rosa')),
  count             smallint NOT NULL CHECK (count BETWEEN 1 AND 500),
  PRIMARY KEY (spond_group_id, spond_subgroup_id, kind)
);

ALTER TABLE team_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY nymark_app_all ON team_equipment TO nymark_app USING (true) WITH CHECK (true);

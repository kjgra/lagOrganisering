-- 1) Nivå: ny skala der laveste nivå er 5 og høyeste er 10 (trenergruppas valg,
--    november 2026). Gamle nivåer 1–5 flyttes over: laveste til laveste,
--    høyeste til høyeste (1→5, 2→6, 3→8, 4→9, 5→10). Databasen tar ikke imot
--    lavere enn 5.
ALTER TABLE member_levels DROP CONSTRAINT member_levels_level_check;
UPDATE member_levels
   SET level = CASE level WHEN 1 THEN 5 WHEN 2 THEN 6 WHEN 3 THEN 8 WHEN 4 THEN 9 WHEN 5 THEN 10 END;
ALTER TABLE member_levels ADD CONSTRAINT member_levels_level_check CHECK (level BETWEEN 5 AND 10);

-- 2) Styrketagger (klargjort, ikke i bruk i appen ennå): det en spiller er god
--    på («strength») og det spilleren jobber med («focus»), valgt fra en fast
--    liste i lib/strengths.ts. Ingen fritekst, bare nøkler. Hører til
--    hovedgruppa, som nivå og tagger. Bare Spond-ID-er.
CREATE TABLE member_strengths (
  spond_group_id  text NOT NULL,
  spond_member_id text NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('strength', 'focus')),
  tag             text NOT NULL CHECK (tag ~ '^[a-z0-9-]{1,40}$'),
  created_by      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, spond_member_id, kind, tag)
);

ALTER TABLE member_strengths ENABLE ROW LEVEL SECURITY;
CREATE POLICY nymark_app_all ON member_strengths TO nymark_app USING (true) WITH CHECK (true);

-- Fordeling etter styrker: «mix» sprer styrkene over lagene, «focus» setter
-- spillere som jobber med det samme sammen. Ikke valgbart i appen ennå.
ALTER TABLE board_settings DROP CONSTRAINT board_settings_mode_check;
ALTER TABLE board_settings ADD CONSTRAINT board_settings_mode_check CHECK (mode IN ('even', 'levels', 'mix', 'focus'));

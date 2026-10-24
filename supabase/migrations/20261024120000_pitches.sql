-- Baner laget kan velge under «Lagets standard». Felles for alle grupper,
-- hentet fra baneoversikten på fotball.no. ID-en er banens fiksId der, og
-- delbaner peker på banen de er en del av. Nye anlegg legges til med en ny
-- migrasjon.

CREATE TABLE pitches (
  id         integer PRIMARY KEY,
  parent_id  integer REFERENCES pitches (id) ON DELETE SET NULL,
  facility   text NOT NULL CHECK (length(btrim(facility)) BETWEEN 1 AND 80),
  name       text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  surface    text CHECK (length(surface) <= 80),
  pitch_type text CHECK (length(pitch_type) <= 20),
  lighting   text CHECK (length(lighting) <= 40),
  length_m   smallint CHECK (length_m BETWEEN 1 AND 200),
  width_m    smallint CHECK (width_m BETWEEN 1 AND 200),
  retired    boolean NOT NULL DEFAULT false,
  sort       smallint NOT NULL DEFAULT 0
);

ALTER TABLE pitches ENABLE ROW LEVEL SECURITY;

-- Fritekstfeltet «pitch» blir en merknad til valgt bane.
ALTER TABLE team_settings ADD COLUMN pitch_id integer REFERENCES pitches (id) ON DELETE SET NULL;

-- Nymark idrettsanlegg, https://www.fotball.no/fotballdata/anlegg/hjem/?fiksId=12101
-- (hentet 2026-10-24). Lengde og bredde i meter, belysning som oppgitt, NULL
-- er ingen belysning. Kunstgress 08 er merket «Utgår», men delbanene er i bruk.
INSERT INTO pitches (id, parent_id, facility, name, surface, pitch_type, lighting, length_m, width_m, retired, sort) VALUES
  (683, NULL, 'Nymark idrettsanlegg', 'Nymark Kunstgress 07', 'Kunstgress m/plastholdig innfyll', '5er', '150 lux', 40, 32, false, 1),
  (22416, 683, 'Nymark idrettsanlegg', 'Nymark Kunstgress 07 5er A LT2018', 'Kunstgress m/plastholdig innfyll', '5er', '150 lux', 40, 32, false, 2),
  (684, NULL, 'Nymark idrettsanlegg', 'Nymark Kunstgress 04', 'Kunstgress m/plastholdig innfyll', '11er', '150 lux', 100, 60, false, 3),
  (8876, 684, 'Nymark idrettsanlegg', 'Nymark Kunstgress 04 9er A', 'Kunstgress m/plastholdig innfyll', '9er', '150 lux', 60, 48, false, 4),
  (18049, 8876, 'Nymark idrettsanlegg', 'Nymark Kunstgress 04 7er A', 'Kunstgress m/plastholdig innfyll', '7er', '150 lux', 48, 30, false, 5),
  (18050, 8876, 'Nymark idrettsanlegg', 'Nymark Kunstgress 04 7er B', 'Kunstgress m/plastholdig innfyll', '7er', '150 lux', 60, 48, false, 6),
  (3985, 684, 'Nymark idrettsanlegg', 'Nymark Kunstgress 04 9er B', 'Kunstgress m/plastholdig innfyll', '9er', '150 lux', 60, 48, false, 7),
  (18051, 3985, 'Nymark idrettsanlegg', 'Nymark Kunstgress 04 7er C', 'Kunstgress m/plastholdig innfyll', '7er', '150 lux', 48, 30, false, 8),
  (28300, 18051, 'Nymark idrettsanlegg', 'Nymark Kunstgress 04 5er 6', 'Kunstgress m/plastholdig innfyll', '5er', '150 lux', NULL, NULL, false, 9),
  (18052, 3985, 'Nymark idrettsanlegg', 'Nymark Kunstgress 04 7er D', 'Kunstgress m/plastholdig innfyll', '7er', '150 lux', 48, 30, false, 10),
  (22424, 18052, 'Nymark idrettsanlegg', 'Nymark Kunstgress 04 5er 5', 'Kunstgress m/plastholdig innfyll', '5er', '150 lux', 48, 30, false, 11),
  (685, NULL, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03', 'Kunstgress m/innfyll som ikke er av plast', '11er', '150 lux', 100, 64, false, 12),
  (3984, 685, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 9er A', 'Kunstgress m/innfyll som ikke er av plast', '9er', '150 lux', 60, 50, false, 13),
  (18185, 3984, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 7er A', 'Kunstgress m/innfyll som ikke er av plast', '7er', '150 lux', 60, 50, false, 14),
  (22417, 18185, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 5er 1', 'Kunstgress m/innfyll som ikke er av plast', '5er', '150 lux', 30, 20, false, 15),
  (22418, 18185, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 5er 2', 'Kunstgress m/innfyll som ikke er av plast', '5er', '150 lux', 30, 20, false, 16),
  (18186, 3984, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 7er B', 'Kunstgress m/innfyll som ikke er av plast', '7er', '150 lux', 60, 50, false, 17),
  (22422, 18186, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 5er 3', 'Kunstgress m/innfyll som ikke er av plast', '5er', '150 lux', 30, 20, false, 18),
  (22423, 18186, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 5er 4', 'Kunstgress m/innfyll som ikke er av plast', '5er', '150 lux', 30, 20, false, 19),
  (8875, 685, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 9er B', 'Kunstgress m/innfyll som ikke er av plast', '9er', '150 lux', 60, 50, false, 20),
  (18187, 8875, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 7er C', 'Kunstgress m/innfyll som ikke er av plast', '7er', '150 lux', 60, 50, false, 21),
  (28301, 18187, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 3er 1', 'Kunstgress m/innfyll som ikke er av plast', '3er', '150 lux', NULL, NULL, false, 22),
  (28302, 18187, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 3er 2', 'Kunstgress m/innfyll som ikke er av plast', '3er', '150 lux', NULL, NULL, false, 23),
  (18188, 8875, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 7er D', 'Kunstgress m/innfyll som ikke er av plast', '7er', '150 lux', 60, 50, false, 24),
  (28303, 18188, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 3er 3', 'Kunstgress m/innfyll som ikke er av plast', '3er', '150 lux', NULL, NULL, false, 25),
  (28304, 18188, 'Nymark idrettsanlegg', 'Nymark Kunstgress 03 3er 4', 'Kunstgress m/innfyll som ikke er av plast', '3er', '150 lux', NULL, NULL, false, 26),
  (686, NULL, 'Nymark idrettsanlegg', 'Nymark gress 01', 'Naturgress', '11er', NULL, 100, 60, false, 27),
  (5866, NULL, 'Nymark idrettsanlegg', 'Nymark Kunstgress 06', 'Kunstgress m/innfyll som ikke er av plast', '7er', '150 lux', 50, 28, false, 28),
  (22415, 5866, 'Nymark idrettsanlegg', 'Nymark Kunstgress 06 7er', 'Kunstgress m/innfyll som ikke er av plast', '7er', '150 lux', 50, 28, false, 29),
  (5867, NULL, 'Nymark idrettsanlegg', 'Nymark kunstgress 05', 'Kunstgress m/plastholdig innfyll', '11er', '150 lux', 100, 60, false, 30),
  (8877, 5867, 'Nymark idrettsanlegg', 'Nymark 05 9er A', 'Kunstgress m/plastholdig innfyll', '9er', '150 lux', 60, 50, false, 31),
  (8878, 5867, 'Nymark idrettsanlegg', 'Nymark 05 9er B', 'Kunstgress m/plastholdig innfyll', '9er', '150 lux', 60, 50, false, 32),
  (5868, NULL, 'Nymark idrettsanlegg', 'Nymark gress 02', 'Naturgress', '11er', NULL, 100, 60, false, 33),
  (22419, NULL, 'Nymark idrettsanlegg', 'Nymark kunstgress 08', 'Kunstgress u/innfyll', '5er', NULL, NULL, NULL, true, 34),
  (22420, 22419, 'Nymark idrettsanlegg', 'Nymark Kunstgress 08 3er A LT2018', 'Kunstgress u/innfyll', '3er', NULL, 15, 10, false, 35),
  (22421, 22419, 'Nymark idrettsanlegg', 'Nymark Kunstgress 08 3er B LT2018', 'Kunstgress u/innfyll', '3er', NULL, 15, 10, false, 36)
ON CONFLICT (id) DO UPDATE
  SET parent_id = EXCLUDED.parent_id, facility = EXCLUDED.facility, name = EXCLUDED.name, surface = EXCLUDED.surface,
      pitch_type = EXCLUDED.pitch_type, lighting = EXCLUDED.lighting, length_m = EXCLUDED.length_m,
      width_m = EXCLUDED.width_m, retired = EXCLUDED.retired, sort = EXCLUDED.sort;

-- Felles øvelsesbank (trinn 5 i «Fra treneres innspill til bedre øvelser»).
-- Banken er én for hele appen og eies ikke av noen gruppe: alle grupper ser
-- og evaluerer de samme øvelsene, og innspillene fra alle lagene teller.
-- Øvelser, versjoner, observasjoner, forslag og endringslogg for øvelser får
-- spond_group_id 'felles'. Opplegg, evalueringer, lærdommer og
-- laginnstillinger hører fortsatt til lagets gruppe.
--
-- Har to grupper en øvelse med samme kode, beholder den eldste koden, og den
-- andre får id-en sin bak koden (også i gruppas evalueringer og logg).
-- Mønstrene regnes ut på nytt ved neste analyse.

CREATE TEMP TABLE bank_codes AS
SELECT spond_group_id AS g, code AS old, left(code, 50) || '-' || id AS new
  FROM (SELECT id, spond_group_id, code, row_number() OVER (PARTITION BY code ORDER BY id) AS n FROM exercises) x
 WHERE n > 1;

UPDATE exercise_feedback f SET exercise_code = m.new FROM bank_codes m WHERE f.spond_group_id = m.g AND f.exercise_code = m.old;
UPDATE training_plan_comments c SET exercise_code = m.new FROM bank_codes m WHERE c.spond_group_id = m.g AND c.exercise_code = m.old;
UPDATE exercise_versions v SET exercise_code = m.new FROM bank_codes m WHERE v.spond_group_id = m.g AND v.exercise_code = m.old;
UPDATE exercise_observations o SET exercise_code = m.new FROM bank_codes m WHERE o.spond_group_id = m.g AND o.exercise_code = m.old;
UPDATE improvement_proposals p SET exercise_code = m.new FROM bank_codes m WHERE p.spond_group_id = m.g AND p.exercise_code = m.old;
UPDATE edit_log l SET exercise_code = m.new FROM bank_codes m WHERE l.spond_group_id = m.g AND l.exercise_code = m.old;
UPDATE exercises e SET based_on = m.new FROM bank_codes m WHERE e.spond_group_id = m.g AND e.based_on = m.old;
UPDATE exercises e SET code = m.new FROM bank_codes m WHERE e.spond_group_id = m.g AND e.code = m.old;

UPDATE exercises SET spond_group_id = 'felles';
UPDATE exercise_versions SET spond_group_id = 'felles';
UPDATE exercise_observations SET spond_group_id = 'felles';
UPDATE improvement_proposals SET spond_group_id = 'felles';
UPDATE edit_log SET spond_group_id = 'felles' WHERE exercise_code IS NOT NULL;
DELETE FROM exercise_patterns;

DROP TABLE bank_codes;

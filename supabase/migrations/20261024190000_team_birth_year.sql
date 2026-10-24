-- Lagets årskull: fødselsår og kjønn i stedet for fritekst «Aldersgruppe». Alder, NFF-bånd
-- og spillformat regnes ut fra sesongåret, så de flytter seg av seg selv hvert år.
-- age_group blir stående for verdier som ikke kunne tolkes.

ALTER TABLE team_settings ADD COLUMN birth_year smallint CHECK (birth_year BETWEEN 2000 AND 2100);
ALTER TABLE team_settings ADD COLUMN gender text CHECK (gender IN ('gutter', 'jenter', 'mix'));

-- «G2016», «Jenter 2016», «2016»: fødselsåret står der.
UPDATE team_settings
   SET birth_year = substring(age_group FROM '(20[0-9]{2})')::smallint,
       gender = CASE WHEN age_group ~* '^\s*(g|gutter)' THEN 'gutter' WHEN age_group ~* '^\s*(j|jenter)' THEN 'jenter' END,
       age_group = NULL
 WHERE age_group ~* '^\s*((g|j|gutter|jenter)\s*)?20[0-9]{2}\s*$';

-- «G10», «J9»: alderen i året verdien sist ble lagret.
UPDATE team_settings
   SET birth_year = extract(year FROM updated_at AT TIME ZONE 'Europe/Oslo')::int - substring(age_group FROM '([0-9]{1,2})')::int,
       gender = CASE WHEN age_group ~* '^\s*g' THEN 'gutter' ELSE 'jenter' END,
       age_group = NULL
 WHERE age_group ~* '^\s*[gj]\s*[0-9]{1,2}\s*$';

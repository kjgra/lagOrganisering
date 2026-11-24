-- Spillerpar kan nå også være «bør ikke være på samme lag» (issue #65). Det
-- lagres ingen grunn, bare de to Spond-ID-ene og typen. Et par har én type:
-- å velge den andre typen bytter den.
ALTER TABLE member_pairs ADD COLUMN kind text NOT NULL DEFAULT 'together' CHECK (kind IN ('together', 'apart'));

-- «Fordeling»: hold slike par på hver sitt lag (på som standard).
ALTER TABLE board_settings ADD COLUMN apart boolean NOT NULL DEFAULT true;

-- Taggtyper: nivå (1–5) og «spiller godt sammen», i tillegg til fritekst-taggene.
-- Begge hører til hovedgruppa, som taggene. Bare Spond-ID-er.

CREATE TABLE member_levels (
  spond_group_id  text NOT NULL,
  spond_member_id text NOT NULL,
  level           smallint NOT NULL CHECK (level BETWEEN 1 AND 5),
  updated_by      text NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, spond_member_id)
);

-- Et par lagres én gang, med den minste ID-en først.
CREATE TABLE member_pairs (
  spond_group_id text NOT NULL,
  member_a       text NOT NULL,
  member_b       text NOT NULL,
  created_by     text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, member_a, member_b),
  CHECK (member_a < member_b)
);

ALTER TABLE member_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_pairs ENABLE ROW LEVEL SECURITY;

-- Hvem som ser og endrer tagger, nivå og par. Alle trenere som standard.
ALTER TABLE app_roles ADD COLUMN can_see_tags boolean NOT NULL DEFAULT true;
ALTER TABLE app_role_log DROP CONSTRAINT app_role_log_role_check;
ALTER TABLE app_role_log ADD CONSTRAINT app_role_log_role_check CHECK (role IN ('ai', 'admin', 'app', 'tags'));

-- Fritekst-tagger som bare er et tall fra 1 til 5, blir nivå. Har en spiller
-- flere, gjelder den nyeste.
INSERT INTO member_levels (spond_group_id, spond_member_id, level, updated_by, updated_at)
SELECT DISTINCT ON (spond_group_id, spond_member_id) spond_group_id, spond_member_id, btrim(tag)::smallint, created_by, created_at
  FROM member_tags WHERE btrim(tag) ~ '^[1-5]$'
 ORDER BY spond_group_id, spond_member_id, created_at DESC
ON CONFLICT (spond_group_id, spond_member_id) DO NOTHING;
DELETE FROM member_tags WHERE btrim(tag) ~ '^[1-5]$';

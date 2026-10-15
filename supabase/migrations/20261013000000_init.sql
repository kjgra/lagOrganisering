-- Nymark – Gruppeorganisering: første skjema.
--
-- Samler sluttilstanden fra den gamle appen (SpondNymark, migrasjon 001–014)
-- og legger til brukerinnstillinger (favoritter og sist brukte grupper).
--
-- Vi lagrer bare Spond-ID-er (spond_*, created_by, actor, author, editor og
-- lignende er Spond-profil- eller medlems-ID-er). Aldri navn, kontaktinfo,
-- helseopplysninger eller annet fra Spond. Navn hentes fra Spond ved visning.
--
-- Databasen brukes bare av serveren (Next.js). Row Level Security er på for
-- alle tabeller, uten policies, så Supabase sitt Data API (anon og
-- authenticated) ikke kommer til noe.

-- Tagger på medlemmer ------------------------------------------------------------

CREATE TABLE member_tags (
  spond_group_id  text NOT NULL,
  spond_member_id text NOT NULL,
  tag             text NOT NULL CHECK (length(btrim(tag)) BETWEEN 1 AND 40),
  created_by      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, spond_member_id, tag)
);

-- Gruppeforslag (lagforslag) -------------------------------------------------------

CREATE TABLE group_proposals (
  id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id    text NOT NULL,
  -- Bare for gruppeutkast: konteksten utkastet ble laget i (NULL = hele gruppen).
  spond_subgroup_id text,
  spond_event_id    text,
  name              text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'rolled_back', 'deleted')),
  created_by        text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX group_proposals_context_idx
  ON group_proposals (spond_group_id, spond_event_id, spond_subgroup_id)
  WHERE status <> 'deleted';

CREATE TABLE group_proposal_labels (
  proposal_id integer NOT NULL REFERENCES group_proposals (id) ON DELETE CASCADE,
  label       text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 60),
  sort_order  integer NOT NULL,
  PRIMARY KEY (proposal_id, label)
);

CREATE TABLE group_proposal_members (
  proposal_id     integer NOT NULL,
  spond_member_id text NOT NULL,
  label           text NOT NULL,
  PRIMARY KEY (proposal_id, spond_member_id),
  FOREIGN KEY (proposal_id, label) REFERENCES group_proposal_labels (proposal_id, label)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE proposal_history (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id integer NOT NULL REFERENCES group_proposals (id) ON DELETE CASCADE,
  actor       text NOT NULL,
  decision    text NOT NULL
              CHECK (decision IN ('created', 'edited', 'sent_for_approval', 'approved', 'rejected', 'rolled_back', 'deleted')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX proposal_history_proposal_idx ON proposal_history (proposal_id);

CREATE TABLE proposal_comments (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id integer NOT NULL REFERENCES group_proposals (id) ON DELETE CASCADE,
  author      text NOT NULL,
  body        text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX proposal_comments_proposal_idx ON proposal_comments (proposal_id);

-- Hvem redigerer hva akkurat nå (veiledende låser). proposal_id NULL = nytt forslag.
CREATE TABLE edit_locks (
  id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id    text NOT NULL,
  spond_subgroup_id text,
  spond_event_id    text,
  proposal_id       integer REFERENCES group_proposals (id) ON DELETE CASCADE,
  editor            text NOT NULL,
  session_key       text NOT NULL UNIQUE,
  started_at        timestamptz NOT NULL DEFAULT now(),
  heartbeat_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX edit_locks_group_idx ON edit_locks (spond_group_id);

-- Brukerinnstillinger: favoritter og sist brukte grupper --------------------------
-- Gruppe-referanser lagres som "<hovedgruppe-id>:<undergruppe-id>" eller
-- "<hovedgruppe-id>:" for hele hovedgruppen. Bare Spond-ID-er.

CREATE TABLE user_preferences (
  spond_profile_id text PRIMARY KEY,
  favorites        text[] NOT NULL DEFAULT '{}' CHECK (cardinality(favorites) <= 50),
  recent           text[] NOT NULL DEFAULT '{}' CHECK (cardinality(recent) <= 10),
  last_group       text,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Treningsopplegg: årshjul, lagets standard og øvelser ----------------------------

CREATE TABLE season_themes (
  spond_group_id text NOT NULL,
  year           integer NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  month          integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  theme          text NOT NULL CHECK (length(btrim(theme)) BETWEEN 1 AND 80),
  description    text CHECK (length(description) <= 500),
  updated_by     text NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, year, month)
);

CREATE TABLE team_settings (
  spond_group_id  text PRIMARY KEY,
  age_group       text CHECK (length(age_group) <= 40),
  session_minutes integer CHECK (session_minutes BETWEEN 15 AND 240),
  pitch           text CHECK (length(pitch) <= 200),
  equipment       text CHECK (length(equipment) <= 1000),
  principles      text CHECK (length(principles) <= 2000),
  updated_by      text NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exercises (
  id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id   text NOT NULL,
  code             text NOT NULL CHECK (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(code) <= 60),
  name             text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  category         text NOT NULL CHECK (length(category) BETWEEN 1 AND 40),
  themes           text[] NOT NULL DEFAULT '{}',
  min_players      integer CHECK (min_players BETWEEN 1 AND 60),
  max_players      integer CHECK (max_players BETWEEN 1 AND 60),
  duration_minutes integer CHECK (duration_minutes BETWEEN 1 AND 120),
  area             text CHECK (length(area) <= 60),
  organisation     text CHECK (length(organisation) <= 2000),
  execution        text CHECK (length(execution) <= 2000),
  learning_points  text CHECK (length(learning_points) <= 2000),
  questions        text CHECK (length(questions) <= 2000),
  easier           text CHECK (length(easier) <= 1000),
  harder           text CHECK (length(harder) <= 1000),
  nff_url          text CHECK (nff_url ~ '^https://' AND length(nff_url) <= 500),
  drawing          jsonb,
  source           text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
  based_on         text CHECK (based_on ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(based_on) <= 60),
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'candidate', 'archived')),
  created_by       text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       text NOT NULL,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spond_group_id, code),
  CHECK (min_players IS NULL OR max_players IS NULL OR max_players >= min_players)
);

-- Opplegg per arrangement, med versjoner. Lagres som JSON, aldri med spillernavn.
CREATE TABLE training_plans (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id text NOT NULL,
  spond_event_id text NOT NULL,
  version        integer NOT NULL CHECK (version >= 1),
  status         text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'deleted')),
  plan           jsonb NOT NULL,
  source         text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
  model          text,
  cost_usd       numeric(10, 5),
  created_by     text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  approved_by    text,
  approved_at    timestamptz,
  UNIQUE (spond_group_id, spond_event_id, version)
);

CREATE INDEX training_plans_event_idx ON training_plans (spond_group_id, spond_event_id);
CREATE UNIQUE INDEX training_plans_one_approved_idx ON training_plans (spond_group_id, spond_event_id) WHERE status = 'approved';

-- Rettigheter ----------------------------------------------------------------------
-- Hvem som er trener, kommer fra Spond. Her ligger bare app-tilgang, KI og admin.
-- Superadmin står i miljøvariabelen SUPERADMIN_PROFILE_ID, så ingen kan låse seg ute.

CREATE TABLE app_roles (
  spond_profile_id text PRIMARY KEY,
  can_use_ai       boolean NOT NULL DEFAULT false,
  is_admin         boolean NOT NULL DEFAULT false,
  can_use_app      boolean NOT NULL DEFAULT false,
  updated_by       text NOT NULL,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_role_log (
  id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_profile_id text NOT NULL,
  role             text NOT NULL CHECK (role IN ('ai', 'admin', 'app')),
  granted          boolean NOT NULL,
  actor            text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_role_log_profile_idx ON app_role_log (spond_profile_id);

-- KI: forbruk og innstillinger. Aldri tekst fra prompt eller svar. -----------------

CREATE TABLE ai_usage (
  id                 integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at         timestamptz NOT NULL DEFAULT now(),
  spond_profile_id   text NOT NULL,
  spond_group_id     text NOT NULL,
  spond_event_id     text,
  plan_id            integer REFERENCES training_plans (id) ON DELETE SET NULL,
  kind               text NOT NULL CHECK (kind IN ('draft', 'revision', 'visual', 'learning')),
  model              text NOT NULL CHECK (length(model) <= 60),
  input_tokens       integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens      integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cache_read_tokens  integer NOT NULL DEFAULT 0 CHECK (cache_read_tokens >= 0),
  cache_write_tokens integer NOT NULL DEFAULT 0 CHECK (cache_write_tokens >= 0),
  cost_usd           numeric(10, 5) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  duration_ms        integer CHECK (duration_ms >= 0),
  status             text NOT NULL CHECK (status IN ('ok', 'error')),
  error_code         text CHECK (length(error_code) <= 60)
);

CREATE INDEX ai_usage_created_idx ON ai_usage (created_at);
CREATE INDEX ai_usage_group_idx ON ai_usage (spond_group_id, created_at);

CREATE TABLE ai_settings (
  id                boolean PRIMARY KEY DEFAULT true CHECK (id),
  model             text NOT NULL CHECK (length(model) <= 60),
  group_limit_nok   numeric(8, 2) NOT NULL CHECK (group_limit_nok >= 0),
  total_limit_usd   numeric(8, 2) NOT NULL CHECK (total_limit_usd >= 0),
  max_new_exercises integer NOT NULL CHECK (max_new_exercises BETWEEN 0 AND 6),
  usd_nok           numeric(6, 3) NOT NULL CHECK (usd_nok > 0),
  link_domains      text[] NOT NULL DEFAULT '{tiim.no,fotball.no}',
  updated_by        text NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Kommentarer på opplegg -------------------------------------------------------------

CREATE TABLE training_plan_comments (
  id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id  text NOT NULL,
  spond_event_id  text NOT NULL,
  plan_id         integer NOT NULL REFERENCES training_plans (id) ON DELETE CASCADE,
  exercise_no     integer CHECK (exercise_no BETWEEN 1 AND 6),
  exercise_code   text CHECK (length(exercise_code) <= 60),
  author          text NOT NULL,
  body            text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 1000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  used_in_plan_id integer REFERENCES training_plans (id) ON DELETE SET NULL
);

CREATE INDEX training_plan_comments_event_idx ON training_plan_comments (spond_group_id, spond_event_id);

-- Evaluering og lærdommer --------------------------------------------------------------

CREATE TABLE exercise_feedback (
  id                 integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id     text NOT NULL,
  spond_event_id     text NOT NULL,
  plan_id            integer NOT NULL REFERENCES training_plans (id) ON DELETE CASCADE,
  exercise_no        integer CHECK (exercise_no BETWEEN 1 AND 6),
  exercise_code      text CHECK (length(exercise_code) <= 60),
  rating             integer CHECK (rating BETWEEN 1 AND 3),
  tags               text[] NOT NULL DEFAULT '{}',
  actual_minutes     integer CHECK (actual_minutes BETWEEN 0 AND 240),
  actual_players     integer CHECK (actual_players BETWEEN 0 AND 200),
  registered_players integer CHECK (registered_players BETWEEN 0 AND 200),
  body               text CHECK (length(body) <= 300),
  use_again          text CHECK (use_again IN ('yes', 'changes', 'no')),
  author             text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX exercise_feedback_one_idx ON exercise_feedback (plan_id, (coalesce(exercise_no, 0)), author);
CREATE INDEX exercise_feedback_event_idx ON exercise_feedback (spond_group_id, spond_event_id);
CREATE INDEX exercise_feedback_code_idx ON exercise_feedback (spond_group_id, exercise_code);

CREATE TABLE team_learnings (
  id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_id  text NOT NULL,
  body            text NOT NULL CHECK (length(body) <= 3000),
  source          text NOT NULL CHECK (source IN ('manual', 'ai')),
  created_by      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX team_learnings_group_idx ON team_learnings (spond_group_id, created_at);

-- Vedlikehold og arkiv -------------------------------------------------------------------

CREATE TABLE maintenance (
  id           integer PRIMARY KEY CHECK (id = 1),
  last_run     timestamptz,
  run_by       text CHECK (length(run_by) <= 60),
  last_result  text CHECK (length(last_result) <= 2000)
);

INSERT INTO maintenance (id) VALUES (1);

CREATE TABLE archive_log (
  id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_group_ids  text[] NOT NULL,
  period_from      date,
  period_to        date,
  n_events         integer NOT NULL CHECK (n_events >= 0),
  n_versions       integer NOT NULL CHECK (n_versions >= 0),
  confirmed_by     text NOT NULL,
  confirmed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_usage_monthly (
  month              date NOT NULL,
  spond_group_id     text NOT NULL,
  kind               text NOT NULL,
  model              text NOT NULL,
  n                  integer NOT NULL,
  n_error            integer NOT NULL,
  input_tokens       bigint NOT NULL,
  output_tokens      bigint NOT NULL,
  cache_read_tokens  bigint NOT NULL,
  cache_write_tokens bigint NOT NULL,
  cost_usd           numeric(12, 5) NOT NULL,
  PRIMARY KEY (month, spond_group_id, kind, model)
);

-- Row Level Security på alt, uten policies ----------------------------------------------

ALTER TABLE member_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_proposal_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_proposal_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_role_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plan_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_monthly ENABLE ROW LEVEL SECURITY;

-- I Supabase: ta i tillegg bort alle rettigheter for Data API-rollene.
-- Rollene finnes bare i Supabase, så blokken gjør ingenting andre steder.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
  END IF;
END
$$;

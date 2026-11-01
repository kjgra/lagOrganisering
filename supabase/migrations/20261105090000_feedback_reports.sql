-- Tilbakemeldinger fra brukerne av appen (feil og forslag). De venter i
-- superadmins innboks; bare det superadmin sender, blir et GitHub-issue (repoet
-- er offentlig). Avviste meldinger slettes. author er Spond-profil-ID-en og
-- sendes aldri til GitHub.

CREATE TABLE feedback_reports (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind          text NOT NULL CHECK (kind IN ('feil', 'forslag')),
  body          text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  page          text NOT NULL DEFAULT '' CHECK (char_length(page) <= 200),
  app_version   text NOT NULL CHECK (char_length(app_version) <= 20),
  client        text NOT NULL DEFAULT '' CHECK (char_length(client) <= 100),
  role          text NOT NULL CHECK (role IN ('trener', 'admin')),
  author        text NOT NULL,
  status        text NOT NULL DEFAULT 'ny' CHECK (status IN ('ny', 'sendt')),
  issue_number  integer,
  issue_url     text,
  decided_by    text,
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_reports_author_idx ON feedback_reports (author, created_at);
CREATE INDEX feedback_reports_status_idx ON feedback_reports (status, created_at);

ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;

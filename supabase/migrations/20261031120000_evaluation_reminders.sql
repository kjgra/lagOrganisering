-- Påminnelse om å evaluere etter trening.
--
-- Når et opplegg lagres, lagres også når treningen starter og slutter, så appen
-- vet når det er tid for evaluering uten å spørre Spond (påminnelsene sendes
-- uten at noen er logget inn).

ALTER TABLE training_plans ADD COLUMN event_start timestamptz;
ALTER TABLE training_plans ADD COLUMN event_end timestamptz;
CREATE INDEX training_plans_event_end_idx ON training_plans (event_end) WHERE event_end IS NOT NULL;

-- Varsler på mobilen (Web Push). Én rad per nettleser/enhet som har slått på
-- varsler. group_ids er gruppene treneren hadde tilgang til da varslene ble
-- slått på eller sist oppdatert; bare de gir påminnelser.
CREATE TABLE push_subscriptions (
  id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  spond_profile_id text NOT NULL,
  endpoint         text NOT NULL UNIQUE CHECK (length(endpoint) <= 1000),
  p256dh           text NOT NULL CHECK (length(p256dh) <= 200),
  auth             text NOT NULL CHECK (length(auth) <= 100),
  group_ids        text[] NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_profile_idx ON push_subscriptions (spond_profile_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Hvem som har fått påminnelse om hvilken trening, så ingen får den to ganger.
CREATE TABLE evaluation_reminders (
  spond_group_id   text NOT NULL,
  spond_event_id   text NOT NULL,
  spond_profile_id text NOT NULL,
  sent_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spond_group_id, spond_event_id, spond_profile_id)
);

ALTER TABLE evaluation_reminders ENABLE ROW LEVEL SECURITY;

-- Felles øvelsesbank (trinn 5 i «Fra treneres innspill til bedre øvelser»).
-- Superadmin kan velge én hovedgruppe i Spond hvis øvelsesbank brukes av alle
-- grupper i appen (for eksempel barne- og ungdomsfotball i Nymark). Øvelser,
-- versjoner, observasjoner, mønstre og forslag lagres da på den gruppa, mens
-- evalueringer, opplegg, lærdommer og innstillinger fortsatt hører til laget.
-- bank_of(gruppe) gir gruppa som har banken: den felles banken når den er
-- valgt, ellers gruppa selv. Uten valg er alt som før.

CREATE TABLE bank_settings (
  id              boolean PRIMARY KEY DEFAULT true CHECK (id),
  shared_group_id text CHECK (length(shared_group_id) <= 100),
  updated_by      text NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bank_settings ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION bank_of(g text) RETURNS text
  LANGUAGE sql STABLE
  SET search_path = public
  AS $$ SELECT coalesce((SELECT shared_group_id FROM bank_settings WHERE id), g) $$;

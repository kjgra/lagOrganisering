-- Læring på øktnivå, steg 1: hva et KI-opplegg ble laget for (aldersbånd, spillere,
-- grupper, minutter, trenere, tema og trenerens ønske), lagret sammen med opplegget,
-- slik at økter kan sammenlignes senere. Ønsket er sjekket for navn og sensitive ord
-- før det sendes til KI. Tom for opplegg laget uten KI.
--
-- Stikkord på «Hele økta» lagres i den eksisterende kolonnen exercise_feedback.tags;
-- lovlige verdier sjekkes i koden (SESSION_TAGS), så det trengs ingen endring der.

ALTER TABLE training_plans ADD COLUMN context jsonb CHECK (context IS NULL OR (jsonb_typeof(context) = 'object' AND length(context::text) <= 8000));

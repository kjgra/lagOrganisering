-- «Fortell om økta»: KI fyller ut evalueringen fra trenerens egne ord.
-- Kallene logges som en egen type.

ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_kind_check;
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_kind_check CHECK (kind IN ('draft', 'revision', 'visual', 'learning', 'exercise', 'feedback'));

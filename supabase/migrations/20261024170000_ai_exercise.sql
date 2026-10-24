-- «Ny øvelse med KI» i øvelsesbanken: KI-kallene logges som en egen type,
-- så prisoverslaget bygger på svar av samme lengde.

ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_kind_check;
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_kind_check CHECK (kind IN ('draft', 'revision', 'visual', 'learning', 'exercise'));

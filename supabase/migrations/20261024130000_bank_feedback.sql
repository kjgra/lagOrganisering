-- Evaluering fra øvelsesbanken -----------------------------------------------------------
-- A trainer can evaluate an exercise straight from the bank, not only after a training.
-- Such a row has no plan or event, is about one exercise (by code), and there is one per
-- trainer and exercise. Rows from a training are unchanged.

ALTER TABLE exercise_feedback ALTER COLUMN spond_event_id DROP NOT NULL;
ALTER TABLE exercise_feedback ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE exercise_feedback ADD CONSTRAINT exercise_feedback_source_check CHECK (
  (plan_id IS NOT NULL AND spond_event_id IS NOT NULL)
  OR (plan_id IS NULL AND spond_event_id IS NULL AND exercise_no IS NULL AND exercise_code IS NOT NULL
      AND rating IS NOT NULL AND actual_players IS NULL AND registered_players IS NULL)
);

CREATE UNIQUE INDEX exercise_feedback_bank_idx ON exercise_feedback (spond_group_id, exercise_code, author) WHERE plan_id IS NULL;

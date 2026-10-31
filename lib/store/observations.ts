import type { Db } from "@/lib/db";
import type { EvaluationRow, ExercisePattern, Observation } from "@/lib/plans/observations";
import { assertGroup, type Access } from "./access";

/**
 * Observations and patterns per exercise (see lib/plans/observations.ts).
 * The analysis also runs at night without anyone logged in, so the functions
 * it uses take a group id and no access; the page reads with access.
 */

// Exercise rows of an evaluation: an exercise in a training, or an exercise evaluated from the bank.
const EXERCISE_ROWS = "f.exercise_code IS NOT NULL AND (f.exercise_no IS NOT NULL OR f.plan_id IS NULL)";

export interface CommentRow {
  id: number;
  exercise: string;
  rating: number | null;
  tags: string[];
  body: string;
}

/** Comments that KI has not turned into observations yet, oldest first. */
export async function unobservedComments(d: Db, groupId: string, limit: number): Promise<CommentRow[]> {
  return d.query<CommentRow>(
    `SELECT f.id, coalesce(e.name, f.exercise_code) AS exercise, f.rating, f.tags, f.body
       FROM exercise_feedback f
       LEFT JOIN exercises e ON e.spond_group_id = f.spond_group_id AND e.code = f.exercise_code
      WHERE f.spond_group_id = $1 AND f.observed_at IS NULL AND f.body IS NOT NULL AND ${EXERCISE_ROWS}
      ORDER BY f.id LIMIT $2::int`,
    [groupId, limit],
  );
}

/** Store what KI found in each comment, and mark it as gone through. A comment changed meanwhile is skipped. */
export async function saveObservations(d: Db, groupId: string, found: Map<number, Observation[]>): Promise<number> {
  let n = 0;
  await d.tx(async (t) => {
    for (const [id, obs] of found) {
      const [row] = await t.query<{ exercise_code: string }>(
        "UPDATE exercise_feedback SET observed_at = now() WHERE id = $1 AND spond_group_id = $2 AND observed_at IS NULL RETURNING exercise_code",
        [id, groupId],
      );
      if (!row) continue;
      for (const o of obs) {
        await t.query(
          `INSERT INTO exercise_observations (spond_group_id, exercise_code, feedback_id, kind, part, strength, suggestion)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [groupId, row.exercise_code, id, o.kind, o.part, o.strength, o.suggestion],
        );
        n++;
      }
    }
  });
  return n;
}

/** Everything the pattern needs for one group. */
export async function patternInputs(d: Db, groupId: string) {
  const [evaluations, observations, removed] = await Promise.all([
    d.query<EvaluationRow>(
      `SELECT f.id AS "feedbackId", f.exercise_code AS code, f.rating, f.tags,
              coalesce(f.spond_event_id, 'bank:' || f.author) AS session, f.author,
              coalesce(s.actual_players, s.registered_players) AS players, f.updated_at AS at
         FROM exercise_feedback f
         LEFT JOIN exercise_feedback s ON s.plan_id = f.plan_id AND s.author = f.author AND s.exercise_no IS NULL
        WHERE f.spond_group_id = $1 AND ${EXERCISE_ROWS}`,
      [groupId],
    ),
    d.query<Observation & { feedbackId: number }>(
      `SELECT feedback_id AS "feedbackId", kind, part, strength, suggestion FROM exercise_observations WHERE spond_group_id = $1`,
      [groupId],
    ),
    d.query<{ code: string; at: Date }>(
      `SELECT c.code, l.created_at AS at
         FROM edit_log l, jsonb_array_elements_text(l.changes->'fjernet') AS c(code)
        WHERE l.spond_group_id = $1 AND l.kind = 'opplegg_etter_ki'`,
      [groupId],
    ),
  ]);
  return { evaluations, observations, removed };
}

/** Replace a group's patterns with newly computed ones. */
export async function savePatterns(d: Db, groupId: string, patterns: ExercisePattern[]): Promise<void> {
  await d.tx(async (t) => {
    await t.query("DELETE FROM exercise_patterns WHERE spond_group_id = $1", [groupId]);
    for (const p of patterns) {
      await t.query(
        `INSERT INTO exercise_patterns (spond_group_id, exercise_code, score, ratings, trend, patterns) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [groupId, p.code, p.score, p.ratings, p.trend, JSON.stringify(p.patterns)],
      );
    }
  });
}

export interface StoredPattern extends ExercisePattern {
  computed_at: Date;
}

/** «Dette sier trenerne» for one exercise, or null before the first analysis. */
export async function exercisePattern(d: Db, access: Access, groupId: string, code: string): Promise<StoredPattern | null> {
  assertGroup(access, groupId);
  const [r] = await d.query<StoredPattern>(
    `SELECT exercise_code AS code, score::float8 AS score, ratings, trend, patterns, computed_at
       FROM exercise_patterns WHERE spond_group_id = $1 AND exercise_code = $2`,
    [groupId, code],
  );
  return r ?? null;
}

/** Groups with evaluations: the ones the nightly analysis goes through. */
export async function groupsWithFeedback(d: Db): Promise<string[]> {
  const rows = await d.query<{ g: string }>("SELECT DISTINCT spond_group_id AS g FROM exercise_feedback ORDER BY 1");
  return rows.map((r) => r.g);
}

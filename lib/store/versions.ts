import type { Db } from "@/lib/db";
import type { ExerciseValues } from "@/lib/plans/exercise-values";
import type { VersionSource, VersionStat } from "@/lib/plans/versions";
import { assertGroup, type Access } from "./access";
import { BANK } from "./bank";

/** Versions of exercises and the mean per version (see lib/plans/versions.ts), in the shared bank. */

/**
 * A change was saved: keep the version before it (the first time), count
 * the exercise up one version and keep the new one.
 */
export async function recordVersion(
  d: Db,
  groupId: string,
  code: string,
  change: { before: ExerciseValues; beforeVersion: number; after: ExerciseValues; source: VersionSource; actor: string; proposalId?: number | null },
): Promise<number> {
  await d.query(
    `INSERT INTO exercise_versions (spond_group_id, exercise_code, version, vals, source, created_by)
     VALUES ($1, $2, $3, $4::jsonb, 'tidligere', $5) ON CONFLICT DO NOTHING`,
    [groupId, code, change.beforeVersion, JSON.stringify(change.before), change.actor],
  );
  const [r] = await d.query<{ version: number }>("UPDATE exercises SET version = version + 1 WHERE spond_group_id = $1 AND code = $2 RETURNING version", [groupId, code]);
  await d.query(
    `INSERT INTO exercise_versions (spond_group_id, exercise_code, version, vals, source, proposal_id, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7) ON CONFLICT (spond_group_id, exercise_code, version) DO UPDATE SET vals = EXCLUDED.vals`,
    [groupId, code, r.version, JSON.stringify(change.after), change.source, change.proposalId ?? null, change.actor],
  );
  return r.version;
}

export interface VersionRow extends VersionStat {
  created_by: string;
  vals: ExerciseValues;
}

async function stats(d: Db, groupId: string, code: string): Promise<VersionRow[]> {
  return d.query<VersionRow>(
    `WITH f AS (SELECT exercise_version AS version, count(rating)::int AS n, avg(rating)::float8 AS mean
                  FROM exercise_feedback
                 WHERE exercise_code = $2 AND (exercise_no IS NOT NULL OR plan_id IS NULL)
                 GROUP BY 1)
     SELECT v.version, v.source, coalesce(f.n, 0) AS n, f.mean, v.created_at, v.created_by, v.vals
       FROM exercise_versions v LEFT JOIN f ON f.version = v.version
      WHERE v.spond_group_id = $1 AND v.exercise_code = $2
      ORDER BY v.version DESC`,
    [groupId, code],
  );
}

/** The versions of an exercise, newest first, with the mean of each; empty until it is first changed. */
export async function exerciseVersions(d: Db, access: Access, groupId: string, code: string): Promise<VersionRow[]> {
  assertGroup(access, groupId);
  return stats(d, BANK, code);
}

// For the analysis (no one logged in) ----------------------------------------------------------

/** Exercises whose current version came from Forbedringer: the ones to measure against the version before. */
export async function versionsToMeasure(d: Db): Promise<{ id: number; code: string; version: number; stats: VersionRow[] }[]> {
  const rows = await d.query<{ id: number; code: string; version: number }>(
    `SELECT e.id, e.code, e.version FROM exercises e
       JOIN exercise_versions v ON v.spond_group_id = e.spond_group_id AND v.exercise_code = e.code AND v.version = e.version
      WHERE e.spond_group_id = $1 AND v.source IN ('forbedring', 'automatisk')`,
    [BANK],
  );
  return Promise.all(rows.map(async (r) => ({ ...r, stats: await stats(d, BANK, r.code) })));
}

import type { Db } from "@/lib/db";
import type { Insight } from "@/lib/plans/insights";
import type { PlanRow, SessionRating } from "@/lib/plans/learning-stats";
import type { VersionStat } from "@/lib/plans/versions";
import { assertGroup, type Access } from "./access";
import { BANK } from "./bank";

/**
 * The rows behind «Innsikt» (lib/plans/learning-stats.ts), for every team
 * together: plan versions, session ratings and exercise versions. No
 * names, no text, no author.
 */

const MONTH = "to_char(%s AT TIME ZONE 'Europe/Oslo', 'YYYY-MM')";

/** Every version of the sessions approved since `since`. */
export async function planRows(d: Db, access: Access, groupId: string, since: Date): Promise<PlanRow[]> {
  assertGroup(access, groupId);
  const rows = await d.query<PlanRow>(
    `SELECT p.id, p.spond_group_id || '/' || p.spond_event_id AS session, p.version, p.status, p.source,
            coalesce(p.context->>'kind', '') AS kind,
            ARRAY(SELECT e->>'kode' FROM jsonb_array_elements(p.plan->'ovelser') WITH ORDINALITY AS o(e, n) ORDER BY n) AS codes,
            CASE WHEN p.status = 'approved' THEN ${MONTH.replace("%s", "p.approved_at")} END AS month
       FROM training_plans p
      WHERE p.status <> 'deleted'
        AND EXISTS (SELECT 1 FROM training_plans a
                     WHERE a.spond_group_id = p.spond_group_id AND a.spond_event_id = p.spond_event_id
                       AND a.status = 'approved' AND a.approved_at >= $1)`,
    [since],
  );
  return rows.map((r) => ({ ...r, codes: r.codes ?? [] }));
}

/** «Hele økta» ratings since `since`, and whether the session had a KI plan. */
export async function sessionRatings(d: Db, access: Access, groupId: string, since: Date): Promise<SessionRating[]> {
  assertGroup(access, groupId);
  const rows = await d.query<SessionRating>(
    `SELECT ${MONTH.replace("%s", "s.created_at")} AS month, s.rating,
            EXISTS (SELECT 1 FROM training_plans k
                     WHERE k.spond_group_id = p.spond_group_id AND k.spond_event_id = p.spond_event_id AND k.source = 'ai') AS ki
       FROM exercise_feedback s
       JOIN training_plans p ON p.id = s.plan_id
      WHERE s.exercise_no IS NULL AND s.rating IS NOT NULL AND s.created_at >= $1`,
    [since],
  );
  return rows.map((r) => ({ ...r, rating: Number(r.rating) }));
}

/** The versions of each exercise that has one from Forbedringer, with the mean per version. */
export async function improvedVersions(d: Db, access: Access, groupId: string): Promise<Map<string, VersionStat[]>> {
  assertGroup(access, groupId);
  const rows = await d.query<VersionStat & { code: string }>(
    `WITH codes AS (SELECT DISTINCT exercise_code FROM exercise_versions WHERE spond_group_id = $1 AND source IN ('forbedring', 'automatisk')),
          f AS (SELECT exercise_code, exercise_version AS version, count(rating)::int AS n, avg(rating)::float8 AS mean
                  FROM exercise_feedback
                 WHERE exercise_code IN (SELECT exercise_code FROM codes) AND (exercise_no IS NOT NULL OR plan_id IS NULL)
                 GROUP BY 1, 2)
     SELECT v.exercise_code AS code, v.version, v.source, coalesce(f.n, 0) AS n, f.mean, v.created_at
       FROM exercise_versions v
       LEFT JOIN f ON f.exercise_code = v.exercise_code AND f.version = v.version
      WHERE v.spond_group_id = $1 AND v.exercise_code IN (SELECT exercise_code FROM codes)
      ORDER BY v.exercise_code, v.version DESC`,
    [BANK],
  );
  const out = new Map<string, VersionStat[]>();
  for (const { code, ...v } of rows) out.set(code, [...(out.get(code) ?? []), v]);
  return out;
}

/** The session combinations for every team together (stored at night). */
export async function sharedCombinations(d: Db, access: Access, groupId: string): Promise<Insight[]> {
  assertGroup(access, groupId);
  const rows = await d.query<Insight>(
    `SELECT kind, band, key, codes, sessions, trainers, groups, mean::float8 AS mean, tags
       FROM learning_insights WHERE spond_group_id = $1 AND kind = 'kombinasjon'`,
    [BANK],
  );
  return rows.map((r) => ({ ...r, mean: Number(r.mean) }));
}

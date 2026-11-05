import type { Db } from "@/lib/db";
import { teamBand, type NffBand } from "@/lib/nff/bands";
import type { UsageRow } from "@/lib/ai/theme-usage";
import type { Insight, SessionRow } from "@/lib/plans/insights";
import { BANK } from "./bank";

type BandKey = NffBand["key"];

/**
 * Session patterns (lib/plans/insights.ts), computed at night for every team
 * together (stored on the shared bank) and for each group on its own.
 */

/** Every rated «Hele økta» row with the plan it rated. */
export async function sessionRows(d: Db): Promise<SessionRow[]> {
  const rows = await d.query<{
    planId: number;
    groupId: string;
    author: string;
    rating: number;
    tags: string[];
    band: string | null;
    codes: string[] | null;
    rotation: boolean | null;
    at: Date;
    birth_years: number[] | null;
  }>(
    `SELECT s.plan_id AS "planId", s.spond_group_id AS "groupId", s.author, s.rating, s.tags, s.updated_at AS at,
            p.context->>'band' AS band,
            ARRAY(SELECT e->>'kode' FROM jsonb_array_elements(p.plan->'ovelser') WITH ORDINALITY AS o(e, n) ORDER BY n) AS codes,
            -- Rotation: the groups take the stations in turn (as settingsFromPlan reads it).
            coalesce((p.plan#>>'{tidsplan,stasjoner,grupper}')::int, 1) > 1 AS rotation,
            -- Without a stored band: the teams the training was for, else the whole group's setting.
            coalesce((SELECT array_agg(DISTINCT t.birth_year) FROM team_settings t
                       WHERE t.spond_group_id = s.spond_group_id AND t.birth_year IS NOT NULL AND t.spond_subgroup_id = ANY(s.spond_subgroup_ids)),
                     (SELECT array_agg(t.birth_year) FROM team_settings t
                       WHERE t.spond_group_id = s.spond_group_id AND t.birth_year IS NOT NULL AND t.spond_subgroup_id = '')) AS birth_years
       FROM exercise_feedback s
       JOIN training_plans p ON p.id = s.plan_id AND p.status <> 'deleted'
      WHERE s.exercise_no IS NULL AND s.rating IS NOT NULL`,
  );
  return rows.map((r) => {
    const bands = new Set((r.birth_years ?? []).map((y) => teamBand(y, new Date(r.at).getFullYear())));
    const band = (r.band as BandKey | null) ?? (bands.size === 1 ? [...bands][0] : null);
    return {
      planId: r.planId,
      groupId: r.groupId,
      author: r.author,
      rating: Number(r.rating),
      tags: r.tags ?? [],
      band,
      codes: r.codes ?? [],
      rotation: !!r.rotation,
    };
  });
}

/** Replace all insights: `byGroup` maps '' (every team) or a group id to its insights. */
export async function saveInsights(d: Db, byGroup: Map<string, Insight[]>): Promise<number> {
  let n = 0;
  await d.tx(async (t) => {
    await t.query("DELETE FROM learning_insights");
    for (const [group, list] of byGroup) {
      for (const x of list) {
        await t.query(
          `INSERT INTO learning_insights (spond_group_id, kind, band, key, codes, sessions, trainers, groups, mean, tags)
           VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9, $10::text[])`,
          [group || BANK, x.kind, x.band, x.key, x.codes, x.sessions, x.trainers, x.groups, x.mean, x.tags],
        );
        n++;
      }
    }
  });
  return n;
}

/** The insights for one age band: those for every team, and the group's own. */
export async function bandInsights(d: Db, groupId: string, band: BandKey): Promise<{ shared: Insight[]; own: Insight[] }> {
  const rows = await d.query<Insight & { spond_group_id: string }>(
    `SELECT spond_group_id, kind, band, key, codes, sessions, trainers, groups, mean::float8 AS mean, tags
       FROM learning_insights WHERE band = $1 AND spond_group_id IN ($2, $3)`,
    [band, BANK, groupId],
  );
  const strip = (x: Insight): Insight => ({
    kind: x.kind,
    band: x.band,
    key: x.key,
    codes: x.codes,
    sessions: x.sessions,
    trainers: x.trainers,
    groups: x.groups,
    mean: Number(x.mean),
    tags: x.tags,
  });
  return { shared: rows.filter((r) => r.spond_group_id === BANK).map(strip), own: rows.filter((r) => r.spond_group_id === groupId).map(strip) };
}

/**
 * Approved plans with their theme word, age band, exercises and ratings, for
 * «Brukt med temaet» (lib/ai/theme-usage.ts). The last two years only.
 */
export async function themeUsageRows(d: Db, now = new Date()): Promise<UsageRow[]> {
  const rows = await d.query<{
    groupId: string;
    theme: string;
    band: string | null;
    codes: string[] | null;
    at: Date;
    birth_year: number | null;
    ratings: { code: string; rating: number }[] | null;
  }>(
    `SELECT p.spond_group_id AS "groupId", p.plan->>'tema' AS theme, p.context->>'band' AS band,
            coalesce(p.event_start, p.approved_at, p.created_at) AS at,
            ARRAY(SELECT e->>'kode' FROM jsonb_array_elements(p.plan->'ovelser') AS e WHERE e->>'kode' <> '') AS codes,
            (SELECT t.birth_year FROM team_settings t WHERE t.spond_group_id = p.spond_group_id AND t.spond_subgroup_id = '') AS birth_year,
            (SELECT json_agg(json_build_object('code', f.exercise_code, 'rating', f.rating)) FROM exercise_feedback f
              WHERE f.plan_id = p.id AND f.exercise_code IS NOT NULL AND f.rating IS NOT NULL) AS ratings
       FROM training_plans p
      WHERE p.status = 'approved' AND coalesce(p.plan->>'tema', '') <> '' AND coalesce(p.event_start, p.created_at) > $1`,
    [new Date(now.getTime() - 2 * 365 * 86_400_000)],
  );
  return rows.map((r) => {
    const ratings: Record<string, number[]> = {};
    for (const x of r.ratings ?? []) (ratings[x.code] ??= []).push(Number(x.rating));
    return {
      group: r.groupId,
      theme: r.theme,
      band: (r.band as BandKey | null) ?? teamBand(r.birth_year, new Date(r.at).getFullYear()),
      codes: r.codes ?? [],
      ratings,
    };
  });
}

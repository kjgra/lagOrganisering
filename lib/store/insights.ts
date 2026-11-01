import type { Db } from "@/lib/db";
import { teamBand, type NffBand } from "@/lib/nff/bands";
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

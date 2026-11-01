import type { Db } from "@/lib/db";
import { NFF_BANDS, teamBand, type NffBand } from "@/lib/nff/bands";
import type { NeedRow } from "@/lib/plans/needs";

type BandKey = NffBand["key"];

/**
 * What trainers ask KI for (see lib/plans/needs.ts). The nightly analysis
 * runs without anyone logged in, so these functions take no access: they
 * only read wishes and comments to classify, and counts, never names or text
 * for a page.
 */

export interface NeedSource {
  /** «opplegg:12» or «kommentar:5». */
  id: string;
  text: string;
  groupId: string;
  band: BandKey | null;
  author: string;
}

const isBand = (x: unknown): x is BandKey => NFF_BANDS.some((b) => b.key === x);

/** Wishes in KI plans and comments on plans that have not been classified yet, oldest first. */
export async function unclassifiedNeeds(d: Db, limit: number): Promise<NeedSource[]> {
  const rows = await d.query<{ source: string; id: number; text: string; group_id: string; band: string | null; birth_year: number | null; at: Date; author: string }>(
    `SELECT * FROM (
       SELECT 'opplegg' AS source, p.id, p.context->>'wish' AS text, p.spond_group_id AS group_id, p.context->>'band' AS band,
              NULL::int AS birth_year, p.created_at AS at, p.created_by AS author
         FROM training_plans p
        WHERE p.needs_at IS NULL AND p.context IS NOT NULL
       UNION ALL
       SELECT 'kommentar', c.id, c.body, c.spond_group_id, p.context->>'band',
              -- The main group's birth year, when the plan has no band.
              (SELECT t.birth_year FROM team_settings t WHERE t.spond_group_id = c.spond_group_id AND t.spond_subgroup_id = ''),
              c.created_at, c.author
         FROM training_plan_comments c JOIN training_plans p ON p.id = c.plan_id
        WHERE c.needs_at IS NULL) x
      ORDER BY at, source, id LIMIT $1::int`,
    [limit],
  );
  return rows.map((r) => ({
    id: `${r.source}:${r.id}`,
    text: (r.text ?? "").trim(),
    groupId: r.group_id,
    band: isBand(r.band) ? r.band : teamBand(r.birth_year, new Date(r.at).getFullYear()),
    author: r.author,
  }));
}

/** Store the needs KI found and mark each text as gone through; a text without needs is marked too. */
export async function saveNeeds(d: Db, sources: NeedSource[], found: Map<string, string[]>): Promise<number> {
  let n = 0;
  await d.tx(async (t) => {
    for (const s of sources) {
      const needs = found.get(s.id);
      if (!needs) continue;
      const [source, id] = s.id.split(":");
      const table = source === "opplegg" ? "training_plans" : "training_plan_comments";
      const marked = await t.query(`UPDATE ${table} SET needs_at = now() WHERE id = $1 AND needs_at IS NULL RETURNING id`, [Number(id)]);
      if (!marked.length) continue;
      for (const need of needs) {
        await t.query(
          `INSERT INTO ki_needs (spond_group_id, band, source, source_id, need, author) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
          [s.groupId, s.band, source, Number(id), need, s.author],
        );
        n++;
      }
    }
  });
  return n;
}

/** Texts that need no KI: empty wishes. Marked as gone through without a call. */
export async function markEmptyNeeds(d: Db, sources: NeedSource[]): Promise<void> {
  const ids = sources.filter((s) => !s.text && s.id.startsWith("opplegg:")).map((s) => Number(s.id.split(":")[1]));
  if (ids.length) await d.query("UPDATE training_plans SET needs_at = now() WHERE id = ANY($1::int[]) AND needs_at IS NULL", [ids]);
}

/** Every need found, with what the pattern needs. Counted across all groups; only counts leave this function's callers. */
export async function needRows(d: Db): Promise<NeedRow[]> {
  return d.query<NeedRow>(
    `SELECT need, band, source || ':' || source_id AS source, author, spond_group_id AS "groupId" FROM ki_needs`,
  );
}

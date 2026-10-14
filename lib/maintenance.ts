import "server-only";
import { db, type Db } from "@/lib/db";
import { MONTH_NAMES, osloMonthStart } from "@/lib/format";

/**
 * Clean-up rules:
 * - Intermediate versions of a plan are deleted after 30 days; the first,
 *   the last and the approved version of each training are kept.
 * - KI usage older than 12 months is summed per month, group, kind and
 *   model (without the trainer), and the rows are deleted.
 * - Plans for trainings older than 12 months are only deleted after the
 *   superadmin has downloaded the archive (see lib/store/archive.ts).
 *
 * Runs after a login at most once a day (the row in `maintenance` is claimed
 * with one UPDATE, so two servers never run it at once), or from the admin panel.
 */

export const MAINTENANCE_RULES = { versionDays: 30, archiveDays: 365, aiMonths: 12 };

export interface MaintenanceResult {
  versions: number;
  aiRows: number;
  aiBefore: Date;
}

export async function runMaintenance(d: Db, now: Date = new Date()): Promise<MaintenanceResult> {
  const aiBefore = osloMonthStart(now, MAINTENANCE_RULES.aiMonths);
  return d.tx(async (t) => {
    const versions = await t.query(
      `WITH ends AS (
         SELECT spond_group_id, spond_event_id, min(version) AS first, max(version) AS last
           FROM training_plans GROUP BY spond_group_id, spond_event_id)
       DELETE FROM training_plans p USING ends e
        WHERE p.spond_group_id = e.spond_group_id AND p.spond_event_id = e.spond_event_id
          AND p.status <> 'approved'
          AND (p.status = 'deleted' OR p.version NOT IN (e.first, e.last))
          AND p.created_at < $1::timestamptz - make_interval(days => $2::integer)
       RETURNING p.id`,
      [now.toISOString(), MAINTENANCE_RULES.versionDays],
    );
    await t.query(
      `INSERT INTO ai_usage_monthly (month, spond_group_id, kind, model, n, n_error, input_tokens, output_tokens,
                                     cache_read_tokens, cache_write_tokens, cost_usd)
       SELECT date_trunc('month', created_at AT TIME ZONE 'Europe/Oslo')::date, spond_group_id, kind, model,
              count(*), count(*) FILTER (WHERE status = 'error'), sum(input_tokens), sum(output_tokens),
              sum(cache_read_tokens), sum(cache_write_tokens), sum(cost_usd)
         FROM ai_usage WHERE created_at < $1::timestamptz
        GROUP BY 1, 2, 3, 4
       ON CONFLICT (month, spond_group_id, kind, model) DO UPDATE
         SET n = ai_usage_monthly.n + EXCLUDED.n, n_error = ai_usage_monthly.n_error + EXCLUDED.n_error,
             input_tokens = ai_usage_monthly.input_tokens + EXCLUDED.input_tokens,
             output_tokens = ai_usage_monthly.output_tokens + EXCLUDED.output_tokens,
             cache_read_tokens = ai_usage_monthly.cache_read_tokens + EXCLUDED.cache_read_tokens,
             cache_write_tokens = ai_usage_monthly.cache_write_tokens + EXCLUDED.cache_write_tokens,
             cost_usd = ai_usage_monthly.cost_usd + EXCLUDED.cost_usd`,
      [aiBefore.toISOString()],
    );
    const ai = await t.query("DELETE FROM ai_usage WHERE created_at < $1::timestamptz RETURNING id", [aiBefore.toISOString()]);
    return { versions: versions.length, aiRows: ai.length, aiBefore };
  });
}

export function maintenanceResultText(r: MaintenanceResult): string {
  const parts = [
    r.versions === 0 ? "Ingen mellomversjoner å slette" : `${r.versions} ${r.versions === 1 ? "mellomversjon" : "mellomversjoner"} slettet`,
  ];
  if (r.aiRows > 0) {
    const m = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Oslo", month: "numeric", year: "numeric" }).formatToParts(r.aiBefore);
    const month = Number(m.find((x) => x.type === "month")?.value ?? 1);
    const year = m.find((x) => x.type === "year")?.value;
    parts.push(`${r.aiRows} KI-kall fra før ${MONTH_NAMES[month - 1].toLowerCase()} ${year} summert per måned`);
  }
  return `${parts.join(", ")}.`;
}

/**
 * Runs the maintenance if it has not run the last 23 hours (or `force`).
 * Returns the result, or null when it was not due. A failure is written to
 * the row and not retried until the next day.
 */
export async function runMaintenanceNow(d: Db, by: string, force = false, now: Date = new Date()): Promise<MaintenanceResult | null> {
  const claimed = await d.query(
    `UPDATE maintenance SET last_run = $1::timestamptz, run_by = $2
      WHERE id = 1 AND ($3::boolean OR last_run IS NULL OR last_run < $1::timestamptz - interval '23 hours')
     RETURNING id`,
    [now.toISOString(), by.slice(0, 60), force],
  );
  if (!claimed.length) return null;
  try {
    const res = await runMaintenance(d, now);
    await d.query("UPDATE maintenance SET last_result = $1 WHERE id = 1", [maintenanceResultText(res)]);
    return res;
  } catch (err) {
    console.error("Vedlikehold feilet:", (err as Error).message);
    await d.query("UPDATE maintenance SET last_result = $1 WHERE id = 1", ["Vedlikeholdet feilet. Se loggen hos Vercel."]);
    throw err;
  }
}

/** For `after()`: never throws. */
export async function runMaintenanceIfDue(by: string): Promise<void> {
  try {
    await runMaintenanceNow(await db(), by);
  } catch (err) {
    console.error("Vedlikehold ved innlogging feilet:", (err as Error).message);
  }
}

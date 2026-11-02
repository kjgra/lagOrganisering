import type { Db } from "@/lib/db";
import { ERROR_ISSUES_PER_DAY, ERROR_KEEP_DAYS, type ErrorInfo, type ErrorSource } from "@/lib/error-report";
import { UserError, type Rights } from "@/lib/store/access";

/** The error log (see lib/error-report.ts and lib/errors.ts). Only the superadmin reads it. */

export interface ErrorEvent {
  id: number;
  fingerprint: string;
  area: string;
  source: ErrorSource;
  message: string;
  stack: string;
  route: string;
  app_version: string;
  count: number;
  first_seen: Date;
  last_seen: Date;
  issue_number: number | null;
  issue_url: string | null;
  issue_version: string | null;
  issue_created_at: Date | null;
}

const COLS = "id, fingerprint, area, source, message, stack, route, app_version, count, first_seen, last_seen, issue_number, issue_url, issue_version, issue_created_at";

/** Adds one occurrence: a new row, or one more on the row with the same fingerprint. */
export async function recordError(d: Db, fp: string, i: ErrorInfo, appVersion: string): Promise<ErrorEvent> {
  const [row] = await d.query<ErrorEvent>(
    `INSERT INTO error_events (fingerprint, area, source, message, stack, route, app_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (fingerprint) DO UPDATE
       SET count = error_events.count + 1, last_seen = now(), message = EXCLUDED.message,
           stack = CASE WHEN EXCLUDED.stack <> '' THEN EXCLUDED.stack ELSE error_events.stack END,
           route = CASE WHEN EXCLUDED.route <> '' THEN EXCLUDED.route ELSE error_events.route END,
           app_version = EXCLUDED.app_version
     RETURNING ${COLS}`,
    [fp, i.area, i.source, i.message, i.stack, i.route, appVersion.slice(0, 20)],
  );
  return row;
}

async function underDailyLimit(d: Db): Promise<boolean> {
  const [{ n }] = await d.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM error_events WHERE issue_created_at > now() - interval '24 hours' OR issue_claimed_at > now() - interval '10 minutes'",
  );
  return n < ERROR_ISSUES_PER_DAY;
}

/**
 * What to do about GitHub for this row, claimed so two servers never both act:
 * "ny" – no issue yet, create one; "sjekk" – the error is seen in a newer app
 * version than when its issue was made, so look whether the issue was closed
 * (the fix did not work); null – nothing.
 */
export async function claimIssue(d: Db, id: number, appVersion: string): Promise<"ny" | "sjekk" | null> {
  const [row] = await d.query<{ issue_number: number | null; issue_version: string | null }>("SELECT issue_number, issue_version FROM error_events WHERE id = $1", [id]);
  if (!row) return null;
  if (row.issue_number === null) {
    if (!(await underDailyLimit(d))) return null;
    const got = await d.query(
      `UPDATE error_events SET issue_claimed_at = now()
        WHERE id = $1 AND issue_number IS NULL AND (issue_claimed_at IS NULL OR issue_claimed_at < now() - interval '10 minutes')
       RETURNING id`,
      [id],
    );
    return got.length ? "ny" : null;
  }
  if (row.issue_version === appVersion) return null;
  const got = await d.query("UPDATE error_events SET issue_version = $2 WHERE id = $1 AND issue_version IS DISTINCT FROM $2 RETURNING id", [id, appVersion]);
  return got.length ? "sjekk" : null;
}

/** For a closed issue: a new one may be made if the daily limit allows. */
export async function mayReopen(d: Db): Promise<boolean> {
  return underDailyLimit(d);
}

export async function setIssue(d: Db, id: number, issue: { number: number; url: string }, appVersion: string): Promise<void> {
  await d.query(
    "UPDATE error_events SET issue_number = $2, issue_url = $3, issue_version = $4, issue_created_at = now(), issue_claimed_at = NULL WHERE id = $1",
    [id, issue.number, issue.url, appVersion],
  );
}

/** The latest errors, newest first. */
export async function listErrors(d: Db, rights: Rights, limit = 50): Promise<ErrorEvent[]> {
  if (!rights.superadmin) throw new UserError("Bare superadmin kan se feilloggen.");
  return d.query<ErrorEvent>(`SELECT ${COLS} FROM error_events ORDER BY last_seen DESC, id DESC LIMIT $1::int`, [limit]);
}

/** Maintenance: rows not seen for ERROR_KEEP_DAYS. */
export async function deleteOldErrors(d: Db, now: Date = new Date()): Promise<number> {
  const rows = await d.query("DELETE FROM error_events WHERE last_seen < $1::timestamptz - make_interval(days => $2::integer) RETURNING id", [now.toISOString(), ERROR_KEEP_DAYS]);
  return rows.length;
}

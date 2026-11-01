import type { Db } from "@/lib/db";
import { FEEDBACK_DAILY_LIMIT, type FeedbackKind } from "@/lib/feedback";
import { UserError, type Rights } from "@/lib/store/access";

/**
 * Feedback reports (see lib/feedback.ts). Anyone with the app can send; only
 * the superadmin reads the inbox and decides what becomes a public issue.
 */

export interface FeedbackReport {
  id: number;
  kind: FeedbackKind;
  body: string;
  page: string;
  app_version: string;
  client: string;
  role: "trener" | "admin";
  author: string;
  status: "ny" | "sendt";
  issue_number: number | null;
  issue_url: string | null;
  decided_by: string | null;
  decided_at: Date | null;
  created_at: Date;
}

export interface NewFeedback {
  kind: FeedbackKind;
  body: string;
  page: string;
  appVersion: string;
  client: string;
  role: "trener" | "admin";
}

function assertSuperadmin(rights: Rights): void {
  if (!rights.superadmin) throw new UserError("Bare superadmin kan behandle tilbakemeldinger.");
}

/** Saves a report, at most FEEDBACK_DAILY_LIMIT per person per 24 hours. */
export async function addFeedback(d: Db, profileId: string, f: NewFeedback): Promise<number> {
  return d.tx(async (t) => {
    const [{ n }] = await t.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM feedback_reports WHERE author = $1 AND created_at > now() - interval '24 hours'",
      [profileId],
    );
    if (n >= FEEDBACK_DAILY_LIMIT) throw new UserError(`Du har sendt ${FEEDBACK_DAILY_LIMIT} tilbakemeldinger det siste døgnet. Prøv igjen i morgen.`);
    const [row] = await t.query<{ id: number }>(
      `INSERT INTO feedback_reports (kind, body, page, app_version, client, role, author)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [f.kind, f.body, f.page, f.appVersion, f.client, f.role, profileId],
    );
    return row.id;
  });
}

/** Waiting reports (oldest first) and the last sent ones (newest first). */
export async function feedbackInbox(d: Db, rights: Rights, sentLimit = 20): Promise<{ waiting: FeedbackReport[]; sent: FeedbackReport[] }> {
  assertSuperadmin(rights);
  const [waiting, sent] = await Promise.all([
    d.query<FeedbackReport>("SELECT * FROM feedback_reports WHERE status = 'ny' ORDER BY created_at, id"),
    d.query<FeedbackReport>("SELECT * FROM feedback_reports WHERE status = 'sendt' ORDER BY decided_at DESC, id DESC LIMIT $1::int", [sentLimit]),
  ]);
  return { waiting, sent };
}

export async function waitingFeedbackCount(d: Db, rights: Rights): Promise<number> {
  if (!rights.superadmin) return 0;
  const [{ n }] = await d.query<{ n: number }>("SELECT count(*)::int AS n FROM feedback_reports WHERE status = 'ny'");
  return n;
}

export async function getWaitingFeedback(d: Db, rights: Rights, id: number): Promise<FeedbackReport> {
  assertSuperadmin(rights);
  const [row] = await d.query<FeedbackReport>("SELECT * FROM feedback_reports WHERE id = $1", [id]);
  if (!row) throw new UserError("Tilbakemeldingen finnes ikke lenger.");
  if (row.status !== "ny") throw new UserError("Tilbakemeldingen er allerede sendt.");
  return row;
}

/** Marks a report as sent, with the (possibly edited) text that was published. */
export async function markFeedbackSent(d: Db, rights: Rights, profileId: string, id: number, body: string, issue: { number: number; url: string }): Promise<void> {
  assertSuperadmin(rights);
  await d.query(
    `UPDATE feedback_reports SET status = 'sendt', body = $2, issue_number = $3, issue_url = $4, decided_by = $5, decided_at = now()
      WHERE id = $1 AND status = 'ny'`,
    [id, body, issue.number, issue.url, profileId],
  );
}

/** «Avvis»: the report is deleted, nothing is kept. */
export async function deleteFeedback(d: Db, rights: Rights, id: number): Promise<void> {
  assertSuperadmin(rights);
  const rows = await d.query("DELETE FROM feedback_reports WHERE id = $1 AND status = 'ny' RETURNING id", [id]);
  if (!rows.length) throw new UserError("Tilbakemeldingen er allerede behandlet.");
}

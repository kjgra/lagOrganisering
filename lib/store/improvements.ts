import type { Db } from "@/lib/db";
import type { ExerciseValues } from "@/lib/plans/exercise-values";
import { QUIET_DAYS, type ProposalKind, type ProposalStatus } from "@/lib/plans/improvements";
import { assertGroup, UserError, type Access } from "./access";

/** Proposals for better exercises («Forbedringer»), see lib/plans/improvements.ts. */

export interface Proposal {
  id: number;
  exercise_code: string;
  kind: ProposalKind;
  status: ProposalStatus;
  reason: string;
  base_values: ExerciseValues;
  proposed: ExerciseValues;
  rejection: string | null;
  decided_by: string | null;
  decided_at: Date | null;
  created_at: Date;
  /** The exercise as it is now; null when it is gone from the bank. */
  exercise_id: number | null;
  exercise_name: string;
}

const SELECT = `
  SELECT p.id, p.exercise_code, p.kind, p.status, p.reason, p.base_values, p.proposed, p.rejection, p.decided_by, p.decided_at, p.created_at,
         e.id AS exercise_id, coalesce(e.name, p.proposed->>'name', p.exercise_code) AS exercise_name
    FROM improvement_proposals p
    LEFT JOIN exercises e ON e.spond_group_id = p.spond_group_id AND e.code = p.exercise_code`;

/** Waiting proposals first (oldest first), then the latest handled ones. */
export async function listProposals(d: Db, access: Access, groupId: string, handled = 10): Promise<{ open: Proposal[]; handled: Proposal[] }> {
  assertGroup(access, groupId);
  const [open, done] = await Promise.all([
    d.query<Proposal>(`${SELECT} WHERE p.spond_group_id = $1 AND p.status = 'ny' ORDER BY p.created_at, p.id`, [groupId]),
    d.query<Proposal>(`${SELECT} WHERE p.spond_group_id = $1 AND p.status IN ('brukt', 'endret', 'avvist') ORDER BY p.decided_at DESC, p.id DESC LIMIT $2::int`, [groupId, handled]),
  ]);
  return { open, handled: done };
}

export async function getProposal(d: Db, access: Access, groupId: string, id: number): Promise<Proposal> {
  assertGroup(access, groupId);
  const [p] = await d.query<Proposal>(`${SELECT} WHERE p.spond_group_id = $1 AND p.id = $2`, [groupId, id]);
  if (!p) throw new UserError("Fant ikke forslaget.");
  return p;
}

/** The waiting proposal for an exercise, if any. */
export async function openProposalFor(d: Db, access: Access, groupId: string, code: string): Promise<number | null> {
  assertGroup(access, groupId);
  const [r] = await d.query<{ id: number }>("SELECT id FROM improvement_proposals WHERE spond_group_id = $1 AND exercise_code = $2 AND status = 'ny'", [groupId, code]);
  return r?.id ?? null;
}

export async function openProposalCount(d: Db, access: Access, groupId: string): Promise<number> {
  assertGroup(access, groupId);
  const [r] = await d.query<{ n: number }>("SELECT count(*)::int AS n FROM improvement_proposals WHERE spond_group_id = $1 AND status = 'ny'", [groupId]);
  return r.n;
}

/** Mark a waiting proposal as used, changed or turned down. False when it was handled already. */
export async function decideProposal(
  d: Db,
  access: Access,
  groupId: string,
  id: number,
  status: Exclude<ProposalStatus, "ny" | "utdatert">,
  rejection: string | null = null,
): Promise<boolean> {
  assertGroup(access, groupId);
  const r = await d.query(
    `UPDATE improvement_proposals SET status = $3, rejection = $4, decided_by = $5, decided_at = now()
      WHERE spond_group_id = $1 AND id = $2 AND status = 'ny' RETURNING id`,
    [groupId, id, status, rejection, access.profileId],
  );
  return r.length > 0;
}

// For the analysis (no one logged in) ----------------------------------------------------------

/** Exercises that should not get a new proposal now: one is waiting, or the same one was handled lately. */
export async function busyProposals(d: Db, groupId: string, now = new Date()): Promise<{ open: Set<string>; recent: Set<string> }> {
  const rows = await d.query<{ exercise_code: string; signature: string; status: string }>(
    `SELECT exercise_code, signature, status FROM improvement_proposals
      WHERE spond_group_id = $1 AND (status = 'ny' OR coalesce(decided_at, created_at) > $2::timestamptz - make_interval(days => $3::int))`,
    [groupId, now, QUIET_DAYS],
  );
  return {
    open: new Set(rows.filter((r) => r.status === "ny").map((r) => r.exercise_code)),
    recent: new Set(rows.map((r) => `${r.exercise_code}\n${r.signature}`)),
  };
}

/** Why trainers turned down earlier proposals for an exercise, newest first. */
export async function rejectionsFor(d: Db, groupId: string, code: string): Promise<string[]> {
  const rows = await d.query<{ rejection: string }>(
    `SELECT rejection FROM improvement_proposals WHERE spond_group_id = $1 AND exercise_code = $2 AND status = 'avvist' AND rejection IS NOT NULL
      ORDER BY decided_at DESC LIMIT 3`,
    [groupId, code],
  );
  return rows.map((r) => r.rejection);
}

export async function saveProposal(
  d: Db,
  groupId: string,
  p: { code: string; kind: ProposalKind; reason: string; signature: string; base: ExerciseValues; proposed: ExerciseValues; model: string | null; costUsd: number; status?: "ny" | "utdatert" },
): Promise<number | null> {
  const r = await d.query<{ id: number }>(
    `INSERT INTO improvement_proposals (spond_group_id, exercise_code, kind, status, reason, signature, base_values, proposed, model, cost_usd, decided_at)
     VALUES ($1, $2, $3, $4::text, $5, $6, $7::jsonb, $8::jsonb, $9, $10, CASE WHEN $4::text = 'ny' THEN NULL ELSE now() END)
     ON CONFLICT DO NOTHING RETURNING id`,
    [groupId, p.code, p.kind, p.status ?? "ny", p.reason, p.signature.slice(0, 300), JSON.stringify(p.base), JSON.stringify(p.proposed), p.model, Number(p.costUsd.toFixed(5))],
  );
  return r[0]?.id ?? null;
}

/** Groups with waiting proposals, for the weekly reminder. */
export async function waitingPerGroup(d: Db): Promise<{ groupId: string; n: number }[]> {
  return d.query<{ groupId: string; n: number }>(
    `SELECT spond_group_id AS "groupId", count(*)::int AS n FROM improvement_proposals WHERE status = 'ny' GROUP BY 1 ORDER BY 1`,
  );
}

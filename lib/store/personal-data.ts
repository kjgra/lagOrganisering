import { randomBytes } from "node:crypto";
import type { Db } from "@/lib/db";
import { assertGroup, assertSuperadmin, UserError, type Access, type Rights } from "./access";

/**
 * Right of access and erasure (GDPR art. 15 and 17): every place the app
 * stores a person's Spond id, so the superadmin can show, download and
 * delete it. A test checks that every column holding a person's id in the
 * schema is listed here, so a new table cannot be forgotten.
 *
 * Players are stored per main group (member id). Trainers are stored by
 * Spond profile id across groups, mostly as the author of something.
 */

/** Player data: always deleted on erasure. `pairs` and `proposal` need their own SQL. */
export const PLAYER_REFS = [
  { table: "member_levels", column: "spond_member_id" },
  { table: "member_tags", column: "spond_member_id" },
  { table: "member_pairs", column: "member_a" },
  { table: "member_pairs", column: "member_b" },
  { table: "departed_members", column: "spond_member_id" },
  { table: "group_proposal_members", column: "spond_member_id" },
] as const;

/**
 * Trainer data. `delete`: rows about the trainer (settings, access) are
 * deleted. `anonymise`: the trainer is replaced by a «slettet:…» id, so the
 * content (comments, plans, history) stays for the team without saying who.
 */
export const TRAINER_REFS = [
  { table: "user_preferences", column: "spond_profile_id", on: "delete" },
  { table: "push_subscriptions", column: "spond_profile_id", on: "delete" },
  { table: "evaluation_reminders", column: "spond_profile_id", on: "delete" },
  { table: "app_roles", column: "spond_profile_id", on: "delete" },
  { table: "edit_locks", column: "editor", on: "delete" },
  { table: "ai_usage", column: "spond_profile_id", on: "anonymise" },
  { table: "app_role_log", column: "spond_profile_id", on: "anonymise" },
  { table: "app_role_log", column: "actor", on: "anonymise" },
  { table: "app_roles", column: "updated_by", on: "anonymise" },
  { table: "ai_settings", column: "updated_by", on: "anonymise" },
  { table: "archive_log", column: "confirmed_by", on: "anonymise" },
  { table: "board_settings", column: "updated_by", on: "anonymise" },
  { table: "edit_log", column: "author", on: "anonymise" },
  { table: "exercise_feedback", column: "author", on: "anonymise" },
  { table: "exercise_versions", column: "created_by", on: "anonymise" },
  { table: "exercises", column: "created_by", on: "anonymise" },
  { table: "exercises", column: "updated_by", on: "anonymise" },
  { table: "feedback_reports", column: "author", on: "anonymise" },
  { table: "feedback_reports", column: "decided_by", on: "anonymise" },
  { table: "group_proposals", column: "created_by", on: "anonymise" },
  { table: "improvement_proposals", column: "decided_by", on: "anonymise" },
  { table: "ki_needs", column: "author", on: "anonymise" },
  { table: "maintenance", column: "run_by", on: "anonymise" },
  { table: "member_levels", column: "updated_by", on: "anonymise" },
  { table: "member_pairs", column: "created_by", on: "anonymise" },
  { table: "member_tags", column: "created_by", on: "anonymise" },
  { table: "proposal_comments", column: "author", on: "anonymise" },
  { table: "proposal_history", column: "actor", on: "anonymise" },
  { table: "season_themes", column: "updated_by", on: "anonymise" },
  { table: "team_learnings", column: "created_by", on: "anonymise" },
  { table: "team_principles", column: "created_by", on: "anonymise" },
  { table: "team_settings", column: "updated_by", on: "anonymise" },
  { table: "training_plan_comments", column: "author", on: "anonymise" },
  { table: "training_plans", column: "approved_by", on: "anonymise" },
  { table: "training_plans", column: "created_by", on: "anonymise" },
] as const;

/** Column names that hold a person's Spond id (for the completeness test). */
export const PERSON_COLUMNS = [
  "spond_member_id", "member_a", "member_b", "spond_profile_id", "author", "actor", "created_by",
  "updated_by", "approved_by", "decided_by", "confirmed_by", "run_by", "editor",
];

export type Rows = Record<string, Record<string, unknown>[]>;

export interface PersonData {
  /** Rows per «table.column», only where there are any. */
  rows: Rows;
  count: number;
}

const key = (r: { table: string; column: string }) => `${r.table}.${r.column}`;

/** Everything stored about a player in one main group. */
export async function playerData(d: Db, access: Access, rights: Rights, groupId: string, memberId: string): Promise<PersonData> {
  assertSuperadmin(rights);
  assertGroup(access, groupId);
  const rows: Rows = {};
  for (const r of PLAYER_REFS) {
    const sql =
      r.table === "group_proposal_members"
        ? `SELECT p.name AS proposal, p.created_at, m.label FROM group_proposal_members m JOIN group_proposals p ON p.id = m.proposal_id
            WHERE p.spond_group_id = $1 AND m.spond_member_id = $2 ORDER BY p.created_at`
        : `SELECT * FROM ${r.table} WHERE spond_group_id = $1 AND ${r.column} = $2`;
    const found = await d.query(sql, [groupId, memberId]);
    if (found.length) rows[key(r)] = found;
  }
  return { rows, count: Object.values(rows).reduce((n, x) => n + x.length, 0) };
}

/** Everything stored about a trainer (Spond profile id), in all groups. */
export async function trainerData(d: Db, rights: Rights, profileId: string): Promise<PersonData> {
  assertSuperadmin(rights);
  const rows: Rows = {};
  for (const r of TRAINER_REFS) {
    const found = await d.query(`SELECT * FROM ${r.table} WHERE ${r.column} = $1`, [profileId]);
    if (found.length) rows[key(r)] = found;
  }
  return { rows, count: Object.values(rows).reduce((n, x) => n + x.length, 0) };
}

/** Deletes everything about a player in one main group. Returns the number of rows. */
export async function erasePlayer(d: Db, access: Access, rights: Rights, groupId: string, memberId: string): Promise<number> {
  assertSuperadmin(rights);
  assertGroup(access, groupId);
  return d.tx(async (t) => {
    let n = 0;
    for (const table of ["member_levels", "member_tags", "departed_members"]) {
      n += (await t.query(`DELETE FROM ${table} WHERE spond_group_id = $1 AND spond_member_id = $2 RETURNING 1`, [groupId, memberId])).length;
    }
    n += (await t.query("DELETE FROM member_pairs WHERE spond_group_id = $1 AND (member_a = $2 OR member_b = $2) RETURNING 1", [groupId, memberId])).length;
    n += (
      await t.query(
        `DELETE FROM group_proposal_members m USING group_proposals p
          WHERE p.id = m.proposal_id AND p.spond_group_id = $1 AND m.spond_member_id = $2 RETURNING 1`,
        [groupId, memberId],
      )
    ).length;
    return n;
  });
}

/**
 * Deletes a trainer's settings and access, and replaces the trainer by a
 * «slettet:…» id everywhere else. Returns the number of rows touched.
 */
export async function eraseTrainer(d: Db, rights: Rights, profileId: string, actor: string): Promise<number> {
  assertSuperadmin(rights);
  if (profileId === actor) throw new UserError("Du kan ikke slette deg selv.");
  const gone = `slettet:${randomBytes(4).toString("hex")}`;
  return d.tx(async (t) => {
    let n = 0;
    for (const r of TRAINER_REFS) {
      const sql = r.on === "delete" ? `DELETE FROM ${r.table} WHERE ${r.column} = $1 RETURNING 1` : `UPDATE ${r.table} SET ${r.column} = $2 WHERE ${r.column} = $1 RETURNING 1`;
      n += (await t.query(sql, r.on === "delete" ? [profileId] : [profileId, gone])).length;
    }
    return n;
  });
}

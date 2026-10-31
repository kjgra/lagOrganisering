import type { Db } from "@/lib/db";
import type { EditKind, ExerciseChanges, PlanChanges } from "@/lib/plans/exercise-edits";
import { assertGroup, type Access } from "./access";

/** The log of what trainers change in exercises and in KI's suggestions (see lib/plans/exercise-edits.ts). */

export async function logEdit(
  d: Db,
  access: Access,
  groupId: string,
  e: { kind: EditKind; exerciseCode?: string | null; planId?: number | null; changes: ExerciseChanges | PlanChanges },
): Promise<void> {
  assertGroup(access, groupId);
  await d.query(
    `INSERT INTO edit_log (spond_group_id, kind, exercise_code, plan_id, changes, author) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [groupId, e.kind, e.exerciseCode ?? null, e.planId ?? null, JSON.stringify(e.changes), access.profileId],
  );
}

export async function hasEdits(d: Db, groupId: string, exerciseCode: string): Promise<boolean> {
  const r = await d.query("SELECT 1 FROM edit_log WHERE spond_group_id = $1 AND exercise_code = $2 LIMIT 1", [groupId, exerciseCode]);
  return r.length > 0;
}

export interface EditRow {
  id: number;
  kind: EditKind;
  changes: Record<string, unknown>;
  author: string;
  created_at: Date;
}

/** The latest changes of one exercise, newest first. */
export async function exerciseEdits(d: Db, access: Access, groupId: string, exerciseCode: string, n = 10): Promise<EditRow[]> {
  assertGroup(access, groupId);
  return d.query<EditRow>(
    `SELECT id, kind, changes, author, created_at FROM edit_log
      WHERE spond_group_id = $1 AND exercise_code = $2 ORDER BY created_at DESC, id DESC LIMIT $3`,
    [groupId, exerciseCode, n],
  );
}

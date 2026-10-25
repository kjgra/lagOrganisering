import type { Db } from "@/lib/db";
import { DEFAULT_SETTINGS, type BoardSettings, type HistoryMode, type Mode } from "@/lib/board";
import { clean } from "@/lib/sensitive";
import { assertGroup, assertTags, UserError, type Access, type Rights } from "./access";

/**
 * «Fordeling»: how the team board distributes the players, per subgroup ('' is
 * the main group, also used by subgroups without their own) and shared by its
 * trainers. It works on tags, levels and pairs, so it needs the tags right.
 */

const MODES: Mode[] = ["even", "levels"];
const HISTORY: HistoryMode[] = ["off", "same", "rotate"];

/** The settings for the scope, the main group's, or the defaults. Null without the tags right. */
export async function getBoardSettings(d: Db, access: Access, rights: Rights, groupId: string, sub: string): Promise<BoardSettings | null> {
  assertGroup(access, groupId);
  if (!rights.tags) return null;
  const rows = await d.query<BoardSettings & { spond_subgroup_id: string }>(
    "SELECT spond_subgroup_id, mode, roles, pairs, history FROM board_settings WHERE spond_group_id = $1 AND spond_subgroup_id IN ($2, '')",
    [groupId, sub],
  );
  const row = rows.find((r) => r.spond_subgroup_id === sub) ?? rows.find((r) => r.spond_subgroup_id === "");
  if (!row) return DEFAULT_SETTINGS;
  return { mode: row.mode, roles: [...row.roles], pairs: row.pairs, history: row.history };
}

export function validateBoardSettings(input: BoardSettings): BoardSettings {
  if (!MODES.includes(input.mode)) throw new UserError("Ukjent type fordeling.");
  if (!HISTORY.includes(input.history)) throw new UserError("Ukjent valg for forrige treninger.");
  const roles: string[] = [];
  for (const r of input.roles.map(clean)) {
    if (!r || r.length > 40) throw new UserError("Ugyldig rolle.");
    if (!roles.some((x) => x.toLowerCase() === r.toLowerCase())) roles.push(r);
  }
  if (roles.length > 20) throw new UserError("Velg maks 20 roller.");
  return { mode: input.mode, roles, pairs: !!input.pairs, history: input.history };
}

export async function saveBoardSettings(d: Db, access: Access, rights: Rights, groupId: string, sub: string, input: BoardSettings): Promise<BoardSettings> {
  assertGroup(access, groupId);
  assertTags(rights);
  const s = validateBoardSettings(input);
  await d.query(
    `INSERT INTO board_settings (spond_group_id, spond_subgroup_id, mode, roles, pairs, history, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (spond_group_id, spond_subgroup_id) DO UPDATE
       SET mode = EXCLUDED.mode, roles = EXCLUDED.roles, pairs = EXCLUDED.pairs, history = EXCLUDED.history,
           updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [groupId, sub, s.mode, s.roles, s.pairs, s.history, access.profileId],
  );
  return s;
}

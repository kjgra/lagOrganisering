import type { Db } from "@/lib/db";
import { isLevel, MIN_LEVEL, MAX_LEVEL } from "@/lib/levels";
import { clean, tagProblem } from "@/lib/sensitive";
import { isFocus, isStrength, MAX_FOCUS, MAX_STRENGTHS, type FocusKey, type PlayerStrengths, type StrengthKey } from "@/lib/strengths";
import { assertGroup, assertTags, UserError, type Access, type Rights } from "./access";

/**
 * Tags are the trainers' own labels on players («Keeper», «Ny»), a level
 * (lib/levels.ts) and pairs of players who play well together. They belong to the main
 * group, so they show in every subgroup. Only Spond ids are stored. Trainers
 * without the tags right see and use none of it.
 */

export type TagMap = Map<string, string[]>;

export interface PlayerTags {
  tags: TagMap;
  /** Member id -> level. */
  levels: Map<string, number>;
  /** Each pair once, smallest id first. */
  pairs: [string, string][];
}

export const NO_TAGS: PlayerTags = { tags: new Map(), levels: new Map(), pairs: [] };

/** Everything tagged on the players of a main group, or nothing without the tags right. */
export async function listPlayerTags(d: Db, access: Access, rights: Rights, groupId: string): Promise<PlayerTags> {
  assertGroup(access, groupId);
  if (!rights.tags) return NO_TAGS;
  const [tags, levels, pairs] = await Promise.all([
    listTags(d, access, groupId),
    d.query<{ spond_member_id: string; level: number }>("SELECT spond_member_id, level FROM member_levels WHERE spond_group_id = $1", [groupId]),
    d.query<{ member_a: string; member_b: string }>(
      "SELECT member_a, member_b FROM member_pairs WHERE spond_group_id = $1 ORDER BY member_a, member_b",
      [groupId],
    ),
  ]);
  return {
    tags,
    levels: new Map(levels.map((r) => [r.spond_member_id, Number(r.level)])),
    pairs: pairs.map((r) => [r.member_a, r.member_b]),
  };
}

/** The players a member is paired with. */
export const pairsOf = (pairs: [string, string][], memberId: string): string[] =>
  pairs.flatMap(([a, b]) => (a === memberId ? [b] : b === memberId ? [a] : []));

export async function setLevel(d: Db, access: Access, rights: Rights, groupId: string, memberId: string, level: number | null): Promise<void> {
  assertGroup(access, groupId);
  assertTags(rights);
  if (level === null) {
    await d.query("DELETE FROM member_levels WHERE spond_group_id = $1 AND spond_member_id = $2", [groupId, memberId]);
    return;
  }
  if (!isLevel(level)) throw new UserError(`Nivå må være fra ${MIN_LEVEL} til ${MAX_LEVEL}.`);
  await d.query(
    `INSERT INTO member_levels (spond_group_id, spond_member_id, level, updated_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (spond_group_id, spond_member_id) DO UPDATE SET level = EXCLUDED.level, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [groupId, memberId, level, access.profileId],
  );
}

const ordered = (x: string, y: string): [string, string] => (x < y ? [x, y] : [y, x]);

export async function addPair(d: Db, access: Access, rights: Rights, groupId: string, x: string, y: string): Promise<void> {
  assertGroup(access, groupId);
  assertTags(rights);
  if (x === y) throw new UserError("Velg en annen spiller.");
  const [a, b] = ordered(x, y);
  await d.query(
    `INSERT INTO member_pairs (spond_group_id, member_a, member_b, created_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [groupId, a, b, access.profileId],
  );
}

export async function removePair(d: Db, access: Access, rights: Rights, groupId: string, x: string, y: string): Promise<void> {
  assertGroup(access, groupId);
  assertTags(rights);
  const [a, b] = ordered(x, y);
  await d.query("DELETE FROM member_pairs WHERE spond_group_id = $1 AND member_a = $2 AND member_b = $3", [groupId, a, b]);
}

export async function listTags(d: Db, access: Access, groupId: string): Promise<TagMap> {
  assertGroup(access, groupId);
  const rows = await d.query<{ spond_member_id: string; tag: string }>(
    "SELECT spond_member_id, tag FROM member_tags WHERE spond_group_id = $1 ORDER BY spond_member_id, lower(tag)",
    [groupId],
  );
  const map: TagMap = new Map();
  for (const r of rows) map.set(r.spond_member_id, [...(map.get(r.spond_member_id) ?? []), r.tag]);
  return map;
}

/** Use the spelling already in use in the group ("keeper" -> "Keeper"). */
export function canonicalTag(tag: string, existing: string[]): string {
  return existing.find((e) => e.toLowerCase() === tag.toLowerCase()) ?? tag;
}

export async function addTag(d: Db, access: Access, rights: Rights, groupId: string, memberId: string, tag: string): Promise<string> {
  assertGroup(access, groupId);
  assertTags(rights);
  const problem = tagProblem(tag);
  if (problem) throw new UserError(problem);
  if (/^\s*\d+\s*$/.test(tag)) throw new UserError("Bruk nivå i stedet for et tall.");
  const existing = (await d.query<{ tag: string }>("SELECT DISTINCT tag FROM member_tags WHERE spond_group_id = $1", [groupId])).map(
    (r) => r.tag,
  );
  const t = canonicalTag(clean(tag), existing);
  await d.query(
    `INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [groupId, memberId, t, access.profileId],
  );
  return t;
}

export async function removeTag(d: Db, access: Access, rights: Rights, groupId: string, memberId: string, tag: string): Promise<void> {
  assertGroup(access, groupId);
  assertTags(rights);
  await d.query("DELETE FROM member_tags WHERE spond_group_id = $1 AND spond_member_id = $2 AND tag = $3", [groupId, memberId, tag]);
}

/** Suggestions for a member: the fixed list, then tags used in the group (most used first), minus those they have. */
export function tagSuggestions(tags: TagMap, memberId: string, fixed: string[]): string[] {
  const count = new Map<string, number>();
  for (const list of tags.values()) for (const t of list) count.set(t, (count.get(t) ?? 0) + 1);
  const used = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const have = new Set((tags.get(memberId) ?? []).map((t) => t.toLowerCase()));
  const seen = new Set<string>();
  return [...fixed, ...used].filter((t) => {
    const k = t.toLowerCase();
    if (have.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const isKeeper = (tags: string[] | undefined) => (tags ?? []).some((t) => t.toLowerCase() === "keeper");

/** Styrketagger per player in a main group (prepared; not shown in the app yet). */
export async function listStrengths(d: Db, access: Access, rights: Rights, groupId: string): Promise<Map<string, PlayerStrengths>> {
  assertGroup(access, groupId);
  const out = new Map<string, PlayerStrengths>();
  if (!rights.tags) return out;
  const rows = await d.query<{ spond_member_id: string; kind: "strength" | "focus"; tag: string }>(
    "SELECT spond_member_id, kind, tag FROM member_strengths WHERE spond_group_id = $1 ORDER BY created_at, tag",
    [groupId],
  );
  for (const r of rows) {
    const p = out.get(r.spond_member_id) ?? { strengths: [], focus: [] };
    // A key taken out of the list is ignored, not shown.
    if (r.kind === "strength" && isStrength(r.tag)) p.strengths.push(r.tag);
    if (r.kind === "focus" && isFocus(r.tag)) p.focus.push(r.tag);
    out.set(r.spond_member_id, p);
  }
  return out;
}

/** Replaces a player's strengths and focus. Only keys from the fixed lists, within the limits. */
export async function setStrengths(
  d: Db,
  access: Access,
  rights: Rights,
  groupId: string,
  memberId: string,
  strengths: string[],
  focus: string[],
): Promise<void> {
  assertGroup(access, groupId);
  assertTags(rights);
  const s = [...new Set(strengths)];
  const f = [...new Set(focus)];
  if (!s.every(isStrength) || !f.every(isFocus)) throw new UserError("Velg fra listen.");
  if (s.length > MAX_STRENGTHS) throw new UserError(`Velg høyst ${MAX_STRENGTHS} styrker.`);
  if (f.length > MAX_FOCUS) throw new UserError(`Velg høyst ${MAX_FOCUS} ting å jobbe med.`);
  const rows: [string, StrengthKey | FocusKey][] = [...s.map((k) => ["strength", k] as [string, StrengthKey]), ...f.map((k) => ["focus", k] as [string, FocusKey])];
  await d.tx(async (t) => {
    await t.query("DELETE FROM member_strengths WHERE spond_group_id = $1 AND spond_member_id = $2", [groupId, memberId]);
    for (const [kind, tag] of rows) {
      await t.query(
        "INSERT INTO member_strengths (spond_group_id, spond_member_id, kind, tag, created_by) VALUES ($1, $2, $3, $4, $5)",
        [groupId, memberId, kind, tag, access.profileId],
      );
    }
  });
}

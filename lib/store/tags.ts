import type { Db } from "@/lib/db";
import { clean, tagProblem } from "@/lib/sensitive";
import { assertGroup, assertTags, UserError, type Access, type Rights } from "./access";

/**
 * Tags are the trainers' own labels on players («Keeper», «Ny»), a level
 * (1–5) and pairs of players who play well together. They belong to the main
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
  if (!Number.isInteger(level) || level < 1 || level > 5) throw new UserError("Nivå må være fra 1 til 5.");
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
  if (/^\s*[1-5]\s*$/.test(tag)) throw new UserError("Bruk nivå for tallene 1 til 5.");
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

import type { Db } from "@/lib/db";
import { clean, tagProblem } from "@/lib/sensitive";
import { assertGroup, UserError, type Access } from "./access";

/**
 * Tags are the trainers' own labels on players («Keeper», «Ny»). They belong
 * to the main group, so a tag shows in every subgroup. Only Spond ids are stored.
 */

export type TagMap = Map<string, string[]>;

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

export async function addTag(d: Db, access: Access, groupId: string, memberId: string, tag: string): Promise<string> {
  assertGroup(access, groupId);
  const problem = tagProblem(tag);
  if (problem) throw new UserError(problem);
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

export async function removeTag(d: Db, access: Access, groupId: string, memberId: string, tag: string): Promise<void> {
  assertGroup(access, groupId);
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

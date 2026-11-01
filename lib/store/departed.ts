import type { Db } from "@/lib/db";

/**
 * Players who have left: levels, tags and pairs are deleted when a player
 * has been missing from the Spond group for DEPARTED_DAYS.
 *
 * Runs after a login with the groups the user has an access role in, so
 * every group with an active trainer is checked. A group whose member list
 * comes back empty is skipped (a Spond hiccup must never delete data). A
 * player who comes back before the time is up keeps everything.
 */
export const DEPARTED_DAYS = 90;

export interface GroupMembers {
  id: string;
  memberIds: string[];
}

export interface DepartedResult {
  /** Players newly seen as missing. */
  missing: number;
  /** Players whose data was deleted. */
  deleted: number;
}

const MEMBER_DATA = `
  SELECT spond_member_id AS id FROM member_levels WHERE spond_group_id = $1
  UNION SELECT spond_member_id FROM member_tags WHERE spond_group_id = $1
  UNION SELECT member_a FROM member_pairs WHERE spond_group_id = $1
  UNION SELECT member_b FROM member_pairs WHERE spond_group_id = $1`;

export async function syncDeparted(d: Db, groups: GroupMembers[], now: Date = new Date()): Promise<DepartedResult> {
  const res: DepartedResult = { missing: 0, deleted: 0 };
  for (const g of groups) {
    if (!g.memberIds.length) continue;
    await d.tx(async (t) => {
      // Back in the group: forget that they were missing.
      await t.query("DELETE FROM departed_members WHERE spond_group_id = $1 AND spond_member_id = ANY($2::text[])", [g.id, g.memberIds]);
      const added = await t.query(
        `INSERT INTO departed_members (spond_group_id, spond_member_id, missing_since)
         SELECT $1, id, $3::timestamptz FROM (${MEMBER_DATA}) m WHERE NOT (id = ANY($2::text[]))
         ON CONFLICT DO NOTHING RETURNING spond_member_id`,
        [g.id, g.memberIds, now.toISOString()],
      );
      res.missing += added.length;
      const gone = (
        await t.query<{ spond_member_id: string }>(
          `DELETE FROM departed_members
            WHERE spond_group_id = $1 AND missing_since < $2::timestamptz - make_interval(days => $3::integer)
           RETURNING spond_member_id`,
          [g.id, now.toISOString(), DEPARTED_DAYS],
        )
      ).map((r) => r.spond_member_id);
      if (!gone.length) return;
      await t.query("DELETE FROM member_levels WHERE spond_group_id = $1 AND spond_member_id = ANY($2::text[])", [g.id, gone]);
      await t.query("DELETE FROM member_tags WHERE spond_group_id = $1 AND spond_member_id = ANY($2::text[])", [g.id, gone]);
      await t.query("DELETE FROM member_pairs WHERE spond_group_id = $1 AND (member_a = ANY($2::text[]) OR member_b = ANY($2::text[]))", [g.id, gone]);
      res.deleted += gone.length;
    });
  }
  return res;
}

/** For `after()` at login: never throws. */
export async function syncDepartedAfterLogin(groups: { id: string; members: { id: string }[] }[]): Promise<void> {
  try {
    const { db } = await import("@/lib/db");
    await syncDeparted(await db(), groups.map((g) => ({ id: g.id, memberIds: g.members.map((m) => m.id) })));
  } catch (err) {
    console.error("Opprydding etter spillere som har sluttet feilet:", (err as Error).message);
  }
}

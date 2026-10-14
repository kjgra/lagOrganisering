import type { Db } from "@/lib/db";

/**
 * Favourites and recently used groups per user. A group reference is
 * "<main group id>:<subgroup id>", or "<main group id>:" for the whole main
 * group. Only Spond ids are stored.
 */

export interface GroupRef {
  groupId: string;
  subgroupId: string | null;
}

export const refKey = (r: GroupRef) => `${r.groupId}:${r.subgroupId ?? ""}`;

export function parseRef(key: string): GroupRef | null {
  const i = key.indexOf(":");
  if (i <= 0) return null;
  const sub = key.slice(i + 1);
  return { groupId: key.slice(0, i), subgroupId: sub || null };
}

export interface Preferences {
  favorites: string[];
  recent: string[];
  lastGroup: string | null;
}

export async function getPreferences(d: Db, profileId: string): Promise<Preferences> {
  const rows = await d.query<{ favorites: string[]; recent: string[]; last_group: string | null }>(
    "SELECT favorites, recent, last_group FROM user_preferences WHERE spond_profile_id = $1",
    [profileId],
  );
  const r = rows[0];
  return { favorites: r?.favorites ?? [], recent: r?.recent ?? [], lastGroup: r?.last_group ?? null };
}

/** Remember the group the user opened: first in «Sist brukt» and last group. */
export async function rememberGroup(d: Db, profileId: string, ref: GroupRef): Promise<void> {
  const key = refKey(ref);
  const cur = await getPreferences(d, profileId);
  const recent = [key, ...cur.recent.filter((x) => x !== key)].slice(0, 6);
  await d.query(
    `INSERT INTO user_preferences (spond_profile_id, recent, last_group) VALUES ($1, $2::text[], $3)
     ON CONFLICT (spond_profile_id) DO UPDATE SET recent = EXCLUDED.recent, last_group = EXCLUDED.last_group, updated_at = now()`,
    [profileId, recent, key],
  );
}

export async function setFavorite(d: Db, profileId: string, ref: GroupRef, on: boolean): Promise<string[]> {
  const key = refKey(ref);
  const cur = await getPreferences(d, profileId);
  const favorites = on ? [...new Set([...cur.favorites, key])].slice(0, 50) : cur.favorites.filter((x) => x !== key);
  await d.query(
    `INSERT INTO user_preferences (spond_profile_id, favorites) VALUES ($1, $2::text[])
     ON CONFLICT (spond_profile_id) DO UPDATE SET favorites = EXCLUDED.favorites, updated_at = now()`,
    [profileId, favorites],
  );
  return favorites;
}

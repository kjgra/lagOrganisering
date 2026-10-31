import type { Db } from "@/lib/db";
import { assertGroup, assertSuperadmin, UserError, type Access, type Rights } from "./access";

/**
 * The exercise bank a main group uses: the shared bank when superadmin has
 * chosen one, otherwise the group's own. Exercises, versions, observations,
 * patterns and proposals are stored on the bank's group; evaluations, plans
 * and team settings stay with the team. In SQL the same is `bank_of(group)`.
 */
export async function bankOf(d: Db, groupId: string): Promise<string> {
  const [r] = await d.query<{ bank: string }>("SELECT bank_of($1) AS bank", [groupId]);
  return r.bank;
}

export interface BankSettings {
  sharedGroupId: string | null;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export async function getBankSettings(d: Db): Promise<BankSettings> {
  const [r] = await d.query<{ shared_group_id: string | null; updated_by: string; updated_at: Date }>(
    "SELECT shared_group_id, updated_by, updated_at FROM bank_settings WHERE id",
  );
  return { sharedGroupId: r?.shared_group_id ?? null, updatedBy: r?.updated_by ?? null, updatedAt: r?.updated_at ?? null };
}

/** How many exercises each group has in its own bank: those in other groups are hidden while the shared bank is used. */
export async function exerciseCounts(d: Db): Promise<Map<string, number>> {
  const rows = await d.query<{ g: string; n: number }>("SELECT spond_group_id AS g, count(*)::int AS n FROM exercises GROUP BY 1");
  return new Map(rows.map((r) => [r.g, r.n]));
}

/** Superadmin: let every group use one group's bank, or (null) give each group its own again. */
export async function setSharedBank(d: Db, access: Access, rights: Rights, groupId: string | null): Promise<void> {
  assertSuperadmin(rights);
  if (groupId !== null) assertGroup(access, groupId);
  if (groupId !== null && groupId.length > 100) throw new UserError("Ukjent gruppe.");
  await d.query(
    `INSERT INTO bank_settings (id, shared_group_id, updated_by) VALUES (true, $1, $2)
     ON CONFLICT (id) DO UPDATE SET shared_group_id = EXCLUDED.shared_group_id, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [groupId, access.profileId],
  );
}

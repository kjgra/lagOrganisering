import type { Db } from "@/lib/db";
import { UserError, type RoleRow, type Rights } from "./access";

export interface RoleListRow extends RoleRow {
  spond_profile_id: string;
  updated_by: string;
  updated_at: Date;
}

export async function getRole(d: Db, profileId: string): Promise<RoleRow | null> {
  const rows = await d.query<RoleRow>(
    "SELECT can_use_ai, is_admin, can_use_app FROM app_roles WHERE spond_profile_id = $1",
    [profileId],
  );
  return rows[0] ?? null;
}

export async function listRoles(d: Db, profileIds: string[]): Promise<RoleListRow[]> {
  if (!profileIds.length) return [];
  return d.query<RoleListRow>(
    `SELECT spond_profile_id, can_use_ai, is_admin, can_use_app, updated_by, updated_at
       FROM app_roles WHERE spond_profile_id = ANY($1::text[])`,
    [profileIds],
  );
}

export type RoleName = "app" | "ai" | "admin";

/**
 * Give or take one right, and log it. Admins may change app access and KI;
 * only the superadmin may change admin. `allowedIds` are the trainers in the
 * main group the admin is looking at.
 */
export async function setRole(
  d: Db,
  rights: Rights,
  actor: string,
  profileId: string,
  role: RoleName,
  granted: boolean,
  allowedIds: string[],
): Promise<void> {
  if (!rights.admin) throw new UserError("Du har ikke tilgang til å endre rettigheter.");
  if (role === "admin" && !rights.superadmin) throw new UserError("Bare superadmin kan gi og ta admin.");
  if (!allowedIds.includes(profileId)) throw new UserError("Treneren er ikke med i dette laget.");
  const col = { ai: "can_use_ai", admin: "is_admin", app: "can_use_app" }[role];
  await d.tx(async (t) => {
    await t.query(
      `INSERT INTO app_roles (spond_profile_id, ${col}, updated_by) VALUES ($1, $2, $3)
       ON CONFLICT (spond_profile_id) DO UPDATE SET ${col} = EXCLUDED.${col},
              updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [profileId, granted, actor],
    );
    await t.query("INSERT INTO app_role_log (spond_profile_id, role, granted, actor) VALUES ($1, $2, $3, $4)", [
      profileId,
      role,
      granted,
      actor,
    ]);
  });
}

/**
 * Who may read and write what. Every store function takes an `Access` (built
 * from the user's Spond data on the server, never from the browser) and
 * checks the group before touching the database.
 */

export interface Access {
  profileId: string;
  /** Main groups where the user has an access role in Spond. */
  groupIds: ReadonlySet<string>;
}

/** Errors with a message meant for the user. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export function assertGroup(access: Access, groupId: string): void {
  if (!access.groupIds.has(groupId)) throw new UserError("Du har ikke tilgang til denne gruppen.");
}

export interface Rights {
  superadmin: boolean;
  admin: boolean;
  ai: boolean;
  app: boolean;
  /** See and change tags, levels and pairs. */
  tags: boolean;
}

export const NO_RIGHTS: Rights = { superadmin: false, admin: false, ai: false, app: false, tags: false };

export interface RoleRow {
  can_use_ai: boolean;
  is_admin: boolean;
  can_use_app: boolean;
  can_see_tags: boolean;
}

/**
 * The superadmin (SUPERADMIN_PROFILE_ID, never in the database, so nobody can
 * be locked out) has every right. Admins always have app access. Every
 * trainer sees tags unless an admin has turned it off.
 */
export function userRights(profileId: string, role: RoleRow | null, superadminId: string): Rights {
  const sa = !!superadminId.trim() && profileId === superadminId.trim();
  const admin = sa || !!role?.is_admin;
  return { superadmin: sa, admin, ai: sa || !!role?.can_use_ai, app: admin || !!role?.can_use_app, tags: sa || (role?.can_see_tags ?? true) };
}

export function assertAdmin(rights: Rights): void {
  if (!rights.admin) throw new UserError("Bare administratorer kan endre dette.");
}

export function assertTags(rights: Rights): void {
  if (!rights.tags) throw new UserError("Du har ikke tilgang til tagger.");
}

export function assertSuperadmin(rights: Rights): void {
  if (!rights.superadmin) throw new UserError("Bare superadmin kan endre dette.");
}

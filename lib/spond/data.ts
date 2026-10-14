import type { Group, Member, MemberKind, RawGroup, RawMember, RawProfile, SessionData } from "./types";

/**
 * Keep only the Spond data the app needs. Spond's group data has much more
 * (birth dates, addresses, phone numbers, guardians ...). Right after login
 * we keep only the groups where the user has an access role, and per group:
 * names and ids of members and subgroups, which members are trainers, and
 * which trainer is parent of which member (ids only, in memory). Nothing
 * here is written to the database.
 */

export const normaliseRole = (x: string) => x.trim().toLowerCase();

const idOf = (x: string | { id: string }) => (typeof x === "string" ? x : x.id);

/** "Emma Haugen" -> "Emma H.", "Anna Maria Olsen" -> "Anna M. O.". */
export function shortName(firstName: string, lastName = ""): string {
  const parts = `${firstName} ${lastName}`.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts.join("");
  return [parts[0], ...parts.slice(1).map((p) => `${p[0].toUpperCase()}.`)].join(" ");
}

/**
 * Short names, except where two would look the same ("Emma H." for both
 * Emma Haugen and Emma Hansen): those get their full name.
 */
export function displayNames(members: { firstName: string; lastName: string }[]): string[] {
  const short = members.map((m) => shortName(m.firstName, m.lastName));
  const count = new Map<string, number>();
  for (const s of short) count.set(s, (count.get(s) ?? 0) + 1);
  return members.map((m, i) => ((count.get(short[i]) ?? 0) > 1 ? `${m.firstName} ${m.lastName}`.trim() : short[i]));
}

/** The names of the roles a member has in a group. */
export function memberRoleNames(group: RawGroup, member: RawMember | undefined): string[] {
  if (!member?.roles?.length) return [];
  const byId = new Map((group.roles ?? []).map((r) => [String(r.id), String(r.name ?? "")]));
  return member.roles.map((id) => byId.get(String(id))).filter((x): x is string => !!x);
}

export function memberForProfile(group: RawGroup, profileId: string): RawMember | undefined {
  return (group.members ?? []).find((m) => m.profile?.id === profileId);
}

/** The user's roles in a group that give access (case does not matter). */
export function accessRoles(group: RawGroup, profileId: string, roleNames: string[]): string[] {
  const wanted = new Set(roleNames.map(normaliseRole));
  return memberRoleNames(group, memberForProfile(group, profileId)).filter((r) => wanted.has(normaliseRole(r)));
}

/**
 * Trainers, players and other adults:
 * - coach: has one of `coachRoles`;
 * - adult: no trainer role, but guardian of another member in the group;
 * - player: everyone else.
 */
export function memberKinds(group: RawGroup, coachRoles: string[]) {
  const members = group.members ?? [];
  const wanted = new Set(coachRoles.map(normaliseRole));
  const roles = members.map((m) => memberRoleNames(group, m).filter((r) => wanted.has(normaliseRole(r))));
  const profile = members.map((m) => m.profile?.id ?? null);
  const guardianProfiles = members.map(
    (m) => new Set((m.guardians ?? []).map((g) => g.profile?.id).filter((x): x is string => !!x)),
  );
  const childrenOf = members.map((_, i) =>
    profile[i] ? members.map((_, j) => j).filter((j) => j !== i && guardianProfiles[j].has(profile[i]!)) : [],
  );
  const kind: MemberKind[] = members.map((_, i) =>
    roles[i].length ? "coach" : childrenOf[i].length ? "adult" : "player",
  );
  const parentLinks = members.flatMap((m, i) =>
    kind[i] === "coach" ? childrenOf[i].map((j) => ({ parentId: m.id, childId: members[j].id })) : [],
  );
  return { kind, roles: roles.map((r) => r.join(", ")), parentLinks };
}

export function sessionData(
  groups: RawGroup[],
  profile: RawProfile,
  accessRoleNames: string[],
  coachRoleNames: string[],
): SessionData {
  const kept: Group[] = [];
  for (const g of groups) {
    const mine = accessRoles(g, profile.id, accessRoleNames);
    if (!mine.length) continue;
    const raw = g.members ?? [];
    const k = memberKinds(g, coachRoleNames);
    const base = raw.map((m) => ({ firstName: String(m.firstName ?? ""), lastName: String(m.lastName ?? "") }));
    const names = displayNames(base);
    const members: Member[] = raw.map((m, i) => ({
      id: String(m.id),
      firstName: base[i].firstName,
      lastName: base[i].lastName,
      profileId: m.profile?.id ? String(m.profile.id) : null,
      kind: k.kind[i],
      roles: k.roles[i],
      subgroupIds: (m.subGroups ?? []).map(idOf).map(String),
      displayName: names[i],
    }));
    kept.push({
      id: String(g.id),
      name: String(g.name ?? ""),
      myRoles: mine.join(", "),
      subgroups: (g.subGroups ?? []).map((s) => ({
        id: String(s.id),
        name: String(s.name ?? ""),
        size: members.filter((m) => m.subgroupIds.includes(String(s.id))).length,
      })),
      members,
      parentLinks: k.parentLinks,
    });
  }
  return {
    profile: { id: String(profile.id), firstName: String(profile.firstName ?? ""), lastName: String(profile.lastName ?? "") },
    groups: kept,
  };
}

/** Members of a group, or of one of its subgroups, sorted by display name. */
export function membersInContext(group: Group, subgroupId: string | null): Member[] {
  const list = subgroupId ? group.members.filter((m) => m.subgroupIds.includes(subgroupId)) : [...group.members];
  return list.sort((a, b) => a.displayName.localeCompare(b.displayName, "nb"));
}

/** Members who are players (and members we do not know: former members). */
export const isPlayerKind = (kind: MemberKind | null | undefined) => !kind || kind === "player";

/** "1 medlem" / "5 medlemmer" */
export const nMembers = (n: number) => `${n} ${n === 1 ? "medlem" : "medlemmer"}`;

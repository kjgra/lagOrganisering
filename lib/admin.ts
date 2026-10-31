import "server-only";
import { requireAdmin, type CurrentUser } from "@/lib/auth/current";
import { safeBack } from "@/lib/settings-nav";
import type { Group } from "@/lib/spond/types";

export interface AdminContext {
  user: CurrentUser;
  group: Group;
  back: string;
  /** Query string that keeps «back» and the group, plus extra parameters. */
  q: (extra?: Record<string, string | number | undefined>) => string;
}

/** An admin tab: the user must be admin; the group is ?lag=, or the first one. */
export async function adminContext(sp: Record<string, string | string[] | undefined>): Promise<AdminContext> {
  const user = await requireAdmin();
  const back = safeBack(sp.fra);
  const wanted = typeof sp.lag === "string" ? sp.lag : "";
  const group = user.data.groups.find((g) => g.id === wanted) ?? user.data.groups[0];
  const q = (extra: Record<string, string | number | undefined> = {}) => {
    const p = new URLSearchParams({ fra: back, lag: group.id });
    for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== "") p.set(k, String(v));
    return `?${p.toString()}`;
  };
  return { user, group, back, q };
}

/** Trainers with a Spond profile in the main group: the candidates for app access. */
export function trainers(group: Group) {
  const seen = new Set<string>();
  return group.members
    .filter((m) => m.kind === "coach" && m.profileId && !seen.has(m.profileId) && seen.add(m.profileId))
    .map((m) => ({ profileId: m.profileId!, name: `${m.firstName} ${m.lastName}`.trim(), roles: m.roles }))
    .sort((a, b) => a.name.localeCompare(b.name, "nb"));
}

export interface TrainerAcrossGroups {
  profileId: string;
  name: string;
  roles: string;
  /** The main groups the trainer is in, with the teams (subgroups) there. */
  groups: { id: string; name: string; teams: string[] }[];
}

/** Trainers with a Spond profile in any of the given main groups, each once. */
export function allTrainers(groups: Group[]): TrainerAcrossGroups[] {
  const out = new Map<string, TrainerAcrossGroups>();
  for (const g of groups) {
    const subs = new Map(g.subgroups.map((s) => [s.id, s.name]));
    for (const t of trainers(g)) {
      const m = g.members.find((x) => x.profileId === t.profileId && x.kind === "coach")!;
      const teams = m.subgroupIds.map((id) => subs.get(id)).filter((x): x is string => !!x);
      const row = out.get(t.profileId) ?? { ...t, groups: [] };
      if (row.roles !== t.roles && t.roles) row.roles = [...new Set([...row.roles.split(", "), ...t.roles.split(", ")].filter(Boolean))].join(", ");
      row.groups.push({ id: g.id, name: g.name, teams });
      out.set(t.profileId, row);
    }
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name, "nb"));
}

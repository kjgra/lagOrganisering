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

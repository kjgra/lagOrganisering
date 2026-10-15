import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { findGroup, requireUser, type CurrentUser } from "@/lib/auth/current";
import { membersInContext } from "@/lib/spond/data";
import type { Group, Member, Subgroup } from "@/lib/spond/types";
import { ALL, ctxPath } from "@/lib/routes";

/** The group context of a page under /g/<group>/<subgroup or alle>. */
export interface GroupContext {
  user: CurrentUser;
  group: Group;
  subgroup: Subgroup | null;
  /** Subgroup name, or the main group's name. */
  label: string;
  /** Members of the context (subgroup or whole group). */
  members: Member[];
  path: (rest?: string) => string;
  refKey: string;
}

export const getGroupContext = cache(async (groupId: string, sub: string): Promise<GroupContext> => {
  const user = await requireUser();
  const group = findGroup(user, decodeURIComponent(groupId));
  const subId = decodeURIComponent(sub);
  const subgroup = subId === ALL ? null : (group.subgroups.find((s) => s.id === subId) ?? null);
  if (subId !== ALL && !subgroup) redirect("/velg-gruppe");
  return {
    user,
    group,
    subgroup,
    label: subgroup?.name ?? group.name,
    members: membersInContext(group, subgroup?.id ?? null),
    path: (rest = "") => ctxPath(group.id, subgroup?.id ?? null, rest),
    refKey: `${group.id}:${subgroup?.id ?? ""}`,
  };
});

export async function contextFromParams(params: Promise<{ groupId: string; sub: string }>): Promise<GroupContext> {
  const p = await params;
  return getGroupContext(p.groupId, p.sub);
}

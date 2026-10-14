import type { Group } from "@/lib/spond/types";
import { parseRef, type GroupRef } from "@/lib/store/preferences";

/** Groups as the picker and switcher show them. */
export interface PickerSub {
  id: string;
  name: string;
  members: number;
}

export interface PickerMain {
  id: string;
  name: string;
  members: number;
  subs: PickerSub[];
}

export function pickerGroups(groups: Group[]): PickerMain[] {
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    members: g.members.length,
    subs: g.subgroups
      .map((s) => ({ id: s.id, name: s.name, members: s.size }))
      .sort((a, b) => a.name.localeCompare(b.name, "nb")),
  }));
}

/** A stored reference, if it still points to a group the user has. */
export function validRef(groups: Group[], key: string | null | undefined): GroupRef | null {
  const ref = key ? parseRef(key) : null;
  if (!ref) return null;
  const g = groups.find((x) => x.id === ref.groupId);
  if (!g) return null;
  if (ref.subgroupId && !g.subgroups.some((s) => s.id === ref.subgroupId)) return null;
  return ref;
}

/** «Gutter 2016», or the main group's name for the whole group. */
export function refLabel(groups: Group[], ref: GroupRef): { main: string; sub: string } {
  const g = groups.find((x) => x.id === ref.groupId);
  const s = ref.subgroupId ? g?.subgroups.find((x) => x.id === ref.subgroupId) : null;
  return { main: g?.name ?? "", sub: s?.name ?? "Alle i hovedgruppa" };
}

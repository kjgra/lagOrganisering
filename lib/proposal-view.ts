import { savedAt } from "@/lib/format";
import { isPlayerKind, shortName } from "@/lib/spond/data";
import { eventParticipants, placeable, statusLabel } from "@/lib/spond/events";
import type { Group, SpondEvent } from "@/lib/spond/types";
import { actionsFor, DECISION_LABEL, isEditable, STATUS_LABEL, type Action, type Lock, type Proposal, type ProposalStatus } from "@/lib/store/proposals";
import type { TagMap } from "@/lib/store/tags";

/** Vest colours, team-1 … team-6. A group's colour follows its position. */
export const VESTS = ["Oransje", "Blå", "Gul", "Grønn", "Rød", "Lilla"];
export const vestOf = (i: number) => ({ n: (i % 6) + 1, name: VESTS[i % 6] });

/** «Lag 1 · Oransje», unless the label already names the colour. */
export function teamTitle(label: string, i: number): string {
  const v = vestOf(i).name;
  return label.toLowerCase().includes(v.toLowerCase()) ? label : `${label} · ${v}`;
}

/** Short tag labels for narrow places: Keeper/Kaptein -> «Ke»/«Ka», Angrep -> «A». */
export function tagAbbrev(tags: string[], universe: string[]): string[] {
  const all = [...new Set([...universe, ...tags].map((t) => t.toLowerCase()))];
  return tags.map((t) => {
    const lt = t.toLowerCase();
    const others = all.filter((x) => x !== lt);
    for (let k = 1; k <= t.length; k++) {
      if (!others.some((o) => o.startsWith(lt.slice(0, k)))) return t[0].toUpperCase() + t.slice(1, k);
    }
    return t;
  });
}

export interface ChipView {
  id: string;
  name: string;
  coach: boolean;
  tags: string[];
  short: string[];
  /** «Kommer ikke», «Ikke svart» for a placed player no longer coming. */
  note: string | null;
}

export interface ProposalView {
  id: number;
  name: string;
  status: ProposalStatus;
  statusLabel: string;
  createdBy: string;
  updated: string;
  groups: { label: string; title: string; vest: number; members: ChipView[] }[];
  unplaced: ChipView[];
  unplacedLabel: string;
  actions: Action[];
  editable: boolean;
  lockedBy: string | null;
  comments: { who: string; when: string; text: string }[];
  history: { who: string; when: string; text: string }[];
  nPlayers: number;
}

/** "Kjetil G." for a profile id, or «en trener». */
export function profileName(group: Group, profileId: string): string {
  const m = group.members.find((x) => x.profileId === profileId);
  return m ? shortName(m.firstName, m.lastName) : "en trener";
}

export function proposalView(
  p: Proposal,
  group: Group,
  tags: TagMap,
  event: SpondEvent | null,
  locks: Lock[],
  me: string,
  now = new Date(),
): ProposalView {
  const byId = new Map(group.members.map((m) => [m.id, m]));
  const parts = event ? eventParticipants(event, group) : [];
  const statusOf = new Map(parts.map((x) => [x.memberId, x.status]));
  const universe = [...new Set([...tags.values()].flat())];
  const chip = (id: string): ChipView => {
    const m = byId.get(id);
    const t = tags.get(id) ?? [];
    const st = statusOf.get(id);
    return {
      id,
      name: m?.displayName ?? "Tidligere medlem",
      coach: m?.kind === "coach",
      tags: m?.kind === "coach" ? [] : t,
      short: m?.kind === "coach" ? [] : tagAbbrev(t, universe),
      note: event && st && st !== "accepted" && !(event.notSent && st !== "declined") ? statusLabel(st) : null,
    };
  };
  const sortChips = (list: ChipView[]) =>
    list.sort((a, b) => Number(b.coach) - Number(a.coach) || a.name.localeCompare(b.name, "nb"));
  const placed = new Set(Object.keys(p.assignments));
  const eligible = event
    ? parts.filter((x) => placeable(x.status, event.notSent) && isPlayerKind(x.kind)).map((x) => x.memberId)
    : [];
  const lock = locks.find((l) => l.proposalId === p.id && l.editor !== me);
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    statusLabel: STATUS_LABEL[p.status],
    createdBy: profileName(group, p.createdBy),
    updated: savedAt(p.updatedAt, now),
    groups: p.labels.map((label, i) => ({
      label,
      title: teamTitle(label, i),
      vest: vestOf(i).n,
      members: sortChips(Object.entries(p.assignments).filter(([, l]) => l === label).map(([id]) => chip(id))),
    })),
    unplaced: sortChips(eligible.filter((id) => !placed.has(id)).map(chip)),
    unplacedLabel: event?.notSent ? "Inviteres, men ikke fordelt" : "Kommer, men ikke fordelt",
    actions: actionsFor(p.status),
    editable: isEditable(p.status),
    lockedBy: lock ? profileName(group, lock.editor) : null,
    comments: p.comments.map((c) => ({ who: profileName(group, c.actor), when: savedAt(c.createdAt, now), text: c.text })),
    history: p.history.map((h) => ({ who: profileName(group, h.actor), when: savedAt(h.createdAt, now), text: DECISION_LABEL[h.text] ?? h.text })),
    nPlayers: placed.size,
  };
}

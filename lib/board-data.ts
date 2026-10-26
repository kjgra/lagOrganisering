import "server-only";
import type { BoardPlayer, BoardProps } from "@/components/board/TeamBoard";
import type { GroupContext } from "@/lib/context";
import { nextName, type BoardSettings } from "@/lib/board";
import { tagAbbrev } from "@/lib/proposal-view";
import { isPlayerKind, membersInContext } from "@/lib/spond/data";
import { eventParticipants, placeable, statusLabel } from "@/lib/spond/events";
import type { SpondEvent } from "@/lib/spond/types";
import { KEEPS_STATUS, STATUS_LABEL, type Lock, type Proposal } from "@/lib/store/proposals";
import type { PlayerTags } from "@/lib/store/tags";
import { profileName } from "@/lib/proposal-view";

/**
 * Who can be placed on the board. For an event: players coming (before the
 * invitation is sent: everyone invited), players who have not answered yet
 * (shown, but not placed automatically), plus anyone already placed. For a
 * gruppeutkast: the members of its (sub)group, trainers too, plus anyone placed.
 */
export function boardMembers(ctx: GroupContext, info: PlayerTags, event: SpondEvent | null, proposal: Proposal | null, subgroupId: string | null): BoardPlayer[] {
  const placed = new Set(Object.keys(proposal?.assignments ?? {}));
  const { tags, levels } = info;
  const universe = [...new Set([...tags.values()].flat())];
  const byId = new Map(ctx.group.members.map((m) => [m.id, m]));
  const make = (id: string, name: string, coach: boolean, note: string | null, maybe = false): BoardPlayer => {
    const t = coach ? [] : (tags.get(id) ?? []);
    return { id, name, coach, tags: t, short: tagAbbrev(t, universe), level: coach ? null : (levels.get(id) ?? null), note, out: !!note && !maybe, maybe };
  };
  const out: BoardPlayer[] = [];
  const seen = new Set<string>();
  if (event) {
    for (const p of eventParticipants(event, ctx.group)) {
      const ok = placeable(p.status, event.notSent) && isPlayerKind(p.kind);
      // Not answered yet (or waiting list): can be placed by hand, never automatically.
      const maybe = !ok && !event.notSent && !!p.status && p.status !== "declined" && p.kind === "player";
      if (!ok && !maybe && !placed.has(p.memberId)) continue;
      seen.add(p.memberId);
      out.push(make(p.memberId, p.displayName, p.kind === "coach", ok ? null : statusLabel(p.status), maybe));
    }
  } else {
    for (const m of membersInContext(ctx.group, subgroupId)) {
      if (m.kind === "adult") continue;
      seen.add(m.id);
      out.push(make(m.id, m.displayName, m.kind === "coach", null));
    }
  }
  for (const id of placed) {
    if (seen.has(id)) continue;
    const m = byId.get(id);
    out.push(make(id, m?.displayName ?? "Tidligere medlem", m?.kind === "coach", m ? null : "Ikke lenger medlem"));
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "nb"));
}

export function boardProps(
  ctx: GroupContext,
  opts: {
    tags: PlayerTags;
    event: SpondEvent | null;
    proposal: Proposal | null;
    existingNames: string[];
    locks: Lock[];
    doneHref: string;
    subgroupId: string | null;
    /** «Fordeling» for the page's (sub)group; null without the tags right. */
    settings: BoardSettings | null;
    /** Teams of the last trainings, newest first; null for a gruppeutkast. */
    previous: string[][][] | null;
  },
): BoardProps {
  const { proposal, event } = opts;
  const lock = opts.locks.find(
    (l) =>
      l.editor !== ctx.user.session.profileId &&
      (proposal ? l.proposalId === proposal.id : !l.proposalId && (event ? l.eventId === event.id : l.subgroupId === opts.subgroupId)),
  );
  return {
    groupId: ctx.group.id,
    eventId: event?.id ?? null,
    subgroupId: event ? null : opts.subgroupId,
    proposalId: proposal?.id ?? null,
    name: proposal?.name ?? nextName(opts.existingNames, event ? "Forslag" : "Utkast"),
    labels: proposal?.labels ?? ["Lag 1", "Lag 2"],
    assignments: proposal?.assignments ?? {},
    autoStart: !proposal && !!event,
    members: boardMembers(ctx, opts.tags, event, proposal, opts.subgroupId),
    poolLabel: event ? (event.notSent ? "Inviteres, ikke fordelt" : "Tilgjengelige, ikke fordelt") : "Ikke fordelt",
    links: event ? [] : ctx.group.parentLinks,
    pairs: opts.tags.pairs,
    settings: opts.settings,
    settingsScope: ctx.subgroup?.id ?? "",
    previous: opts.previous,
    keptStatus: proposal && KEEPS_STATUS.includes(proposal.status) ? STATUS_LABEL[proposal.status] : null,
    doneHref: opts.doneHref,
    lockedBy: lock ? profileName(ctx.group, lock.editor) : null,
  };
}

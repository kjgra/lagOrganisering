import "server-only";
import type { BoardPlayer, BoardProps } from "@/components/board/TeamBoard";
import type { GroupContext } from "@/lib/context";
import { nextName } from "@/lib/board";
import { tagAbbrev } from "@/lib/proposal-view";
import { isPlayerKind, membersInContext } from "@/lib/spond/data";
import { eventParticipants, placeable, statusLabel } from "@/lib/spond/events";
import type { SpondEvent } from "@/lib/spond/types";
import type { Lock, Proposal } from "@/lib/store/proposals";
import { isKeeper, type TagMap } from "@/lib/store/tags";
import { profileName } from "@/lib/proposal-view";

/**
 * Who can be placed on the board. For an event: players coming (before the
 * invitation is sent: everyone invited), plus anyone already placed. For a
 * gruppeutkast: the members of its (sub)group, trainers too, plus anyone placed.
 */
export function boardMembers(ctx: GroupContext, tags: TagMap, event: SpondEvent | null, proposal: Proposal | null, subgroupId: string | null): BoardPlayer[] {
  const placed = new Set(Object.keys(proposal?.assignments ?? {}));
  const universe = [...new Set([...tags.values()].flat())];
  const byId = new Map(ctx.group.members.map((m) => [m.id, m]));
  const make = (id: string, name: string, coach: boolean, note: string | null): BoardPlayer => {
    const t = coach ? [] : (tags.get(id) ?? []);
    return { id, name, coach, keeper: isKeeper(t), tags: t, short: tagAbbrev(t, universe), note };
  };
  const out: BoardPlayer[] = [];
  const seen = new Set<string>();
  if (event) {
    for (const p of eventParticipants(event, ctx.group)) {
      const ok = placeable(p.status, event.notSent) && isPlayerKind(p.kind);
      if (!ok && !placed.has(p.memberId)) continue;
      seen.add(p.memberId);
      out.push(make(p.memberId, p.displayName, p.kind === "coach", ok ? null : statusLabel(p.status)));
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
    tags: TagMap;
    event: SpondEvent | null;
    proposal: Proposal | null;
    existingNames: string[];
    locks: Lock[];
    doneHref: string;
    subgroupId: string | null;
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
    poolLabel: event ? (event.notSent ? "Inviteres, ikke fordelt" : "Kommer, ikke fordelt") : "Ikke fordelt",
    links: event ? [] : ctx.group.parentLinks,
    doneHref: opts.doneHref,
    lockedBy: lock ? profileName(ctx.group, lock.editor) : null,
  };
}

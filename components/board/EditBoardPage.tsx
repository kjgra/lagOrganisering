import { notFound, redirect } from "next/navigation";
import { BoardActions, BoardProvider, TeamBoard } from "@/components/board/TeamBoard";
import { AppShell } from "@/components/shell/AppShell";
import { boardProps } from "@/lib/board-data";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { findEvent } from "@/lib/events-data";
import { dayLabel } from "@/lib/format";
import { eventIsPast } from "@/lib/spond/events";
import { activeLocks, getProposal, listProposals } from "@/lib/store/proposals";
import { getBoardSettings } from "@/lib/store/board-settings";
import { listPlayerTags } from "@/lib/store/tags";

/** New team proposal for an event, or (with a proposal id) editing one. */
export async function EditBoardPage({ params, proposalId }: { params: Promise<{ groupId: string; sub: string; eventId: string }>; proposalId: number | null }) {
  const ctx = await contextFromParams(params);
  const { eventId } = await params;
  const event = await findEvent(ctx.user, ctx.group.id, decodeURIComponent(eventId));
  if (!event) notFound();
  const eventPath = ctx.path(`/arrangementer/${encodeURIComponent(event.id)}`);
  if (eventIsPast(event)) redirect(eventPath);
  const d = await db();
  const [tags, existing, locks, settings] = await Promise.all([
    listPlayerTags(d, ctx.user.access, ctx.user.rights, ctx.group.id),
    listProposals(d, ctx.user.access, ctx.group.id, { eventIds: [event.id], drafts: false }),
    activeLocks(d, ctx.user.access, ctx.group.id),
    getBoardSettings(d, ctx.user.access, ctx.user.rights, ctx.group.id, ctx.subgroup?.id ?? ""),
  ]);
  const proposal = proposalId ? await getProposal(d, ctx.user.access, proposalId).catch(() => null) : null;
  if (proposalId && (!proposal || proposal.eventId !== event.id)) notFound();
  if (proposal && !["draft", "rejected", "rolled_back"].includes(proposal.status)) redirect(eventPath);
  const props = boardProps(ctx, { tags, event, proposal, existingNames: existing.map((p) => p.name), locks, doneHref: eventPath, subgroupId: null, settings });
  return (
    <BoardProvider props={props}>
      <AppShell ctx={ctx} title={`Lag · ${event.start ? dayLabel(event.start) : event.heading}`} section="events" back={eventPath} wide actions={<BoardActions />}>
        <TeamBoard />
      </AppShell>
    </BoardProvider>
  );
}

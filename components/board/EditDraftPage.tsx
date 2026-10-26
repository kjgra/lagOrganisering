import { notFound, redirect } from "next/navigation";
import { BoardActions, BoardProvider, TeamBoard } from "@/components/board/TeamBoard";
import { AppShell } from "@/components/shell/AppShell";
import { boardProps } from "@/lib/board-data";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { activeLocks, getProposal, isEditable, listProposals } from "@/lib/store/proposals";
import { getBoardSettings } from "@/lib/store/board-settings";
import { listPlayerTags } from "@/lib/store/tags";

/**
 * A gruppeutkast: a sketch of new subgroups for the members of a (sub)group.
 * Trainers can be placed too, and a trainer follows their child.
 */
export async function EditDraftPage({ params, id }: { params: Promise<{ groupId: string; sub: string }>; id: number | null }) {
  const ctx = await contextFromParams(params);
  const d = await db();
  const back = ctx.path("/lagforslag?vis=utkast");
  const proposal = id ? await getProposal(d, ctx.user.access, id).catch(() => null) : null;
  if (id && (!proposal || proposal.eventId || proposal.groupId !== ctx.group.id)) notFound();
  if (proposal && !isEditable(proposal.status)) redirect(back);
  const subgroupId = proposal ? proposal.subgroupId : (ctx.subgroup?.id ?? null);
  const [tags, existing, locks, settings] = await Promise.all([
    listPlayerTags(d, ctx.user.access, ctx.user.rights, ctx.group.id),
    listProposals(d, ctx.user.access, ctx.group.id, { subgroupId }),
    activeLocks(d, ctx.user.access, ctx.group.id),
    getBoardSettings(d, ctx.user.access, ctx.user.rights, ctx.group.id, ctx.subgroup?.id ?? ""),
  ]);
  const props = boardProps(ctx, {
    tags,
    event: null,
    proposal,
    existingNames: existing.filter((p) => !p.eventId).map((p) => p.name),
    locks,
    doneHref: back,
    subgroupId,
    settings,
    previous: null,
  });
  return (
    <BoardProvider props={props}>
      <AppShell ctx={ctx} title={proposal ? "Rediger gruppeutkast" : "Nytt gruppeutkast"} section="proposals" back={back} wide actions={<BoardActions />}>
        <p className="nm-muted" style={{ marginTop: 0 }}>
          Gruppeutkast i {ctx.label}. Må opprettes i Spond for å gjelde. En trener som er forelder flyttes sammen med barnet sitt.
        </p>
        <TeamBoard />
      </AppShell>
    </BoardProvider>
  );
}

import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { ExerciseForm } from "@/components/training/ExerciseForm";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { CATEGORIES, EXERCISE_STATUSES } from "@/lib/plans/plan";
import { getProposal } from "@/lib/store/improvements";

/** «Endre først»: the proposal in the usual exercise form; saving uses it with the trainer's changes. */
export default async function ProposalEditPage(props: PageProps<"/g/[groupId]/[sub]/trening/forbedringer/[id]/endre">) {
  const ctx = await contextFromParams(props.params);
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const p = await getProposal(await db(), ctx.user.access, ctx.group.id, id).catch(() => null);
  if (!p || p.status !== "ny" || !p.exercise_id) notFound();
  const base = ctx.path("/trening/forbedringer");
  return (
    <AppShell ctx={ctx} title={p.exercise_name} section="training" back={`${base}/${p.id}`}>
      <div className="nm-note" role="status" style={{ maxWidth: 760, marginBottom: "var(--space-3)" }}>
        {p.kind === "variant"
          ? "Dette er varianten KI foreslår. Endre det du vil, og trykk «Lagre øvelsen»: den lagres som en ny øvelse basert på den som finnes."
          : "Dette er forslaget fra KI. Endre det du vil, og trykk «Lagre øvelsen» for å bruke det."}
      </div>
      <ExerciseForm
        groupId={ctx.group.id}
        id={p.exercise_id}
        initial={p.proposed}
        kiDraft={p.proposed}
        proposalId={p.id}
        categories={CATEGORIES}
        statuses={EXERCISE_STATUSES}
        listHref={base}
        canDelete={false}
      />
    </AppShell>
  );
}

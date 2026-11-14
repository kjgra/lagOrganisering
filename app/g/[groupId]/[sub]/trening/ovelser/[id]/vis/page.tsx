import { ClipboardCheck, Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseBody } from "@/components/plans/ExerciseBody";
import { AppShell } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/icon";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { nffSummary } from "@/lib/nff/fagplan";
import { feedbackSummary } from "@/lib/plans/feedback";
import { exerciseFacts, exerciseFromBank } from "@/lib/plans/plan";
import { getExercise } from "@/lib/store/training";
import { ExerciseLicense } from "@/components/training/ExerciseLicense";

/** Show an exercise from the bank, read only, with buttons to evaluate or change it. */
export default async function ExerciseViewPage(props: PageProps<"/g/[groupId]/[sub]/trening/ovelser/[id]/vis">) {
  const ctx = await contextFromParams(props.params);
  const { id } = await props.params;
  const exId = Number(id);
  if (!Number.isInteger(exId) || exId <= 0) notFound();
  const d = await db();
  const b = await getExercise(d, ctx.user.access, ctx.group.id, exId).catch(() => null);
  if (!b) notFound();
  const listHref = ctx.path("/trening/ovelser");
  const facts = exerciseFacts(b, true);
  return (
    <AppShell ctx={ctx} title="Øvelse" section="training" back={listHref}>
      <article style={{ maxWidth: 760 }}>
        <h2 className="nm-h2" style={{ marginTop: 0 }}>
          {b.name}
        </h2>
        <p className="nm-hint" style={{ marginTop: 0 }}>
          {facts}
        </p>
        {b.themes.length ? <p className="nm-hint">Tema: {b.themes.join(", ")}</p> : null}
        {nffSummary(b) ? <p className="nm-hint">NFF: {nffSummary(b)}</p> : null}
        <p className="nm-hint">
          Alle trenere: {feedbackSummary(b)}
          {b.fb_last ? ` · sist ${shortDate(b.fb_last)}` : ""}
        </p>
        <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap", margin: "var(--space-3) 0 var(--space-4)" }}>
          <Link href={`${listHref}/${b.id}/evaluering`} className="nm-btn nm-btn--secondary">
            <Icon icon={ClipboardCheck} />
            Evaluer øvelsen
          </Link>
          {ctx.user.rights.ai ? (
            <Link href={`${listHref}/${b.id}/ki`} className="nm-btn nm-btn--secondary">
              <Icon icon={Sparkles} />
              Juster med KI
            </Link>
          ) : null}
          <Link href={`${listHref}/${b.id}`} className="nm-btn nm-btn--ghost">
            <Icon icon={Pencil} />
            {ctx.user.rights.ai ? "Endre manuelt" : "Endre øvelsen"}
          </Link>
        </div>
        <ExerciseBody e={exerciseFromBank(b)} />
        <ExerciseLicense />
      </article>
    </AppShell>
  );
}

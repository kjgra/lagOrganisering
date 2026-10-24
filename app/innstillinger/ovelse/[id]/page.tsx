import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackForm, type FeedbackDraft } from "@/components/plans/FeedbackForm";
import { ExerciseForm, type ExerciseValues } from "@/components/settings/admin/ExerciseForm";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { adminContext } from "@/lib/admin";
import { db } from "@/lib/db";
import { prettyDrawing } from "@/lib/plans/drawing";
import { FEEDBACK_TAGS, feedbackSummary, RATINGS, USE_AGAIN } from "@/lib/plans/feedback";
import { CATEGORIES, EXERCISE_STATUSES } from "@/lib/plans/plan";
import { getExercise, myBankFeedback } from "@/lib/store/training";

/** A new exercise (/ny), or one from the bank: evaluate it, or change it. */
export default async function ExercisePage(props: PageProps<"/innstillinger/ovelse/[id]">) {
  const { id } = await props.params;
  const ctx = await adminContext(await props.searchParams);
  const exId = id === "ny" ? null : Number(id);
  if (exId !== null && (!Number.isInteger(exId) || exId <= 0)) notFound();
  const d = await db();
  const b = exId ? await getExercise(d, ctx.user.access, ctx.group.id, exId).catch(() => null) : null;
  if (exId && !b) notFound();
  const mine = b ? await myBankFeedback(d, ctx.user.access, ctx.group.id, b.code) : null;
  const draft: FeedbackDraft | null = b
    ? {
        exercise_no: null,
        title: "Din vurdering",
        planned: b.duration_minutes,
        rating: mine?.rating ?? null,
        tags: mine?.tags ?? [],
        actual_minutes: mine?.actual_minutes?.toString() ?? "",
        actual_players: "",
        body: mine?.body ?? "",
        use_again: mine?.use_again ?? "",
      }
    : null;
  const n = (x: number | null) => (x === null ? "" : String(x));
  const initial: ExerciseValues = b
    ? {
        name: b.name,
        category: b.category,
        themes: b.themes.join(", "),
        min_players: n(b.min_players),
        max_players: n(b.max_players),
        duration_minutes: n(b.duration_minutes),
        area: b.area,
        organisation: b.organisation,
        execution: b.execution,
        learning_points: b.learning_points,
        questions: b.questions,
        easier: b.easier,
        harder: b.harder,
        nff_url: b.nff_url,
        drawing: prettyDrawing(b.drawing),
        status: b.status,
      }
    : { name: "", category: "", themes: "", min_players: "", max_players: "", duration_minutes: "", area: "", organisation: "", execution: "", learning_points: "", questions: "", easier: "", harder: "", nff_url: "", drawing: "", status: "active" };
  const listHref = `/innstillinger/ovelser${ctx.q()}`;
  return (
    <SettingsShell user={ctx.user} back={ctx.back} tab="ovelser" groupId={ctx.group.id}>
      <p style={{ margin: "0 0 var(--space-2)" }}>
        <Link href={listHref} style={{ textDecoration: "underline" }}>
          Øvelser
        </Link>{" "}
        · {ctx.group.name}
      </p>
      <h2 className="nm-h2">{b ? b.name : "Ny øvelse"}</h2>
      {b ? (
        <p className="nm-hint" style={{ marginTop: 0 }}>
          Kode: {b.code}
          {b.source === "ai" ? " · laget med KI" : ""}
        </p>
      ) : null}
      {b && draft ? (
        <section id="evaluering" aria-labelledby="evaluering-h" style={{ marginBottom: "var(--space-6)" }}>
          <h3 id="evaluering-h" className="nm-section-label">
            Evaluering
          </h3>
          <p className="nm-hint" style={{ marginTop: 0 }}>
            Alle trenere: {feedbackSummary(b)}
          </p>
          <FeedbackForm target={{ groupId: ctx.group.id, exerciseId: b.id }} rows={[draft]} ratings={RATINGS} tags={FEEDBACK_TAGS} useAgain={USE_AGAIN} />
        </section>
      ) : null}
      {b ? <h3 className="nm-section-label">Endre øvelsen</h3> : null}
      <ExerciseForm groupId={ctx.group.id} id={b?.id ?? null} initial={initial} categories={CATEGORIES} statuses={EXERCISE_STATUSES} listHref={listHref} />
    </SettingsShell>
  );
}

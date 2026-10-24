import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackForm, type FeedbackDraft } from "@/components/plans/FeedbackForm";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { adminContext } from "@/lib/admin";
import { db } from "@/lib/db";
import { FEEDBACK_TAGS, feedbackSummary, RATINGS, USE_AGAIN } from "@/lib/plans/feedback";
import { CATEGORIES } from "@/lib/plans/plan";
import { getExercise, myBankFeedback } from "@/lib/store/training";

/** Evaluate an exercise from the bank, in the same data as after a training. */
export default async function ExerciseFeedbackPage(props: PageProps<"/innstillinger/ovelse/[id]/evaluering">) {
  const { id } = await props.params;
  const ctx = await adminContext(await props.searchParams);
  const exId = Number(id);
  if (!Number.isInteger(exId) || exId <= 0) notFound();
  const d = await db();
  const b = await getExercise(d, ctx.user.access, ctx.group.id, exId).catch(() => null);
  if (!b) notFound();
  const mine = await myBankFeedback(d, ctx.user.access, ctx.group.id, b.code);
  const draft: FeedbackDraft = {
    exercise_no: null,
    title: "Din vurdering",
    planned: b.duration_minutes,
    rating: mine?.rating ?? null,
    tags: mine?.tags ?? [],
    actual_minutes: mine?.actual_minutes?.toString() ?? "",
    actual_players: "",
    body: mine?.body ?? "",
    use_again: mine?.use_again ?? "",
  };
  return (
    <SettingsShell user={ctx.user} back={ctx.back} tab="ovelser" groupId={ctx.group.id}>
      <p style={{ margin: "0 0 var(--space-2)" }}>
        <Link href={`/innstillinger/ovelser${ctx.q()}`} style={{ textDecoration: "underline" }}>
          Øvelser
        </Link>{" "}
        · {ctx.group.name}
      </p>
      <h2 className="nm-h2">Evaluer: {b.name}</h2>
      <p className="nm-hint" style={{ marginTop: 0 }}>
        {CATEGORIES[b.category] ?? b.category}
        {b.duration_minutes ? ` · ${b.duration_minutes} min` : ""} · Alle trenere: {feedbackSummary(b)} ·{" "}
        <Link href={`/innstillinger/ovelse/${b.id}${ctx.q()}`} style={{ textDecoration: "underline" }}>
          Endre øvelsen
        </Link>
      </p>
      {b.organisation ? <p style={{ whiteSpace: "pre-wrap" }}>{b.organisation}</p> : null}
      <FeedbackForm target={{ groupId: ctx.group.id, exerciseId: b.id }} rows={[draft]} ratings={RATINGS} tags={FEEDBACK_TAGS} useAgain={USE_AGAIN} />
    </SettingsShell>
  );
}

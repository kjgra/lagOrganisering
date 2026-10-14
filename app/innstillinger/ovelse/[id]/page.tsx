import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseForm, type ExerciseValues } from "@/components/settings/admin/ExerciseForm";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { adminContext } from "@/lib/admin";
import { db } from "@/lib/db";
import { prettyDrawing } from "@/lib/plans/drawing";
import { CATEGORIES, EXERCISE_STATUSES } from "@/lib/plans/plan";
import { getExercise } from "@/lib/store/training";

/** A new exercise (/ny), or one from the bank. */
export default async function ExercisePage(props: PageProps<"/innstillinger/ovelse/[id]">) {
  const { id } = await props.params;
  const ctx = await adminContext(await props.searchParams);
  const exId = id === "ny" ? null : Number(id);
  if (exId !== null && (!Number.isInteger(exId) || exId <= 0)) notFound();
  const b = exId ? await getExercise(await db(), ctx.user.access, ctx.group.id, exId).catch(() => null) : null;
  if (exId && !b) notFound();
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
      <p style={{ margin: "0 0 8px" }}>
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
      <ExerciseForm groupId={ctx.group.id} id={b?.id ?? null} initial={initial} categories={CATEGORIES} statuses={EXERCISE_STATUSES} listHref={listHref} />
    </SettingsShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { ExerciseForm, type ExerciseValues } from "@/components/training/ExerciseForm";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { osloParts } from "@/lib/format";
import { teamBand } from "@/lib/nff/bands";
import { exerciseValues } from "@/lib/plans/exercise-values";
import { feedbackSummary } from "@/lib/plans/feedback";
import { CATEGORIES, EXERCISE_STATUSES } from "@/lib/plans/plan";
import { getExercise, getTeamSettings } from "@/lib/store/training";

/** A new exercise (/ny), or change one from the bank. Evaluating it is a page of its own (/evaluering). */
export default async function ExercisePage(props: PageProps<"/g/[groupId]/[sub]/trening/ovelser/[id]">) {
  const ctx = await contextFromParams(props.params);
  const { id } = await props.params;
  const exId = id === "ny" ? null : Number(id);
  if (exId !== null && (!Number.isInteger(exId) || exId <= 0)) notFound();
  const d = await db();
  const b = exId ? await getExercise(d, ctx.user.access, ctx.group.id, exId).catch(() => null) : null;
  if (exId && !b) notFound();
  const initial: ExerciseValues = b
    ? exerciseValues(b)
    : {
        ...{ name: "", category: "", themes: "", min_players: "", max_players: "", duration_minutes: "", area: "", organisation: "", execution: "", learning_points: "" },
        ...{ questions: "", easier: "", harder: "", nff_url: "", drawing: "", status: "active", nff_activity: "", nff_tags: [] },
        // A new exercise is for the team's own band to begin with.
        bands: [teamBand((await getTeamSettings(d, ctx.user.access, ctx.group.id, ctx.subgroup?.id ?? "")).birth_year, osloParts(new Date()).year)].filter((x) => x !== null),
      };
  const listHref = ctx.path("/trening/ovelser");
  return (
    <AppShell ctx={ctx} title={b ? b.name : "Ny øvelse"} section="training" back={listHref}>
      {b ? (
        <p className="nm-hint" style={{ marginTop: 0 }}>
          Kode: {b.code}
          {b.source === "ai" ? " · laget med KI" : ""}
        </p>
      ) : null}
      {b ? (
        <p style={{ marginTop: 0 }}>
          {feedbackSummary(b)} ·{" "}
          <Link href={`${listHref}/${b.id}/evaluering`} style={{ textDecoration: "underline" }}>
            Evaluer øvelsen
          </Link>
          {ctx.user.rights.ai ? (
            <>
              {" · "}
              <Link href={`${listHref}/${b.id}/ki`} style={{ textDecoration: "underline" }}>
                Juster med KI
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <ExerciseForm groupId={ctx.group.id} id={b?.id ?? null} initial={initial} categories={CATEGORIES} statuses={EXERCISE_STATUSES} listHref={listHref} canDelete={ctx.user.rights.admin} />
    </AppShell>
  );
}

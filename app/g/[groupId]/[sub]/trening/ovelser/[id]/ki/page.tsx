import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { ExerciseReviseForm } from "@/components/training/ExerciseReviseForm";
import { Icon } from "@/components/ui/icon";
import { AI_MODELS, budgetCheck } from "@/lib/ai/plan-ai";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { aiMode } from "@/lib/env";
import { decimal, osloMonthStart } from "@/lib/format";
import { CATEGORIES, EXERCISE_STATUSES, pitchFacts } from "@/lib/plans/plan";
import { aiSpend, getAiSettings } from "@/lib/store/ai";
import { getExercise, getTeamSettings, teamPitches } from "@/lib/store/training";

/** KI may take a minute; the Server Action runs within this page's limit. */
export const maxDuration = 300;

/** «Juster med KI»: the usual way to change an exercise in the bank. Manual edit is a link away. */
export default async function ExerciseRevisePage(props: PageProps<"/g/[groupId]/[sub]/trening/ovelser/[id]/ki">) {
  const ctx = await contextFromParams(props.params);
  const { id } = await props.params;
  const exId = Number(id);
  if (!Number.isInteger(exId) || exId <= 0) notFound();
  const d = await db();
  const b = await getExercise(d, ctx.user.access, ctx.group.id, exId).catch(() => null);
  if (!b) notFound();
  const listHref = ctx.path("/trening/ovelser");
  const manualHref = `${listHref}/${b.id}`;
  if (!ctx.user.rights.ai) {
    return (
      <AppShell ctx={ctx} title="Juster med KI" section="training" back={listHref}>
        <p>Du har ikke tilgang til KI. Spør en administrator, eller endre øvelsen manuelt.</p>
        <Link href={manualHref} className="nm-btn nm-btn--secondary">
          <Icon icon={Pencil} />
          Endre manuelt
        </Link>
      </AppShell>
    );
  }
  const sub = ctx.subgroup?.id ?? "";
  const [settings, team, pitches, spend] = await Promise.all([
    getAiSettings(d),
    getTeamSettings(d, ctx.user.access, ctx.group.id, sub),
    teamPitches(d, ctx.user.access, ctx.group.id, sub),
    aiSpend(d, ctx.user.access, ctx.group.id, osloMonthStart(new Date())),
  ]);
  const budget = budgetCheck(spend, settings);
  const budgetText = budget.ok ? `Laget har brukt ${decimal(budget.groupNok, 2)} av ${settings.group_limit_nok} kr til KI denne måneden.` : budget.message;
  return (
    <AppShell ctx={ctx} title={b.name} section="training" back={listHref}>
      <h2 className="nm-h2">Juster med KI</h2>
      <ExerciseReviseForm
        groupId={ctx.group.id}
        sub={sub}
        id={b.id}
        name={b.name}
        pitches={pitches.map((x) => ({ id: x.id, name: x.name, facts: pitchFacts(x) }))}
        pitchNote={team.pitch}
        standardHref={ctx.path("/trening/laget")}
        models={Object.entries(AI_MODELS).map(([mid, m]) => ({ id: mid, label: m.label, choice: m.choice }))}
        model={settings.model}
        domains={settings.link_domains}
        budgetText={budgetText}
        simulated={aiMode() === "mock"}
        manualHref={manualHref}
        listHref={listHref}
        categories={CATEGORIES}
        statuses={EXERCISE_STATUSES}
      />
    </AppShell>
  );
}

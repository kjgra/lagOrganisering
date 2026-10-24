import { AppShell } from "@/components/shell/AppShell";
import { ExerciseKiForm } from "@/components/training/ExerciseKiForm";
import { AI_MODELS, budgetCheck } from "@/lib/ai/plan-ai";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { aiMode } from "@/lib/env";
import { decimal, osloMonthStart, osloParts } from "@/lib/format";
import { CATEGORIES, pitchFacts } from "@/lib/plans/plan";
import { aiSpend, getAiSettings } from "@/lib/store/ai";
import { getTeamSettings, seasonTheme, teamPitches } from "@/lib/store/training";

/** KI may take a minute; the Server Action runs within this page's limit. */
export const maxDuration = 300;

/** «Ny øvelse med KI»: one exercise for the bank, ordered like a session plan. */
export default async function ExerciseKiPage(props: PageProps<"/g/[groupId]/[sub]/trening/ovelser/ki">) {
  const ctx = await contextFromParams(props.params);
  const listHref = ctx.path("/trening/ovelser");
  if (!ctx.user.rights.ai) {
    return (
      <AppShell ctx={ctx} title="Ny øvelse med KI" section="training" back={listHref}>
        <p>Du har ikke tilgang til KI. Spør en administrator, eller lag øvelsen manuelt.</p>
      </AppShell>
    );
  }
  const d = await db();
  const sub = ctx.subgroup?.id ?? "";
  const now = new Date();
  const { year, month } = osloParts(now);
  const [settings, team, pitches, season, spend] = await Promise.all([
    getAiSettings(d),
    getTeamSettings(d, ctx.user.access, ctx.group.id, sub),
    teamPitches(d, ctx.user.access, ctx.group.id, sub),
    seasonTheme(d, ctx.user.access, ctx.group.id, sub, year, month),
    aiSpend(d, ctx.user.access, ctx.group.id, osloMonthStart(now)),
  ]);
  const budget = budgetCheck(spend, settings);
  const budgetText = budget.ok ? `Laget har brukt ${decimal(budget.groupNok, 2)} av ${settings.group_limit_nok} kr til KI denne måneden.` : budget.message;
  return (
    <AppShell ctx={ctx} title="Ny øvelse med KI" section="training" back={listHref}>
      <ExerciseKiForm
        groupId={ctx.group.id}
        sub={sub}
        theme={season?.theme ?? ""}
        themeNote={season?.theme ? `Månedens tema i årshjulet${season.description ? `: ${season.description}` : ""}` : ""}
        categories={CATEGORIES}
        pitches={pitches.map((x) => ({ id: x.id, name: x.name, facts: pitchFacts(x) }))}
        pitchNote={team.pitch}
        standardHref={ctx.path("/trening/laget")}
        models={Object.entries(AI_MODELS).map(([id, m]) => ({ id, label: m.label, choice: m.choice }))}
        model={settings.model}
        domains={settings.link_domains}
        budgetText={budgetText}
        simulated={aiMode() === "mock"}
        donePath={listHref}
        doneQuery=""
      />
    </AppShell>
  );
}

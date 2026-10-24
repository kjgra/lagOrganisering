import Link from "next/link";
import { ExerciseKiForm } from "@/components/settings/admin/ExerciseKiForm";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { adminContext } from "@/lib/admin";
import { AI_MODELS, budgetCheck } from "@/lib/ai/plan-ai";
import { db } from "@/lib/db";
import { aiMode } from "@/lib/env";
import { decimal, osloMonthStart, osloParts } from "@/lib/format";
import { CATEGORIES, pitchFacts } from "@/lib/plans/plan";
import { aiSpend, getAiSettings } from "@/lib/store/ai";
import { getTeamSettings, seasonTheme, teamPitches } from "@/lib/store/training";

/** KI may take a minute; the Server Action runs within this page's limit. */
export const maxDuration = 300;

/** «Ny øvelse med KI»: one exercise for the bank, ordered like a session plan. */
export default async function ExerciseKiPage(props: PageProps<"/innstillinger/ovelse/ki">) {
  const ctx = await adminContext(await props.searchParams);
  const listHref = `/innstillinger/ovelser${ctx.q()}`;
  const head = (
    <>
      <p style={{ margin: "0 0 var(--space-2)" }}>
        <Link href={listHref} style={{ textDecoration: "underline" }}>
          Øvelser
        </Link>{" "}
        · {ctx.group.name}
      </p>
      <h2 className="nm-h2">Ny øvelse med KI</h2>
    </>
  );
  if (!ctx.user.rights.ai) {
    return (
      <SettingsShell user={ctx.user} back={ctx.back} tab="ovelser" groupId={ctx.group.id}>
        {head}
        <p>Du har ikke tilgang til KI. Gi deg selv tilgang under Trenere, eller lag øvelsen manuelt.</p>
      </SettingsShell>
    );
  }
  const d = await db();
  const now = new Date();
  const { year, month } = osloParts(now);
  const [settings, team, pitches, season, spend] = await Promise.all([
    getAiSettings(d),
    getTeamSettings(d, ctx.user.access, ctx.group.id),
    teamPitches(d, ctx.user.access, ctx.group.id),
    seasonTheme(d, ctx.user.access, ctx.group.id, year, month),
    aiSpend(d, ctx.user.access, ctx.group.id, osloMonthStart(now)),
  ]);
  const budget = budgetCheck(spend, settings);
  const budgetText = budget.ok ? `Laget har brukt ${decimal(budget.groupNok, 2)} av ${settings.group_limit_nok} kr til KI denne måneden.` : budget.message;
  return (
    <SettingsShell user={ctx.user} back={ctx.back} tab="ovelser" groupId={ctx.group.id}>
      {head}
      <ExerciseKiForm
        groupId={ctx.group.id}
        theme={season?.theme ?? ""}
        themeNote={season?.theme ? `Månedens tema i årshjulet${season.description ? `: ${season.description}` : ""}` : ""}
        categories={CATEGORIES}
        pitches={pitches.map((x) => ({ id: x.id, name: x.name, facts: pitchFacts(x) }))}
        pitchNote={team.pitch}
        standardHref={`/innstillinger/standard${ctx.q()}`}
        models={Object.entries(AI_MODELS).map(([id, m]) => ({ id, label: m.label, choice: m.choice }))}
        model={settings.model}
        domains={settings.link_domains}
        budgetText={budgetText}
        simulated={aiMode() === "mock"}
        donePath="/innstillinger/ovelse"
        doneQuery={ctx.q()}
      />
    </SettingsShell>
  );
}

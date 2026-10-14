import { notFound, redirect } from "next/navigation";
import { KiForm } from "@/components/plans/KiForm";
import { AppShell } from "@/components/shell/AppShell";
import { AI_MODELS, budgetCheck } from "@/lib/ai/plan-ai";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { aiMode } from "@/lib/env";
import { findEvent } from "@/lib/events-data";
import { dayLabel, decimal, osloMonthStart } from "@/lib/format";
import { themeForEvent } from "@/lib/plan-data";
import { eventIsPast } from "@/lib/spond/events";
import { aiSpend, getAiSettings } from "@/lib/store/ai";
import { getPlan, getTeamSettings, listPlanComments } from "@/lib/store/training";

/** KI may take a minute or two; the Server Action runs within this page's limit. */
export const maxDuration = 300;

export default async function KiPage(props: PageProps<"/g/[groupId]/[sub]/arrangementer/[eventId]/opplegg/ki">) {
  const ctx = await contextFromParams(props.params);
  const { eventId } = await props.params;
  const sp = await props.searchParams;
  const event = await findEvent(ctx.user, ctx.group.id, decodeURIComponent(eventId));
  if (!event) notFound();
  const eventPath = ctx.path(`/arrangementer/${encodeURIComponent(event.id)}`);
  if (eventIsPast(event) || !ctx.user.rights.ai) redirect(eventPath);
  const d = await db();
  const fromId = Number(typeof sp.fra === "string" ? sp.fra : "") || null;
  const [settings, team, season, comments, spend, base] = await Promise.all([
    getAiSettings(d),
    getTeamSettings(d, ctx.user.access, ctx.group.id),
    themeForEvent(d, ctx.user, ctx.group, event),
    listPlanComments(d, ctx.user.access, ctx.group.id, event.id),
    aiSpend(d, ctx.user.access, ctx.group.id, osloMonthStart(new Date())),
    fromId ? getPlan(d, ctx.user.access, fromId).catch(() => null) : Promise.resolve(null),
  ]);
  if (fromId && (!base || base.eventId !== event.id)) notFound();
  const budget = budgetCheck(spend, settings);
  const budgetText = budget.ok
    ? `Laget har brukt ${decimal(budget.groupNok, 2)} av ${settings.group_limit_nok} kr til KI denne måneden.`
    : budget.message;
  const theme = base?.plan.tema ?? season?.theme ?? "";

  return (
    <AppShell ctx={ctx} title={base ? `Juster v${base.version} med KI` : `KI-opplegg · ${event.start ? dayLabel(event.start) : event.heading}`} section="events" back={eventPath}>
      <KiForm
        groupId={ctx.group.id}
        eventId={event.id}
        baseId={base?.id ?? null}
        baseVersion={base?.version ?? null}
        theme={theme}
        themeNote={!base && season ? `Månedens tema i årshjulet${season.description ? `: ${season.description}` : ""}` : ""}
        minutes={team.session_minutes}
        models={Object.entries(AI_MODELS).map(([id, m]) => ({ id, label: m.label, choice: m.choice }))}
        model={settings.model}
        comments={comments.filter((c) => c.used_in_plan_id === null).map((c) => ({ id: c.id, text: `v${c.version}${c.exercise_no ? `, øvelse ${c.exercise_no}` : ""}: ${c.body}` }))}
        domains={settings.link_domains}
        budgetText={budgetText}
        simulated={aiMode() === "mock"}
        doneHref={eventPath}
      />
    </AppShell>
  );
}

import { notFound, redirect } from "next/navigation";
import { KiForm } from "@/components/plans/KiForm";
import { AppShell } from "@/components/shell/AppShell";
import { AI_MODELS, budgetCheck } from "@/lib/ai/plan-ai";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { aiMode } from "@/lib/env";
import { findEvent } from "@/lib/events-data";
import { dayLabel, decimal, osloMonthStart } from "@/lib/format";
import { eventSub, pitchEvent, themeForEvent } from "@/lib/plan-data";
import { pitchFacts } from "@/lib/plans/plan";
import { eventIsPast, responseCounts } from "@/lib/spond/events";
import { aiSpend, getAiSettings } from "@/lib/store/ai";
import { pitchesForEvent } from "@/lib/store/pitch-schedule";
import { getPlan, getTeamSettings, listPitches, listPlanComments, teamPitches } from "@/lib/store/training";

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
  const [settings, team, teamOwn, season, comments, spend, base, forEvent, all] = await Promise.all([
    getAiSettings(d),
    getTeamSettings(d, ctx.user.access, ctx.group.id, eventSub(event)),
    teamPitches(d, ctx.user.access, ctx.group.id, eventSub(event)),
    themeForEvent(d, ctx.user, ctx.group, event),
    listPlanComments(d, ctx.user.access, ctx.group.id, event.id),
    aiSpend(d, ctx.user.access, ctx.group.id, osloMonthStart(new Date())),
    fromId ? getPlan(d, ctx.user.access, fromId).catch(() => null) : Promise.resolve(null),
    pitchesForEvent(d, ctx.user.access, ctx.group.id, pitchEvent(event)),
    listPitches(d),
  ]);
  // The training's pitches first, then the team's other fixed ones.
  const pitches = all.filter((p) => forEvent.ids.includes(p.id) || teamOwn.some((x) => x.id === p.id));
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
        coaches={responseCounts(event, ctx.group).coachesComing}
        pitches={pitches.map((x) => ({ id: x.id, name: x.name, facts: pitchFacts(x) }))}
        pitchIds={forEvent.ids}
        pitchNote=""
        standardHref={ctx.path("/trening/laget")}
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

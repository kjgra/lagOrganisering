import { notFound, redirect } from "next/navigation";
import { FeedbackForm, type FeedbackDraft } from "@/components/plans/FeedbackForm";
import { AppShell } from "@/components/shell/AppShell";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { findEvent } from "@/lib/events-data";
import { dayLabel } from "@/lib/format";
import { FEEDBACK_TAGS, RATINGS, USE_AGAIN } from "@/lib/plans/feedback";
import { eventIsPast, responseCounts } from "@/lib/spond/events";
import { getPlan, listFeedback } from "@/lib/store/training";

/** The evaluation of a plan version after the training. */
export default async function FeedbackPage(props: PageProps<"/g/[groupId]/[sub]/arrangementer/[eventId]/opplegg/[planId]/evaluering">) {
  const ctx = await contextFromParams(props.params);
  const { eventId, planId } = await props.params;
  const event = await findEvent(ctx.user, ctx.group.id, decodeURIComponent(eventId));
  if (!event) notFound();
  const eventPath = ctx.path(`/arrangementer/${encodeURIComponent(event.id)}`);
  if (!eventIsPast(event)) redirect(eventPath);
  const d = await db();
  const pl = await getPlan(d, ctx.user.access, Number(planId)).catch(() => null);
  if (!pl || pl.eventId !== event.id) notFound();
  const mine = (await listFeedback(d, ctx.user.access, ctx.group.id, event.id)).filter((f) => f.plan_id === pl.id && f.author === ctx.user.session.profileId);
  const stationMinutes = pl.plan.tidsplan.stasjoner.minutter;
  const draft = (no: number | null, title: string): FeedbackDraft => {
    const f = mine.find((m) => m.exercise_no === no);
    return {
      exercise_no: no,
      title,
      planned: no === null ? null : stationMinutes,
      rating: f?.rating ?? null,
      tags: f?.tags ?? [],
      actual_minutes: f?.actual_minutes?.toString() ?? "",
      actual_players: f?.actual_players?.toString() ?? "",
      body: f?.body ?? "",
      use_again: f?.use_again ?? "",
    };
  };
  const rows = [...pl.plan.ovelser.map((e, i) => draft(i + 1, `${i + 1}. ${e.navn}`)), draft(null, "Hele økta")];
  return (
    <AppShell ctx={ctx} title={`Evaluering · ${event.start ? dayLabel(event.start) : event.heading}`} section="events" back={eventPath}>
      <FeedbackForm
        planId={pl.id}
        registered={event.notSent ? null : responseCounts(event, ctx.group).accepted}
        rows={rows}
        ratings={Object.fromEntries(Object.entries(RATINGS).map(([k, v]) => [k, v]))}
        tags={FEEDBACK_TAGS}
        useAgain={USE_AGAIN}
        doneHref={eventPath}
      />
    </AppShell>
  );
}

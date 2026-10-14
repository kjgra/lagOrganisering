import { notFound, redirect } from "next/navigation";
import { PlanEditor, type EditorExercise } from "@/components/plans/PlanEditor";
import { AppShell } from "@/components/shell/AppShell";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { findEvent } from "@/lib/events-data";
import { dayLabel } from "@/lib/format";
import { themeForEvent } from "@/lib/plan-data";
import { CATEGORIES, defaultSettings, settingsFromPlan } from "@/lib/plans/plan";
import { meanText } from "@/lib/plans/feedback";
import { eventIsPast } from "@/lib/spond/events";
import { getPlan, getTeamSettings, listExercises } from "@/lib/store/training";

/** Make a plan by hand, or change a version (saved as a new version). */
export default async function EditPlanPage(props: PageProps<"/g/[groupId]/[sub]/arrangementer/[eventId]/opplegg/endre">) {
  const ctx = await contextFromParams(props.params);
  const { eventId } = await props.params;
  const sp = await props.searchParams;
  const event = await findEvent(ctx.user, ctx.group.id, decodeURIComponent(eventId));
  if (!event) notFound();
  const eventPath = ctx.path(`/arrangementer/${encodeURIComponent(event.id)}`);
  if (eventIsPast(event)) redirect(eventPath);
  const d = await db();
  const fromId = Number(typeof sp.fra === "string" ? sp.fra : "") || null;
  const [bank, team, season, base] = await Promise.all([
    listExercises(d, ctx.user.access, ctx.group.id),
    getTeamSettings(d, ctx.user.access, ctx.group.id),
    themeForEvent(d, ctx.user, ctx.group, event),
    fromId ? getPlan(d, ctx.user.access, fromId).catch(() => null) : Promise.resolve(null),
  ]);
  if (fromId && (!base || base.eventId !== event.id)) notFound();

  const bankItems: EditorExercise[] = bank
    .filter((b) => b.status !== "archived")
    .map((b) => ({
      key: `b:${b.code}`,
      ref: { bank: b.code },
      name: b.name,
      category: CATEGORIES[b.category] ?? b.category,
      note: [b.status === "candidate" ? "kandidat" : "", b.fb_n ? `snitt ${meanText(b.fb_mean ?? 0)} av 3 (${b.fb_n})` : "", b.themes.length ? b.themes.join(", ") : ""].filter(Boolean).join(" · "),
    }));
  const chosen: EditorExercise[] = base
    ? base.plan.ovelser.map((e, i) => ({ key: bank.some((b) => b.code === e.kode) && e.kilde === "bank" ? `b:${e.kode}` : `k:${i}`, ref: { keep: i + 1 }, name: e.navn, category: e.kategori, note: `fra versjon ${base.version}` }))
    : [];
  const initial = base ? settingsFromPlan(base.plan) : defaultSettings(season?.theme ?? "");
  if (!base && team.session_minutes) {
    // Fill the session: 3 stations of equal length after warm-up and the end.
    const rest = team.session_minutes - initial.oppvarming - initial.avslutning - 2 * initial.bytte;
    if (rest >= 15) initial.stasjon = Math.max(5, Math.floor(rest / 3));
  }

  return (
    <AppShell ctx={ctx} title={base ? `Endre opplegg v${base.version}` : `Opplegg · ${event.start ? dayLabel(event.start) : event.heading}`} section="events" back={eventPath}>
      <PlanEditor groupId={ctx.group.id} eventId={event.id} baseId={base?.id ?? null} initial={initial} chosen={chosen} bank={bankItems} doneHref={eventPath} />
    </AppShell>
  );
}

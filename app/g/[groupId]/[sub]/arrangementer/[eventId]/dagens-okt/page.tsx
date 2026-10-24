import { CalendarDays, Clock, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { MiniChip } from "@/components/proposals/ProposalCard";
import { ExerciseDetails } from "@/components/plans/PlanSection";
import { SessionTimeline, type TimelineRow } from "@/components/plans/SessionTimeline";
import { AppShell } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/icon";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { findEvent } from "@/lib/events-data";
import { dayLabel, timeRange } from "@/lib/format";
import { schedule } from "@/lib/plans/plan";
import { proposalView } from "@/lib/proposal-view";
import { listProposals, sortProposals } from "@/lib/store/proposals";
import { listPlayerTags } from "@/lib/store/tags";
import { getPlan, planVersions } from "@/lib/store/training";

/**
 * Today's session at the pitch: the teams in vest colours, the schedule with
 * «Nå» and «Neste», and the exercises. Read only, large, and it can keep the
 * screen on.
 */
export default async function SessionPage(props: PageProps<"/g/[groupId]/[sub]/arrangementer/[eventId]/dagens-okt">) {
  const ctx = await contextFromParams(props.params);
  const { eventId } = await props.params;
  const event = await findEvent(ctx.user, ctx.group.id, decodeURIComponent(eventId));
  if (!event) notFound();
  const eventPath = ctx.path(`/arrangementer/${encodeURIComponent(event.id)}`);
  const d = await db();
  const [info, proposals, versions] = await Promise.all([
    listPlayerTags(d, ctx.user.access, ctx.user.rights, ctx.group.id),
    listProposals(d, ctx.user.access, ctx.group.id, { eventIds: [event.id], drafts: false }),
    event.match ? Promise.resolve([]) : planVersions(d, ctx.user.access, ctx.group.id, event.id),
  ]);
  const chosen = sortProposals(proposals)[0];
  const teams = chosen ? proposalView(chosen, ctx.group, info.tags, event, [], ctx.user.session.profileId) : null;
  const version = versions.find((v) => v.status === "approved") ?? versions[0];
  const stored = version ? await getPlan(d, ctx.user.access, version.id) : null;
  const plan = stored?.plan ?? null;

  let rows: TimelineRow[] = [];
  if (plan) {
    const names = teams?.groups.map((g) => g.title) ?? [];
    const s = schedule(plan, names);
    rows = s.rows.map((r) => {
      const [from, to] = r.tid.split("–").map(Number);
      const rotation = !r.felles && s.columns.length > 2;
      return {
        from,
        to,
        label: r.felles ? (r.tekst ?? "").replaceAll("**", "") : rotation ? "Stasjoner" : (r.celler?.[0] ?? ""),
        cells: rotation ? (r.celler ?? []).map((c, i) => `${s.columns[i + 1]}: ${c}`) : [],
      };
    });
  }

  return (
    <AppShell ctx={ctx} title="Dagens økt" section="events" back={eventPath} wide>
      <div className="nm-stack nm-session" style={{ gap: "var(--space-5)" }}>
        <div>
          <div style={{ fontSize: "var(--fs-title)", lineHeight: "var(--lh-title)", fontWeight: 700 }}>{plan?.tittel || event.heading}</div>
          <div className="nm-meta">
            {event.start ? (
              <span>
                <Icon icon={CalendarDays} size={18} />
                {dayLabel(event.start)}
              </span>
            ) : null}
            <span>
              <Icon icon={Clock} size={18} />
              {timeRange(event.start, event.end)}
            </span>
            {event.location ? (
              <span>
                <Icon icon={MapPin} size={18} />
                {event.location}
              </span>
            ) : null}
          </div>
        </div>

        <section aria-labelledby="okt-lag">
          <h2 className="nm-section-label" id="okt-lag" style={{ marginTop: 0 }}>
            Lag{chosen && chosen.status !== "approved" ? ` · ${teams?.statusLabel.toLowerCase()}` : ""}
          </h2>
          {teams ? (
            <div className="nm-teams nm-session__teams">
              {teams.groups.map((g) => (
                <section key={g.label} className={`nm-team nm-team--${g.vest}`} aria-label={g.title}>
                  <div className="nm-team__head">
                    <span>{g.title}</span>
                    <span className="nm-team__count">{g.members.length}</span>
                  </div>
                  <div className="nm-team__body">
                    {g.members.map((c) => (
                      <MiniChip key={c.id} c={c} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="nm-muted" style={{ margin: 0 }}>
              Ingen lagforslag for denne økta.
            </p>
          )}
        </section>

        {plan ? (
          <>
            <section aria-labelledby="okt-tid">
              <h2 className="nm-section-label" id="okt-tid">
                Tidsplan{version && version.status !== "approved" ? " · utkast" : ""}
              </h2>
              <SessionTimeline start={event.start} rows={rows} />
            </section>
            <section aria-labelledby="okt-ov">
              <h2 className="nm-section-label" id="okt-ov">
                Øvelser
              </h2>
              {plan.ovelser.map((e, i) => (
                <ExerciseDetails key={i} e={e} n={i + 1} open={i === 0} />
              ))}
            </section>
          </>
        ) : event.match ? null : (
          <p className="nm-muted" style={{ margin: 0 }}>
            Ingen treningsopplegg for denne økta.
          </p>
        )}
      </div>
    </AppShell>
  );
}

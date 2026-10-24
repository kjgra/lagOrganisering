import { Play, RefreshCw } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { PlanBadge, ProposalBadge } from "@/components/proposals/ProposalBadge";
import { AppShell } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/icon";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { forSubgroup, pastEvents, upcomingEvents } from "@/lib/events-data";
import { clock, osloDate, pastSection, weekSection } from "@/lib/format";
import { eventSentTo, responseCounts } from "@/lib/spond/events";
import type { SpondEvent } from "@/lib/spond/types";
import { activeLocks, listProposals, pendingProposals } from "@/lib/store/proposals";
import { latestPlans } from "@/lib/store/training";

const UNSENT_STEP = 5;
const PAST_STEP = 30;

const num = (x: unknown, fallback: number, max: number) => {
  const n = Number(Array.isArray(x) ? x[0] : x);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
};

/** Upcoming events (default) or past ones, grouped by week, for the group context. */
export default async function EventsPage(props: PageProps<"/g/[groupId]/[sub]/arrangementer">) {
  const ctx = await contextFromParams(props.params);
  const sp = await props.searchParams;
  const past = sp.vis === "tidligere";
  const fresh = sp.oppdater === "1";
  const days = num(sp.dager, PAST_STEP, 400);
  const unsentLimit = num(sp.flere, UNSENT_STEP, 200);
  const sub = ctx.subgroup?.id ?? null;

  let error: string | null = null;
  let events: SpondEvent[] = [];
  try {
    events = forSubgroup(past ? await pastEvents(ctx.user, ctx.group.id, days, fresh) : await upcomingEvents(ctx.user, ctx.group.id, fresh), sub);
  } catch (err) {
    console.error("Henting av arrangementer feilet:", (err as Error).message);
    error = "Kunne ikke hente arrangementer fra Spond. Prøv igjen om litt.";
  }

  // All events sent, and the next few not sent yet.
  let hidden = 0;
  if (!past) {
    let n = 0;
    events = events.filter((e) => {
      if (!e.notSent) return true;
      n += 1;
      if (n <= unsentLimit) return true;
      hidden += 1;
      return false;
    });
  }

  const d = await db();
  const [proposals, locks, pending, plans] = await Promise.all([
    listProposals(d, ctx.user.access, ctx.group.id, { eventIds: events.map((e) => e.id), drafts: false }),
    activeLocks(d, ctx.user.access, ctx.group.id),
    pendingProposals(d, ctx.user.access, ctx.group.id),
    latestPlans(d, ctx.user.access, ctx.group.id, events.filter((e) => !e.match).map((e) => e.id)),
  ]);

  const todayKey = osloDate(new Date());
  const today = past ? [] : events.filter((e) => e.start && !e.cancelled && !e.notSent && osloDate(e.start) === todayKey);

  const sections: { title: string; events: SpondEvent[] }[] = [];
  for (const e of events) {
    const title = e.start ? (past ? pastSection(e.start) : weekSection(e.start)) : "Uten tid";
    const last = sections.at(-1);
    if (last?.title === title) last.events.push(e);
    else sections.push({ title, events: [e] });
  }

  const base = ctx.path("/arrangementer");
  const query = (q: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined) p.set(k, String(v));
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <AppShell ctx={ctx} title={past ? "Gjennomførte arrangementer" : "Kommende arrangementer"} section="events">
      <div className="nm-toolbar">
        <div className="nm-seg" role="group" aria-label="Vis arrangementer">
          <Link href={base} aria-current={!past ? "page" : undefined}>
            Kommende
          </Link>
          <Link href={query({ vis: "tidligere" })} aria-current={past ? "page" : undefined}>
            Gjennomførte
          </Link>
        </div>
        <Link href={query({ vis: past ? "tidligere" : undefined, dager: past ? days : undefined, oppdater: 1 })} className="nm-btn nm-btn--ghost" prefetch={false}>
          <Icon icon={RefreshCw} size={20} />
          <span className="nm-btn__label">Oppdater</span>
        </Link>
      </div>

      {pending.length && !past ? (
        <div className="nm-note" style={{ marginTop: "var(--space-3)" }}>
          <span style={{ flex: 1 }}>
            {pending.length === 1 ? "1 lagforslag venter" : `${pending.length} lagforslag venter`} på godkjenning.
          </span>
          <Link href={ctx.path("/lagforslag?vis=godkjenning")} style={{ fontWeight: 700 }}>
            Se forslagene
          </Link>
        </div>
      ) : null}

      {today.map((e) => (
        <Link key={e.id} href={ctx.path(`/arrangementer/${encodeURIComponent(e.id)}/dagens-okt`)} className="nm-today">
          <span className="nm-today__when">I dag {e.start ? clock(e.start) : ""}</span>
          <span className="nm-today__what">{e.heading}</span>
          <span className="nm-today__go">
            <Icon icon={Play} size={20} />
            Dagens økt
          </span>
        </Link>
      ))}

      {error ? (
        <div className="nm-alert" role="alert" style={{ marginTop: "var(--space-4)" }}>
          {error}
        </div>
      ) : !events.length ? (
        <p style={{ fontSize: "var(--fs-body-lg)" }}>
          {past ? `Ingen gjennomførte arrangementer de siste ${days} dagene.` : "Ingen kommende arrangementer i Spond-gruppa."}
        </p>
      ) : (
        sections.map((s) => (
          <section key={s.title}>
            <h2 className="nm-section-label">{s.title}</h2>
            <div className="nm-stack">
              {s.events.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  href={ctx.path(`/arrangementer/${encodeURIComponent(e.id)}`)}
                  counts={responseCounts(e, ctx.group)}
                  sentTo={ctx.subgroup ? undefined : eventSentTo(e, ctx.group)}
                  badges={
                    <>
                      <ProposalBadge
                        proposals={proposals.filter((p) => p.eventId === e.id)}
                        locked={locks.some((l) => l.eventId === e.id && l.editor !== ctx.user.session.profileId)}
                      />
                      <PlanBadge plan={plans.find((x) => x.spond_event_id === e.id)} />
                    </>
                  }
                />
              ))}
            </div>
          </section>
        ))
      )}

      {!past && hidden > 0 ? (
        <div className="nm-row" style={{ marginTop: "var(--space-4)" }}>
          <span className="nm-muted">{hidden} flere som ikke er sendt ut.</span>
          <Link className="nm-btn nm-btn--secondary" href={query({ flere: unsentLimit + UNSENT_STEP })} scroll={false}>
            Vis flere
          </Link>
        </div>
      ) : null}
      {past && !error ? (
        <div className="nm-row" style={{ marginTop: "var(--space-4)" }}>
          <span className="nm-muted">Viser siste {days} dager.</span>
          <Link className="nm-btn nm-btn--secondary" href={query({ vis: "tidligere", dager: days + PAST_STEP })} scroll={false}>
            Vis eldre
          </Link>
        </div>
      ) : null}
    </AppShell>
  );
}

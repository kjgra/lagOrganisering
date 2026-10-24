import { Plus } from "lucide-react";
import Link from "next/link";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { AppShell } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/icon";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { forSubgroup, pastEvents, upcomingEvents } from "@/lib/events-data";
import { dayLabel } from "@/lib/format";
import { proposalView } from "@/lib/proposal-view";
import { eventIsPast } from "@/lib/spond/events";
import type { SpondEvent } from "@/lib/spond/types";
import { activeLocks, listProposals, pendingProposals, sortProposals, type Proposal } from "@/lib/store/proposals";
import { listPlayerTags } from "@/lib/store/tags";

type View = "alle" | "godkjenning" | "utkast";

/** Saved team proposals per event, those waiting for approval, and gruppeutkast. */
export default async function ProposalsPage(props: PageProps<"/g/[groupId]/[sub]/lagforslag">) {
  const ctx = await contextFromParams(props.params);
  const sp = await props.searchParams;
  const view: View = sp.vis === "godkjenning" ? "godkjenning" : sp.vis === "utkast" ? "utkast" : "alle";
  const d = await db();
  const sub = ctx.subgroup?.id ?? null;

  let events: SpondEvent[] = [];
  let error: string | null = null;
  try {
    const [up, past] = await Promise.all([upcomingEvents(ctx.user, ctx.group.id), pastEvents(ctx.user, ctx.group.id, 30)]);
    events = forSubgroup([...up, ...past], view === "godkjenning" ? null : sub);
  } catch (err) {
    console.error("Henting av arrangementer feilet:", (err as Error).message);
    error = "Kunne ikke hente arrangementer fra Spond. Forslagene vises uten arrangement.";
  }
  const [tags, locks, all, pending] = await Promise.all([
    listPlayerTags(d, ctx.user.access, ctx.user.rights, ctx.group.id).then((t) => t.tags),
    activeLocks(d, ctx.user.access, ctx.group.id),
    listProposals(d, ctx.user.access, ctx.group.id, { eventIds: events.map((e) => e.id), subgroupId: sub }),
    pendingProposals(d, ctx.user.access, ctx.group.id),
  ]);
  const me = ctx.user.session.profileId;
  const eventOf = new Map(events.map((e) => [e.id, e]));
  const eventPath = (id: string) => ctx.path(`/arrangementer/${encodeURIComponent(id)}`);
  const line = (p: Proposal) => {
    if (!p.eventId) {
      const s = p.subgroupId ? ctx.group.subgroups.find((x) => x.id === p.subgroupId)?.name : ctx.group.name;
      return { text: `Gruppeutkast · ${s ?? "ukjent undergruppe"}`, href: ctx.path(`/lagforslag/utkast/${p.id}`) };
    }
    const e = eventOf.get(p.eventId);
    return e ? { text: `${e.heading} · ${e.start ? dayLabel(e.start) : ""}`, href: eventPath(e.id) } : undefined;
  };
  const editHref = (p: Proposal) => {
    if (!p.eventId) return ctx.path(`/lagforslag/utkast/${p.id}`);
    const e = eventOf.get(p.eventId);
    return e && !eventIsPast(e) ? `${eventPath(e.id)}/lag/${p.id}` : undefined;
  };
  const card = (p: Proposal, showEvent: boolean) => (
    <ProposalCard
      key={p.id}
      p={proposalView(p, ctx.group, tags, p.eventId ? (eventOf.get(p.eventId) ?? null) : null, locks, me)}
      editHref={editHref(p)}
      eventLine={showEvent ? line(p) : undefined}
    />
  );

  const eventProposals = all.filter((p) => p.eventId && eventOf.has(p.eventId));
  const drafts = sortProposals(all.filter((p) => !p.eventId && p.subgroupId === sub));
  const byEvent = events
    .map((e) => ({ e, list: sortProposals(eventProposals.filter((p) => p.eventId === e.id)) }))
    .filter((x) => x.list.length)
    // Newest event first.
    .sort((a, b) => Date.parse(b.e.start ?? "") - Date.parse(a.e.start ?? ""));

  return (
    <AppShell ctx={ctx} title="Lagrede lagforslag" section="proposals">
      <AutoRefresh />
      <div className="nm-seg" role="group" aria-label="Vis lagforslag" style={{ marginBottom: "var(--space-2)" }}>
        <Link href={ctx.path("/lagforslag")} aria-current={view === "alle" ? "page" : undefined}>
          Per arrangement
        </Link>
        <Link href={ctx.path("/lagforslag?vis=godkjenning")} aria-current={view === "godkjenning" ? "page" : undefined}>
          Til godkjenning {pending.length ? pending.length : ""}
        </Link>
        <Link href={ctx.path("/lagforslag?vis=utkast")} aria-current={view === "utkast" ? "page" : undefined}>
          Gruppeutkast {drafts.length ? drafts.length : ""}
        </Link>
      </div>
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}

      {view === "alle" ? (
        byEvent.length ? (
          byEvent.map(({ e, list }, i) => (
            <section key={e.id}>
              <h2 className="nm-section-label" style={i === 0 ? { marginTop: "var(--space-3)" } : undefined}>
                <Link href={eventPath(e.id)} style={{ color: "inherit" }}>
                  {e.heading} · {e.start ? dayLabel(e.start) : ""}
                </Link>
              </h2>
              <div className="nm-stack nm-proposals">{list.map((p) => card(p, false))}</div>
            </section>
          ))
        ) : (
          <p style={{ fontSize: "var(--fs-body-lg)" }}>Ingen lagrede forslag ennå. Lag lag fra et arrangement og trykk «Lagre forslag».</p>
        )
      ) : null}

      {view === "godkjenning" ? (
        <>
          <p className="nm-muted">Forslag til arrangementer og gruppeutkast i {ctx.group.name} som venter på godkjenning.</p>
          {pending.length ? (
            <div className="nm-stack nm-proposals">{pending.map((p) => card(p, true))}</div>
          ) : (
            <p style={{ fontSize: "var(--fs-body-lg)" }}>Ingen forslag venter på godkjenning.</p>
          )}
        </>
      ) : null}

      {view === "utkast" ? (
        <>
          <p className="nm-muted">
            Skisser til nye undergrupper i {ctx.label}. Dette er bare forslag; de gjelder først når undergruppene opprettes eller
            endres i Spond.
          </p>
          <Link href={ctx.path("/lagforslag/utkast/ny")} className="nm-btn nm-btn--secondary" style={{ marginBottom: "var(--space-3)" }}>
            <Icon icon={Plus} />
            Lag gruppeutkast
          </Link>
          {drafts.length ? (
            <div className="nm-stack nm-proposals">{drafts.map((p) => card(p, false))}</div>
          ) : (
            <p style={{ fontSize: "var(--fs-body-lg)" }}>Ingen gruppeutkast her ennå.</p>
          )}
        </>
      ) : null}
    </AppShell>
  );
}

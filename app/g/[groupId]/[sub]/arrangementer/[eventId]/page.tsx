import { Ban, CalendarDays, Clock, MapPin, Pencil, Play, Plus, Send, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ParticipantList, type ParticipantRow } from "@/components/events/ParticipantList";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { AppShell } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/icon";
import { ResponseCounts, Tag } from "@/components/ui/status";
import { PlanSection } from "@/components/plans/PlanSection";
import { QuickCreate } from "@/components/plans/QuickCreate";
import { AI_MODELS, budgetCheck } from "@/lib/ai/plan-ai";
import { contextFromParams, pairCandidates } from "@/lib/context";
import { db } from "@/lib/db";
import { aiMode, env } from "@/lib/env";
import { findEvent } from "@/lib/events-data";
import { clock, dayLabel, decimal, osloDate, osloMonthStart, shortDate, timeRange } from "@/lib/format";
import { profileName, proposalView } from "@/lib/proposal-view";
import { isPlayerKind } from "@/lib/spond/data";
import { eventCoaches, eventIsPast, eventParticipants, eventSentTo, placeable, responseCounts } from "@/lib/spond/events";
import { activeLocks, listProposals, sortProposals } from "@/lib/store/proposals";
import { quickDefaults } from "@/lib/quick";
import { aiSpend, getAiSettings } from "@/lib/store/ai";
import { listPlayerTags, pairsOf, tagSuggestions } from "@/lib/store/tags";

/** «Hurtigopprett» runs KI, which may take a minute or two; the Server Action runs within this page's limit. */
export const maxDuration = 300;

/** An event: who is coming, the team proposals, and the training plan. */
export default async function EventPage(props: PageProps<"/g/[groupId]/[sub]/arrangementer/[eventId]">) {
  const ctx = await contextFromParams(props.params);
  const { eventId } = await props.params;
  const sp = await props.searchParams;
  const selectedPlan = Number(typeof sp.opplegg === "string" ? sp.opplegg : "") || undefined;
  const event = await findEvent(ctx.user, ctx.group.id, decodeURIComponent(eventId));
  if (!event) notFound();

  const d = await db();
  const [info, proposals, locks] = await Promise.all([
    listPlayerTags(d, ctx.user.access, ctx.user.rights, ctx.group.id),
    listProposals(d, ctx.user.access, ctx.group.id, { eventIds: [event.id], drafts: false }),
    activeLocks(d, ctx.user.access, ctx.group.id),
  ]);
  const past = eventIsPast(event);
  const counts = responseCounts(event, ctx.group);
  const parts = eventParticipants(event, ctx.group);
  const players = parts.filter((p) => p.kind !== "coach" && p.kind !== "adult");
  const coaches = eventCoaches(event, ctx.group).filter((c) => c.status === "accepted");
  const fixed = env().TAG_SUGGESTIONS;
  const { tags } = info;
  const rows: ParticipantRow[] = players.map((p) => ({
    memberId: p.memberId,
    name: p.displayName,
    status: p.status,
    tags: tags.get(p.memberId) ?? [],
    canTag: ctx.user.rights.tags && p.known && p.kind === "player",
    suggestions: tagSuggestions(tags, p.memberId, fixed),
    level: info.levels.get(p.memberId) ?? null,
    pairs: pairsOf(info.pairs, p.memberId),
  }));
  const nPlaceable = parts.filter((p) => placeable(p.status, event.notSent) && isPlayerKind(p.kind)).length;
  const views = sortProposals(proposals).map((p) => proposalView(p, ctx.group, tags, event, locks, ctx.user.session.profileId));
  const newLocks = locks.filter((l) => l.eventId === event.id && !l.proposalId && l.editor !== ctx.user.session.profileId);
  const eventPath = ctx.path(`/arrangementer/${encodeURIComponent(event.id)}`);
  const today = !!event.start && osloDate(event.start) === osloDate(new Date());
  // «Hurtigopprett»: before a training with neither teams nor a plan, for trainers with KI.
  const quick = !views.length && !newLocks.length && ctx.user.rights.ai ? await quickDefaults(d, ctx.user, ctx.group, ctx.subgroup?.id ?? null, event).catch(() => null) : null;
  const ai = quick ? await Promise.all([getAiSettings(d), aiSpend(d, ctx.user.access, ctx.group.id, osloMonthStart(new Date()))]) : null;
  const budget = ai ? budgetCheck(ai[1], ai[0]) : null;

  return (
    <AppShell
      ctx={ctx}
      title="Påmeldte"
      section="events"
      back={ctx.path("/arrangementer")}
      actions={
        !past && !event.cancelled ? (
          <>
            {/* One yellow button per screen: on the day it is «Dagens økt»; once a proposal exists, its card carries the next step. */}
            {views.length || today ? (
              <Link href={`${eventPath}/lag`} className="nm-btn nm-btn--secondary nm-btn--lg">
                <Icon icon={Plus} />
                {views.length ? "Nytt lagforslag" : "Lag lag"}
              </Link>
            ) : (
              <Link href={`${eventPath}/lag`} className="nm-btn nm-btn--primary nm-btn--lg">
                <Icon icon={Users} />
                {event.notSent ? `Lag lag av ${nPlaceable} inviterte` : `Lag lag av ${nPlaceable} spillere`}
              </Link>
            )}
            {today ? (
              <Link href={`${eventPath}/dagens-okt`} className="nm-btn nm-btn--primary nm-btn--lg">
                <Icon icon={Play} />
                Dagens økt
              </Link>
            ) : null}
          </>
        ) : undefined
      }
    >
      <AutoRefresh />
      <nav className="nm-jump" aria-label="Hopp til">
        <a href="#lag-h">Lag</a>
        {!event.match ? <a href="#plan-h">Opplegg</a> : null}
        <a href="#sp-h">Spillere</a>
      </nav>
      <div className="nm-stack" style={{ gap: "var(--space-4)" }}>
        <div>
          <div className="nm-row" style={{ gap: "var(--space-2)" }}>
            <div style={{ fontSize: "var(--fs-heading)", lineHeight: "var(--lh-heading)", fontWeight: 700 }}>{event.heading}</div>
            {event.match ? (
              <span className="nm-badge nm-badge--neutral">
                <Icon icon={Trophy} size={16} />
                Kamp
              </span>
            ) : null}
            {event.cancelled ? (
              <span className="nm-badge nm-badge--kommer-ikke">
                <Icon icon={Ban} size={16} />
                Avlyst
              </span>
            ) : null}
          </div>
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
          <div className="nm-row" style={{ gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <span className="nm-muted" style={{ fontSize: "var(--fs-caption)" }}>
              Sendt til:
            </span>
            {eventSentTo(event, ctx.group).map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
            {event.notSent ? (
              <span className="nm-badge nm-badge--neutral">
                <Icon icon={Send} size={16} />
                Ikke sendt{event.inviteTime ? ` · sendes ${shortDate(event.inviteTime)} kl. ${clock(event.inviteTime)}` : ""}
              </span>
            ) : null}
          </div>
          {coaches.length ? (
            <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--fs-body)" }}>
              <strong>Trenere:</strong> {coaches.map((c) => c.displayName).join(", ")}
            </p>
          ) : null}
          {!event.notSent ? (
            <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <ResponseCounts accepted={counts.accepted} unanswered={counts.unanswered} declined={counts.declined} />
            </div>
          ) : null}
        </div>

        <section aria-labelledby="lag-h">
          <h2 className="nm-section-label" id="lag-h" style={{ marginTop: 0 }}>
            Lag
          </h2>
          {newLocks.map((l) => (
            <div key={l.sessionKey} className="nm-note" role="status" style={{ marginBottom: "var(--space-2)" }}>
              <Icon icon={Pencil} />
              <span>
                {profileName(ctx.group, l.editor)} lager et nytt lagforslag her nå (startet kl. {clock(l.startedAt)}).
              </span>
            </div>
          ))}
          {views.length ? (
            <div className="nm-stack nm-proposals">
              {views.map((v) => (
                <ProposalCard key={v.id} p={v} editHref={past ? undefined : `${eventPath}/lag/${v.id}`} />
              ))}
            </div>
          ) : (
            <p className="nm-muted" style={{ margin: 0 }}>
              {past ? "Det ble ikke laget noen lag for dette arrangementet." : "Ingen lagforslag ennå."}
            </p>
          )}
          {quick && ai && budget ? (
            <div className="nm-quick-offer">
              <p style={{ margin: 0 }}>Ikke tid? La KI lage både lag og opplegg som utkast.</p>
              <QuickCreate
                groupId={ctx.group.id}
                sub={ctx.subgroup?.id ?? ""}
                eventId={event.id}
                eventPath={eventPath}
                {...quick}
                model={{ id: ai[0].model, label: AI_MODELS[ai[0].model]?.label ?? ai[0].model }}
                budgetText={budget.ok ? `Laget har brukt ${decimal(budget.groupNok, 2)} av ${ai[0].group_limit_nok} kr til KI denne måneden.` : budget.message}
                simulated={aiMode() === "mock"}
                invited={event.notSent}
              />
            </div>
          ) : null}
        </section>

        {!event.match ? <PlanSection ctx={ctx} event={event} selected={selectedPlan} /> : null}

        <section aria-labelledby="sp-h">
          <h2 className="nm-section-label" id="sp-h">
            Spillere
          </h2>
          <ParticipantList groupId={ctx.group.id} rows={rows} players={pairCandidates(ctx)} />
        </section>
      </div>
    </AppShell>
  );
}

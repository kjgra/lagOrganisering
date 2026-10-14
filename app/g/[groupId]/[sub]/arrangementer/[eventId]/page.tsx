import { CalendarDays, Clock, MapPin, Pencil, Send, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ParticipantList, type ParticipantRow } from "@/components/events/ParticipantList";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { AppShell } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/icon";
import { ResponseCounts, Tag } from "@/components/ui/status";
import { PlanSection } from "@/components/plans/PlanSection";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { findEvent } from "@/lib/events-data";
import { clock, dayLabel, shortDate, timeRange } from "@/lib/format";
import { profileName, proposalView } from "@/lib/proposal-view";
import { isPlayerKind } from "@/lib/spond/data";
import { eventCoaches, eventIsPast, eventParticipants, eventSentTo, placeable, responseCounts } from "@/lib/spond/events";
import { activeLocks, listProposals, sortProposals } from "@/lib/store/proposals";
import { listTags, tagSuggestions } from "@/lib/store/tags";

/** An event: who is coming, the team proposals, and the training plan. */
export default async function EventPage(props: PageProps<"/g/[groupId]/[sub]/arrangementer/[eventId]">) {
  const ctx = await contextFromParams(props.params);
  const { eventId } = await props.params;
  const event = await findEvent(ctx.user, ctx.group.id, decodeURIComponent(eventId));
  if (!event) notFound();

  const d = await db();
  const [tags, proposals, locks] = await Promise.all([
    listTags(d, ctx.user.access, ctx.group.id),
    listProposals(d, ctx.user.access, ctx.group.id, { eventIds: [event.id], drafts: false }),
    activeLocks(d, ctx.user.access, ctx.group.id),
  ]);
  const past = eventIsPast(event);
  const counts = responseCounts(event, ctx.group);
  const parts = eventParticipants(event, ctx.group);
  const players = parts.filter((p) => p.kind !== "coach" && p.kind !== "adult");
  const coaches = eventCoaches(event, ctx.group).filter((c) => c.status === "accepted");
  const fixed = env().TAG_SUGGESTIONS;
  const rows: ParticipantRow[] = players.map((p) => ({
    memberId: p.memberId,
    name: p.displayName,
    status: p.status,
    tags: tags.get(p.memberId) ?? [],
    canTag: p.known && p.kind === "player",
    suggestions: tagSuggestions(tags, p.memberId, fixed),
  }));
  const nPlaceable = parts.filter((p) => placeable(p.status, event.notSent) && isPlayerKind(p.kind)).length;
  const views = sortProposals(proposals).map((p) => proposalView(p, ctx.group, tags, event, locks, ctx.user.session.profileId));
  const newLocks = locks.filter((l) => l.eventId === event.id && !l.proposalId && l.editor !== ctx.user.session.profileId);
  const eventPath = ctx.path(`/arrangementer/${encodeURIComponent(event.id)}`);

  return (
    <AppShell
      ctx={ctx}
      title="Påmeldte"
      section="events"
      back={ctx.path("/arrangementer")}
      actions={
        !past && !event.cancelled ? (
          <Link href={`${eventPath}/lag`} className="nm-btn nm-btn--primary nm-btn--lg">
            <Icon icon={Users} />
            {event.notSent ? `Lag lag av ${nPlaceable} inviterte` : `Lag lag av ${nPlaceable} spillere`}
          </Link>
        ) : undefined
      }
    >
      <AutoRefresh />
      <div className="nm-stack" style={{ gap: 16 }}>
        <div>
          <div style={{ fontSize: 20, lineHeight: "26px", fontWeight: 700 }}>{event.heading}</div>
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
          <div className="nm-row" style={{ gap: 6, marginTop: 8 }}>
            <span className="nm-muted" style={{ fontSize: 15 }}>
              Sendt til:
            </span>
            {eventSentTo(event, ctx.group).map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
            {event.match ? <Tag>Kamp</Tag> : null}
            {event.cancelled ? <Tag>Avlyst</Tag> : null}
            {event.notSent ? (
              <span className="nm-badge nm-badge--neutral">
                <Icon icon={Send} size={16} />
                Ikke sendt{event.inviteTime ? ` · sendes ${shortDate(event.inviteTime)} kl. ${clock(event.inviteTime)}` : ""}
              </span>
            ) : null}
          </div>
          {coaches.length ? (
            <p style={{ margin: "8px 0 0", fontSize: 16 }}>
              <strong>Trenere:</strong> {coaches.map((c) => c.displayName).join(", ")}
            </p>
          ) : null}
          {!event.notSent ? (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <ResponseCounts accepted={counts.accepted} unanswered={counts.unanswered} declined={counts.declined} />
            </div>
          ) : null}
        </div>

        <section aria-labelledby="lag-h">
          <h2 className="nm-section-label" id="lag-h" style={{ marginTop: 0 }}>
            Lag
          </h2>
          {newLocks.map((l) => (
            <div key={l.sessionKey} className="nm-note" role="status" style={{ marginBottom: 8 }}>
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
        </section>

        {!event.match ? <PlanSection ctx={ctx} event={event} /> : null}

        <section aria-labelledby="sp-h">
          <h2 className="nm-section-label" id="sp-h">
            Spillere
          </h2>
          <ParticipantList groupId={ctx.group.id} rows={rows} />
        </section>
      </div>
    </AppShell>
  );
}

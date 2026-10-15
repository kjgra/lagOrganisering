import { ChevronRight, Clock, MapPin, Send } from "lucide-react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ResponseCounts, Tag } from "@/components/ui/status";
import { longDate, shortDate, timeRange } from "@/lib/format";
import { DateBlock } from "./DateBlock";
import type { ResponseCounts as Counts } from "@/lib/spond/events";
import type { SpondEvent } from "@/lib/spond/types";

/** One event as a card that links to its participants. */
export function EventCard({
  event,
  href,
  counts,
  sentTo,
  badges,
}: {
  event: SpondEvent;
  href: string;
  counts: Counts;
  /** Subgroups it was sent to (shown in the main group view only). */
  sentTo?: string[];
  badges?: React.ReactNode;
}) {
  const sent = !event.notSent;
  return (
    <Link href={href} className="nm-card nm-event">
      <span className="nm-sr">{event.start ? longDate(event.start) : ""}</span>
      <DateBlock start={event.start} sent={sent} cancelled={event.cancelled} />
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <div style={{ fontSize: "var(--fs-heading)", lineHeight: "var(--lh-heading)", fontWeight: 700, textDecoration: event.cancelled ? "line-through" : undefined }}>
          {event.heading}
        </div>
        <div className="nm-meta">
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
        {sentTo?.length || event.match || event.cancelled || badges ? (
          <div className="nm-row" style={{ gap: "var(--space-2)" }}>
            {event.cancelled ? <Tag>Avlyst</Tag> : null}
            {event.match ? <Tag>Kamp</Tag> : null}
            {sentTo?.map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
            {badges}
          </div>
        ) : null}
      </div>
      <span className="nm-muted nm-event__go">
        <Icon icon={ChevronRight} size={24} />
      </span>
      <div className="nm-event__resp">
        {sent ? (
          <>
            <ResponseCounts accepted={counts.accepted} unanswered={counts.unanswered} declined={counts.declined} />
            {counts.coachesComing ? (
              <span className="nm-muted" style={{ fontSize: "var(--fs-caption)" }}>
                {counts.coachesComing} {counts.coachesComing === 1 ? "trener" : "trenere"} kommer
              </span>
            ) : null}
          </>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)" }}>
            <span className="nm-badge nm-badge--neutral">
              <Icon icon={Send} size={16} />
              Ikke sendt
            </span>
            <span className="nm-muted" style={{ fontSize: "var(--fs-body)" }}>
              {counts.invited} blir invitert{event.inviteTime ? ` · sendes ${shortDate(event.inviteTime)}` : ""}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

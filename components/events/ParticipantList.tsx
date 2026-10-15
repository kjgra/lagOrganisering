"use client";

import { Tags } from "lucide-react";
import { useState } from "react";
import { TagSheet, type TagTarget } from "@/components/members/TagSheet";
import { Icon } from "@/components/ui/icon";
import { Avatar, StatusBadge, Tag } from "@/components/ui/status";
import type { ResponseStatus } from "@/lib/spond/types";

export interface ParticipantRow {
  memberId: string;
  name: string;
  status: ResponseStatus;
  tags: string[];
  /** Players still in the group can get tags. */
  canTag: boolean;
  suggestions: string[];
}

const FILTERS: { key: ResponseStatus; label: string }[] = [
  { key: "accepted", label: "Kommer" },
  { key: "unanswered", label: "Ikke svart" },
  { key: "declined", label: "Kommer ikke" },
  { key: "waiting", label: "Venteliste" },
  { key: "unconfirmed", label: "Ikke bekreftet" },
];

/** Players on an event with response, tags and a filter. Tap a player to edit tags. */
export function ParticipantList({ groupId, rows }: { groupId: string; rows: ParticipantRow[] }) {
  const [filter, setFilter] = useState<ResponseStatus | "all">("all");
  const [editing, setEditing] = useState<TagTarget | null>(null);
  const count = (s: ResponseStatus) => rows.filter((r) => r.status === s).length;
  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  const filters = FILTERS.filter((f) => f.key === "accepted" || f.key === "unanswered" || f.key === "declined" || count(f.key) > 0);

  if (!rows.length) return <p className="nm-muted">Ingen spillere er invitert.</p>;
  return (
    <>
      <div className="nm-seg" role="group" aria-label="Filtrer spillere">
        <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          Alle {rows.length}
        </button>
        {filters.map((f) => (
          <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label} {count(f.key)}
          </button>
        ))}
      </div>
      {shown.length ? (
        <ul className="nm-list" style={{ marginTop: "var(--space-3)" }}>
          {shown.map((r) => {
            const body = (
              <>
                <Avatar name={r.name} />
                <span className="nm-list__main">
                  <span className="nm-list__name">{r.name}</span>
                  {r.tags.length ? (
                    <span className="nm-row" style={{ gap: "var(--space-2)" }}>
                      {r.tags.map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </span>
                  ) : null}
                </span>
                <StatusBadge status={r.status} />
              </>
            );
            return (
              <li key={r.memberId} style={r.canTag ? { padding: 0 } : undefined}>
                {r.canTag ? (
                  <button
                    type="button"
                    className="nm-row-btn"
                    aria-label={`${r.name}. Endre tagger.`}
                    onClick={() => setEditing({ memberId: r.memberId, name: r.name, tags: r.tags, suggestions: r.suggestions })}
                  >
                    {body}
                  </button>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="nm-muted">Ingen her.</p>
      )}
      <p className="nm-muted" style={{ fontSize: "var(--fs-caption)", display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
        <Icon icon={Tags} size={18} />
        Trykk på en spiller for å legge til eller fjerne tagger.
      </p>
      {editing ? <TagSheet groupId={groupId} target={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

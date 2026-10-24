"use client";

import { useState } from "react";
import { Avatar, Tag } from "@/components/ui/status";
import { TagSheet, type PlayerName, type TagTarget } from "./TagSheet";

export interface MemberRow {
  id: string;
  name: string;
  tags: string[];
  suggestions: string[];
  level: number | null;
  pairs: string[];
}

/** Level, pairs and free-text tags of a player, as small tags. */
export function TagLine({ level, pairs, tags, nameOf }: { level: number | null; pairs: string[]; tags: string[]; nameOf: (id: string) => string }) {
  if (!level && !pairs.length && !tags.length) return null;
  return (
    <span className="nm-row" style={{ gap: "var(--space-2)" }}>
      {level ? <Tag>Nivå {level}</Tag> : null}
      {pairs.length ? <Tag>Godt med {pairs.map(nameOf).join(", ")}</Tag> : null}
      {tags.map((t) => (
        <Tag key={t}>{t}</Tag>
      ))}
    </span>
  );
}

export const tagText = (r: { level: number | null; tags: string[] }) => [...(r.level ? [`nivå ${r.level}`] : []), ...r.tags].join(", ");

/** Players with their tags. Tap a player to edit tags, if the user may. */
export function MemberList({ groupId, rows, players, canTag }: { groupId: string; rows: MemberRow[]; players: PlayerName[]; canTag: boolean }) {
  const [editing, setEditing] = useState<TagTarget | null>(null);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "Tidligere medlem";
  return (
    <>
      <ul className="nm-list">
        {rows.map((r) => {
          const body = (
            <>
              <Avatar name={r.name} />
              <span className="nm-list__main">
                <span className="nm-list__name">{r.name}</span>
                <TagLine level={r.level} pairs={r.pairs} tags={r.tags} nameOf={nameOf} />
              </span>
            </>
          );
          return canTag ? (
            <li key={r.id} style={{ padding: 0 }}>
              <button
                type="button"
                className="nm-row-btn"
                aria-label={`${r.name}${tagText(r) ? `, ${tagText(r)}` : ""}. Endre tagger.`}
                onClick={() => setEditing({ memberId: r.id, name: r.name, tags: r.tags, suggestions: r.suggestions, level: r.level, pairs: r.pairs })}
              >
                {body}
              </button>
            </li>
          ) : (
            <li key={r.id}>{body}</li>
          );
        })}
      </ul>
      {editing ? <TagSheet groupId={groupId} target={editing} players={players} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

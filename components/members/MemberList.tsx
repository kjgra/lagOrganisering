"use client";

import { useState } from "react";
import { Avatar, Tag } from "@/components/ui/status";
import { TagSheet, type TagTarget } from "./TagSheet";

export interface MemberRow {
  id: string;
  name: string;
  tags: string[];
  suggestions: string[];
}

/** Players with their tags. Tap a player to edit tags. */
export function MemberList({ groupId, rows }: { groupId: string; rows: MemberRow[] }) {
  const [editing, setEditing] = useState<TagTarget | null>(null);
  return (
    <>
      <ul className="nm-list">
        {rows.map((r) => (
          <li key={r.id} style={{ padding: 0 }}>
            <button
              type="button"
              className="nm-row-btn"
              aria-label={`${r.name}${r.tags.length ? `, tagger: ${r.tags.join(", ")}` : ""}. Endre tagger.`}
              onClick={() => setEditing({ memberId: r.id, name: r.name, tags: r.tags, suggestions: r.suggestions })}
            >
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
            </button>
          </li>
        ))}
      </ul>
      {editing ? <TagSheet groupId={groupId} target={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

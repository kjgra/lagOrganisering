"use client";

import { useState } from "react";
import type { PitchGroup } from "@/lib/plans/plan";

/**
 * All the pitches at the facility, one foldable group per main pitch with its
 * sub-pitches below. Groups with a pitch chosen at the start are open.
 */
export function PitchTree({ groups, value, onChange, label }: { groups: PitchGroup[]; value: number[]; onChange: (ids: number[]) => void; label: string }) {
  const [initial] = useState(value);
  return (
    <div role="group" aria-label={label}>
      {groups.map((g) => {
        const n = g.pitches.filter((p) => value.includes(p.id)).length;
        return (
          <details key={g.title} className="nm-exercise" open={g.pitches.some((p) => initial.includes(p.id))}>
            <summary style={{ cursor: "pointer", minHeight: "var(--touch-min)", display: "flex", alignItems: "center", fontWeight: 700 }}>
              {g.title}
              {n ? ` (${n} valgt)` : ""}
            </summary>
            {g.pitches.map((p) => (
              <label key={p.id} className="nm-check" style={{ paddingLeft: `calc(var(--space-4) * ${p.depth})` }}>
                <input type="checkbox" checked={value.includes(p.id)} onChange={(e) => onChange(e.target.checked ? [...value, p.id] : value.filter((y) => y !== p.id))} />
                <span>
                  {p.name}
                  <span className="nm-hint" style={{ display: "block" }}>
                    {p.facts}
                  </span>
                </span>
              </label>
            ))}
          </details>
        );
      })}
    </div>
  );
}

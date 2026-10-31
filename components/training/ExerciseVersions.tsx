"use client";

import { History, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { rollbackExerciseAction } from "@/app/actions/training";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

export interface VersionLine {
  version: number;
  current: boolean;
  /** «1. nov · Forslag fra Forbedringer · snitt 2,4 av 3 fra 5 vurderinger» */
  text: string;
}

/** The versions of an exercise with the mean of each, and a way back to an earlier one. */
export function ExerciseVersions({ groupId, id, lines, note }: { groupId: string; id: number; lines: VersionLine[]; note: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const back = (version: number) =>
    start(async () => {
      setError(null);
      const r = await rollbackExerciseAction(groupId, id, version);
      setAsk(null);
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      router.refresh();
    });
  return (
    <section aria-labelledby="versions-h" aria-busy={pending} style={{ maxWidth: 760, marginTop: "var(--space-5)" }}>
      <h2 id="versions-h" className="nm-h3" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
        <Icon icon={History} size={20} />
        Versjoner
      </h2>
      {note ? <p className="nm-hint">{note}</p> : null}
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "var(--space-2)" }}>
        {lines.map((l) => (
          <li key={l.version} className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ flex: "1 1 240px" }}>
              <strong>
                Versjon {l.version}
                {l.current ? " (nå)" : ""}
              </strong>{" "}
              <span className="nm-hint">· {l.text}</span>
            </span>
            {l.current ? null : ask === l.version ? (
              <span className="nm-row" style={{ gap: "var(--space-2)" }}>
                <button type="button" className="nm-btn nm-btn--primary" onClick={() => back(l.version)} disabled={pending}>
                  <Icon icon={RotateCcw} />
                  Ja, gå tilbake
                </button>
                <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setAsk(null)} disabled={pending}>
                  Avbryt
                </button>
              </span>
            ) : (
              <button type="button" className="nm-btn nm-btn--secondary" onClick={() => setAsk(l.version)} disabled={pending}>
                <Icon icon={RotateCcw} />
                Gå tilbake hit
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

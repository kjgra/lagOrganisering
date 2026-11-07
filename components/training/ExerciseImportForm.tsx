"use client";

import { AlertTriangle, Check, Copy, FileUp, Lightbulb, Upload, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importExercisesAction, previewExerciseImportAction } from "@/app/actions/training";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { ImportRow, ImportStatus } from "@/lib/plans/exercise-import";

const STATUS: Record<ImportStatus, { label: string; badge: string; icon: LucideIcon }> = {
  ny: { label: "Legges inn", badge: "nm-badge--kommer", icon: Check },
  endring: { label: "Blir forslag", badge: "nm-badge--kommer", icon: Lightbulb },
  finnes: { label: "Finnes", badge: "nm-badge--neutral", icon: Copy },
  ligner: { label: "Ligner", badge: "nm-badge--ikke-svart", icon: AlertTriangle },
  feil: { label: "Feil", badge: "nm-badge--kommer-ikke", icon: X },
};

/** «Importer øvelser» (superadmin): upload a JSON file, see what it adds, then add it. */
export function ExerciseImportForm({ groupId, listHref }: { groupId: string; listHref: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (f: File | undefined) => {
    setRows(null);
    setError(null);
    if (!f) return;
    if (f.size > 1_000_000) return setError("Fila er for stor (maks 1 MB).");
    const t = await f.text();
    setText(t);
    setFile(f.name);
    start(async () => {
      const r = await previewExerciseImportAction(groupId, t);
      if (!r.ok) return setError(r.error);
      setRows(r.data);
    });
  };
  const add = () =>
    start(async () => {
      setError(null);
      const r = await importExercisesAction(groupId, text);
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      router.replace(listHref);
    });

  const fresh = rows?.filter((r) => r.status === "ny").length ?? 0;
  const changes = rows?.filter((r) => r.status === "endring").length ?? 0;
  const what = [fresh ? (fresh === 1 ? "én øvelse" : `${fresh} øvelser`) : "", changes ? (changes === 1 ? "ett forslag" : `${changes} forslag`) : ""].filter(Boolean).join(" og ");
  return (
    <div className="nm-form" style={{ maxWidth: 720 }} aria-busy={pending}>
      <p style={{ marginTop: 0 }}>
        Last opp en JSON-fil med øvelser. Du ser først hva som blir lagt inn. Øvelser som finnes fra før, ligner for mye på en i banken eller har feil, hoppes over. Nye øvelser kommer inn som
        kandidater. Endringer i øvelser som finnes, blir forslag i Forbedringer, der dere bruker eller avviser dem.
      </p>
      <p className="nm-hint">
        Fila har formen <code>{"{ \"ovelser\": [ … ] }"}</code> med de samme feltene som skjemaet for en øvelse. En endring har <code>code</code> (øvelsens kode), bare feltene som endres, og
        gjerne <code>begrunnelse</code>. Øvelsene blir en del av banken og deles under samme lisens som den.
      </p>
      <label className="nm-btn nm-btn--secondary" style={{ alignSelf: "flex-start" }}>
        <Icon icon={FileUp} />
        {file ? "Velg en annen fil" : "Velg fil"}
        <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {file ? <p className="nm-hint">Fil: {file}</p> : null}
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      {rows ? (
        <>
          <p role="status">
            {rows.length} øvelser i fila, {fresh} blir lagt inn{changes ? `, ${changes} blir forslag` : ""}.
          </p>
          <ul className="nm-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((r) => {
              const s = STATUS[r.status];
              return (
                <li key={r.no} className="nm-pick">
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                    {r.note ? <div className="nm-hint">{r.note}</div> : null}
                  </div>
                  <span className={`nm-badge ${s.badge}`}>
                    <Icon icon={s.icon} />
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
          <button type="button" className="nm-btn nm-btn--primary" disabled={pending || !(fresh + changes)} onClick={add} style={{ alignSelf: "flex-start" }}>
            <Icon icon={Upload} />
            {what ? `Legg inn ${what}` : "Ingenting å legge inn"}
          </button>
        </>
      ) : null}
    </div>
  );
}

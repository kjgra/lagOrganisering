"use client";

import { AlertTriangle, MapPin, Pencil, Undo2 } from "lucide-react";
import { useState } from "react";
import { setEventPitchesAction } from "@/app/actions/pitches";
import { SaveButton, useSave } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { PitchTree } from "@/components/training/PitchTree";
import type { PitchGroup } from "@/lib/plans/plan";

/**
 * The pitches for a training on the event page: the weekday's fixed ones, or
 * the training's own. Without fixed pitches (or after they ended) the trainer
 * is asked to choose.
 */
export function EventPitches({
  groupId,
  eventId,
  groups,
  chosen,
  chosenNames,
  source,
  sourceText,
  warning,
  fixedNames,
  canEdit,
}: {
  groupId: string;
  eventId: string;
  /** All the pitches at the facility, by main pitch. */
  groups: PitchGroup[];
  chosen: number[];
  /** Names of the chosen pitches, «Ikke valgt» when none. */
  chosenNames: string;
  source: "event" | "fixed" | "none";
  /** «fast for mandager», «endret for denne treningen» */
  sourceText: string;
  /** «De faste banene for mandager sluttet 31. mar.» when the trainer should choose. */
  warning: string | null;
  /** The fixed pitches, when the training has its own instead. */
  fixedNames: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [ids, setIds] = useState(chosen);
  const { pending, run, errorBox } = useSave();

  return (
    <div style={{ marginTop: "var(--space-2)" }}>
      <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", gap: "var(--space-1)", alignItems: "flex-start" }}>
          <Icon icon={MapPin} size={18} />
          <span>
            <strong>Bane:</strong> {chosenNames}
            {sourceText ? <span className="nm-muted"> · {sourceText}</span> : null}
          </span>
        </span>
        {canEdit && !editing ? (
          <button
            type="button"
            className="nm-btn nm-btn--ghost"
            onClick={() => {
              setIds(chosen);
              setEditing(true);
            }}
          >
            <Icon icon={Pencil} />
            {source === "none" ? "Velg baner" : "Endre for denne treningen"}
          </button>
        ) : null}
      </div>
      {warning && !editing ? (
        <div className="nm-note" role="status" style={{ marginTop: "var(--space-2)" }}>
          <Icon icon={AlertTriangle} />
          <span>{warning}</span>
        </div>
      ) : null}
      {editing ? (
        <form
          className="nm-form nm-card"
          style={{ marginTop: "var(--space-2)", maxWidth: 520, padding: "var(--space-3)" }}
          aria-label="Baner for denne treningen"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => setEventPitchesAction(groupId, eventId, ids), () => setEditing(false));
          }}
        >
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="nm-field__label">Baner for denne treningen</legend>
            {fixedNames !== null ? <p className="nm-hint" style={{ margin: "0 0 var(--space-2)" }}>Faste baner: {fixedNames}. Endringen gjelder bare denne treningen.</p> : null}
            <PitchTree groups={groups} label="Baner" value={ids} onChange={setIds} />
          </fieldset>
          {errorBox}
          <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
            <SaveButton pending={pending}>Lagre baner</SaveButton>
            {source === "event" ? (
              <button type="button" className="nm-btn nm-btn--ghost" disabled={pending} onClick={() => run(() => setEventPitchesAction(groupId, eventId, []), () => setEditing(false))}>
                <Icon icon={Undo2} />
                {fixedNames !== null ? "Bruk de faste banene" : "Fjern valget"}
              </button>
            ) : null}
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setEditing(false)}>
              Avbryt
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

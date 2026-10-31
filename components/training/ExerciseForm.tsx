"use client";

import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteExerciseAction, saveExerciseAction } from "@/app/actions/training";
import { DrawingSvg } from "@/components/plans/DrawingSvg";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { NffTagger } from "@/components/training/NffTagger";
import { checkDrawing, DrawingError, EXAMPLE_DRAWING, fixDrawing, prettyDrawing, validateDrawing, type Drawing } from "@/lib/plans/drawing";
import type { ExerciseValues } from "@/lib/plans/exercise-values";

export type { ExerciseValues };

function preview(json: string): { drawing: Drawing | null; error: string; warnings: string[] } {
  if (!json.trim()) return { drawing: null, error: "", warnings: [] };
  try {
    const d = validateDrawing(json);
    if (!d) return { drawing: null, error: "", warnings: [] };
    const fixed = fixDrawing(d);
    return { drawing: fixed, error: "", warnings: checkDrawing(fixed).map((p) => p.melding) };
  } catch (err) {
    return { drawing: null, error: err instanceof DrawingError ? err.message : "Ugyldig JSON.", warnings: [] };
  }
}

/** Create or change an exercise in the bank (any trainer; only admins delete), with the drawing as JSON and a live preview. */
export function ExerciseForm(p: {
  groupId: string;
  id: number | null;
  initial: ExerciseValues;
  categories: Record<string, string>;
  statuses: Record<string, string>;
  listHref: string;
  /** Admins may delete an exercise, after «Er du sikker?». */
  canDelete: boolean;
  /** KI's version («Juster med KI»), so what the trainer changes in it is logged. */
  kiDraft?: ExerciseValues;
  /** A proposal from «Forbedringer» being changed before it is used. */
  proposalId?: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState(p.initial);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const set = (k: keyof ExerciseValues) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  type TextKey = { [K in keyof ExerciseValues]: ExerciseValues[K] extends string ? K : never }[keyof ExerciseValues];
  const pv = useMemo(() => preview(v.drawing), [v.drawing]);

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveExerciseAction(p.groupId, p.id, { ...v, themes: v.themes.split(",").map((t) => t.trim()).filter(Boolean) }, p.kiDraft, p.proposalId);
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      router.push(p.listHref);
    });
  const remove = () =>
    start(async () => {
      if (!p.id) return;
      const r = await deleteExerciseAction(p.groupId, p.id);
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      router.push(p.listHref);
    });

  const text = (k: TextKey, label: string, hint?: string, rows = 4) => (
    <label className="nm-field">
      <span className="nm-field__label">{label}</span>
      <textarea className="nm-input" rows={rows} value={v[k]} onChange={set(k)} />
      {hint ? <span className="nm-hint">{hint}</span> : null}
    </label>
  );

  return (
    <form
      className="nm-form"
      style={{ maxWidth: 760 }}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label className="nm-field">
        <span className="nm-field__label">Navn</span>
        <input className="nm-input" value={v.name} maxLength={80} required onChange={set("name")} />
      </label>
      <div className="nm-form-row">
        <label className="nm-field">
          <span className="nm-field__label">Kategori</span>
          <select className="nm-input" value={v.category} onChange={set("category")}>
            <option value="">Velg</option>
            {Object.entries(p.categories).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="nm-field">
          <span className="nm-field__label">Status</span>
          <select className="nm-input" value={v.status} onChange={set("status")}>
            {Object.entries(p.statuses).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="nm-field">
        <span className="nm-field__label">Temaer</span>
        <input className="nm-input" value={v.themes} onChange={set("themes")} />
        <span className="nm-hint">Kommaseparert, f.eks. Samhandling, Avslutning</span>
      </label>
      <div className="nm-form-row">
        <label className="nm-field">
          <span className="nm-field__label">Min. spillere</span>
          <input className="nm-input" inputMode="numeric" value={v.min_players} onChange={set("min_players")} />
        </label>
        <label className="nm-field">
          <span className="nm-field__label">Maks spillere</span>
          <input className="nm-input" inputMode="numeric" value={v.max_players} onChange={set("max_players")} />
        </label>
        <label className="nm-field">
          <span className="nm-field__label">Tid (min)</span>
          <input className="nm-input" inputMode="numeric" value={v.duration_minutes} onChange={set("duration_minutes")} />
        </label>
        <label className="nm-field">
          <span className="nm-field__label">Område</span>
          <input className="nm-input" value={v.area} maxLength={60} onChange={set("area")} />
        </label>
      </div>
      <NffTagger value={{ bands: v.bands, nff_activity: v.nff_activity, nff_tags: v.nff_tags }} onChange={(n) => setV((x) => ({ ...x, ...n }))} />
      {text("organisation", "Organisering", "Én ting per linje")}
      {text("execution", "Gjennomføring", "Én ting per linje")}
      {text("learning_points", "Læringsmomenter", "Én ting per linje")}
      {text("questions", "Spørsmål til spillerne", "Ett spørsmål per linje")}
      <div className="nm-form-row">
        {text("easier", "Enklere", undefined, 2)}
        {text("harder", "Vanskeligere", undefined, 2)}
      </div>
      <label className="nm-field">
        <span className="nm-field__label">Lenke til kilde</span>
        <input className="nm-input" type="url" value={v.nff_url} placeholder="https://www.tiim.no/…" onChange={set("nff_url")} />
      </label>

      <div className="nm-field">
        <label className="nm-field__label" htmlFor="drawing-json">
          Tegning (JSON)
        </label>
        <textarea id="drawing-json" className="nm-input" rows={10} style={{ fontFamily: "ui-monospace, monospace", fontSize: "var(--fs-caption)" }} value={v.drawing} onChange={set("drawing")} spellCheck={false} />
        <div className="nm-row" style={{ gap: "var(--space-2)" }}>
          <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setV((x) => ({ ...x, drawing: prettyDrawing(validateDrawing(EXAMPLE_DRAWING)) }))}>
            Sett inn eksempel
          </button>
          {v.drawing ? (
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setV((x) => ({ ...x, drawing: "" }))}>
              Fjern tegningen
            </button>
          ) : null}
        </div>
        {pv.error ? (
          <div className="nm-alert" role="alert">
            Tegning: {pv.error}
          </div>
        ) : null}
        {pv.warnings.length ? <p className="nm-hint">Merk: {pv.warnings.join(" ")}</p> : null}
        {pv.drawing ? <DrawingSvg drawing={pv.drawing} title="Forhåndsvisning av tegningen" /> : null}
      </div>

      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      <div className="nm-row" style={{ gap: "var(--space-2)" }}>
        <button type="submit" className="nm-btn nm-btn--primary" disabled={pending}>
          <Icon icon={Save} />
          Lagre øvelsen
        </button>
        {p.id && p.canDelete ? (
          confirm ? (
            <>
              <span role="alert" style={{ alignSelf: "center" }}>
                Er du sikker? Øvelsen slettes for godt fra banken.
              </span>
              <button type="button" className="nm-btn nm-btn--danger" disabled={pending} onClick={remove}>
                Ja, slett
              </button>
              <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setConfirm(false)}>
                Avbryt
              </button>
            </>
          ) : (
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setConfirm(true)}>
              <Icon icon={Trash2} />
              Slett
            </button>
          )
        ) : null}
      </div>
    </form>
  );
}

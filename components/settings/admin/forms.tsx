"use client";

import { Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { learningKiAction, saveAiSettingsAction, saveLearningAction, saveSeasonAction, saveTeamSettingsAction } from "@/app/actions/admin";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/actions";

/** Run an action with an error line and a toast. */
function useSave() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (f: () => Promise<ActionResult<unknown>>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await f();
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      after?.();
    });
  const errorBox = error ? (
    <div className="nm-alert" role="alert">
      {error}
    </div>
  ) : null;
  return { pending, run, errorBox };
}

function SaveButton({ pending, children = "Lagre" }: { pending: boolean; children?: ReactNode }) {
  return (
    <div>
      <button type="submit" className="nm-btn nm-btn--primary" disabled={pending}>
        <Icon icon={Save} />
        {children}
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="nm-field">
      <span className="nm-field__label">{label}</span>
      {children}
      {hint ? <span className="nm-hint">{hint}</span> : null}
    </label>
  );
}

// KI settings (superadmin) ------------------------------------------------------------------

export function AiSettingsForm({ initial, models, editable }: { initial: Record<string, string>; models: { id: string; label: string }[]; editable: boolean }) {
  const [v, setV] = useState(initial);
  const { pending, run, errorBox } = useSave();
  const set = (k: string) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      className="nm-form"
      style={{ maxWidth: 560 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveAiSettingsAction(v));
      }}
    >
      <fieldset disabled={!editable || pending} className="nm-form" style={{ border: 0, padding: 0, margin: 0 }}>
        <Field label="Standardmodell">
          <select className="nm-input" value={v.model} onChange={set("model")}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="nm-form-row">
          <Field label="Grense per lag (kr/mnd)">
            <input className="nm-input" inputMode="decimal" value={v.group_limit_nok} onChange={set("group_limit_nok")} />
          </Field>
          <Field label="Grense totalt (USD/mnd)">
            <input className="nm-input" inputMode="decimal" value={v.total_limit_usd} onChange={set("total_limit_usd")} />
          </Field>
          <Field label="Maks nye øvelser per opplegg">
            <input className="nm-input" inputMode="numeric" value={v.max_new_exercises} onChange={set("max_new_exercises")} />
          </Field>
          <Field label="Dollarkurs (kr)">
            <input className="nm-input" inputMode="decimal" value={v.usd_nok} onChange={set("usd_nok")} />
          </Field>
        </div>
        <Field label="Nettsteder KI kan hente lenker fra" hint="Kommaseparert, f.eks. tiim.no, fotball.no">
          <input className="nm-input" value={v.link_domains} onChange={set("link_domains")} />
        </Field>
      </fieldset>
      {errorBox}
      {editable ? <SaveButton pending={pending} /> : <p className="nm-hint">Bare superadmin kan endre KI-innstillingene.</p>}
    </form>
  );
}

// Season plan ------------------------------------------------------------------------------

export function SeasonForm({ groupId, year, months, themes, descriptions }: { groupId: string; year: number; months: string[]; themes: string[]; descriptions: string[] }) {
  const [t, setT] = useState(themes);
  const [dsc, setD] = useState(descriptions);
  const { pending, run, errorBox } = useSave();
  return (
    <form
      className="nm-form"
      style={{ maxWidth: 720 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSeasonAction(groupId, year, t, dsc));
      }}
    >
      {months.map((m, i) => (
        <div key={m} className="nm-form-row" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)" }}>
          <Field label={m}>
            <input className="nm-input" value={t[i]} maxLength={80} placeholder="Tema" onChange={(e) => setT((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />
          </Field>
          <Field label="Beskrivelse">
            <input className="nm-input" value={dsc[i]} maxLength={500} onChange={(e) => setD((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />
          </Field>
        </div>
      ))}
      {errorBox}
      <SaveButton pending={pending}>Lagre årshjulet</SaveButton>
    </form>
  );
}

// Team settings -----------------------------------------------------------------------------

export interface PitchOption {
  id: number;
  /** Below the main pitch: 0 for the main pitch itself. */
  depth: number;
  name: string;
  /** «7er · Kunstgress … · 48 × 30 m · lys 150 lux» */
  facts: string;
}

/** A main pitch with its sub-pitches, as one foldable group. */
export interface PitchGroup {
  title: string;
  pitches: PitchOption[];
}

export function TeamSettingsForm({ groupId, initial, pitchGroups, initialPitches }: { groupId: string; initial: Record<string, string>; pitchGroups: PitchGroup[]; initialPitches: number[] }) {
  const [v, setV] = useState(initial);
  const [chosen, setChosen] = useState(initialPitches);
  const { pending, run, errorBox } = useSave();
  const set = (k: string) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const all = pitchGroups.flatMap((g) => g.pitches);
  return (
    <form
      className="nm-form"
      style={{ maxWidth: 640 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveTeamSettingsAction(groupId, v, chosen));
      }}
    >
      <div className="nm-form-row">
        <Field label="Aldersgruppe" hint="F.eks. G10">
          <input className="nm-input" value={v.age_group} maxLength={40} onChange={set("age_group")} />
        </Field>
        <Field label="Øktlengde (min)">
          <input className="nm-input" inputMode="numeric" value={v.session_minutes} onChange={set("session_minutes")} />
        </Field>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="nm-field__label" style={{ marginBottom: "var(--space-1)" }}>
          Baner
        </legend>
        <p className="nm-hint" style={{ margin: "0 0 var(--space-2)" }}>
          {chosen.length
            ? `Valgt: ${all
                .filter((p) => chosen.includes(p.id))
                .map((p) => p.name)
                .join(", ")}. For hver trening velger dere blant disse når KI lager opplegget.`
            : "Velg banene laget bruker. For hver trening velger dere blant disse når KI lager opplegget."}
        </p>
        {pitchGroups.map((g) => (
          <details key={g.title} className="nm-exercise" open={g.pitches.some((p) => initialPitches.includes(p.id))}>
            <summary style={{ cursor: "pointer", minHeight: "var(--touch-min)", display: "flex", alignItems: "center", fontWeight: 700 }}>
              {g.title}
              {g.pitches.some((p) => chosen.includes(p.id)) ? ` (${g.pitches.filter((p) => chosen.includes(p.id)).length} valgt)` : ""}
            </summary>
            {g.pitches.map((p) => (
              <label key={p.id} className="nm-check" style={{ paddingLeft: `calc(var(--space-4) * ${p.depth})` }}>
                <input
                  type="checkbox"
                  checked={chosen.includes(p.id)}
                  onChange={(e) => setChosen((x) => (e.target.checked ? [...x, p.id] : x.filter((y) => y !== p.id)))}
                />
                <span>
                  {p.name}
                  <span className="nm-hint" style={{ display: "block" }}>
                    {p.facts}
                  </span>
                </span>
              </label>
            ))}
          </details>
        ))}
      </fieldset>
      <Field label="Merknad om baner" hint="F.eks. «deler banen med G12 på tirsdager».">
        <input className="nm-input" value={v.pitch} maxLength={200} onChange={set("pitch")} />
      </Field>
      <Field label="Utstyr">
        <textarea className="nm-input" value={v.equipment} maxLength={1000} onChange={set("equipment")} />
      </Field>
      <Field label="Prinsipper" hint="Hvordan laget trener: brukes av KI og som påminnelse for trenerne.">
        <textarea className="nm-input" value={v.principles} maxLength={2000} onChange={set("principles")} />
      </Field>
      {errorBox}
      <SaveButton pending={pending} />
    </form>
  );
}

// Learnings ---------------------------------------------------------------------------------

export function LearningForm({ groupId, initial, canKi, nNew }: { groupId: string; initial: string; canKi: boolean; nNew: number }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const { pending, run, errorBox } = useSave();
  return (
    <form
      className="nm-form"
      style={{ maxWidth: 720 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveLearningAction(groupId, text));
      }}
    >
      <Field label="Lærdommer" hint="Det laget har lært om hva som fungerer. Brukes av KI når den lager opplegg. Ingen navn.">
        <textarea className="nm-input" style={{ minHeight: 220 }} value={text} maxLength={3000} onChange={(e) => setText(e.target.value)} />
      </Field>
      {errorBox}
      <div className="nm-row" style={{ gap: "var(--space-2)" }}>
        <button type="submit" className="nm-btn nm-btn--primary" disabled={pending}>
          <Icon icon={Save} />
          Lagre
        </button>
        {canKi ? (
          <button type="button" className="nm-btn nm-btn--secondary" disabled={pending || nNew === 0} onClick={() => run(() => learningKiAction(groupId, text), () => router.refresh())}>
            <Icon icon={Sparkles} />
            Oppdater med KI
          </button>
        ) : null}
      </div>
      {canKi ? (
        <p className="nm-hint" style={{ margin: 0 }}>
          {nNew ? `${nNew} nye evalueringer siden lærdommene sist ble oppdatert med KI.` : "Ingen nye evalueringer siden sist."}
        </p>
      ) : null}
    </form>
  );
}

"use client";

import { Undo2, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { followMainGroupAction, learningKiAction, savePrinciplesAction, saveLearningAction, saveSeasonAction, saveTeamSettingsAction } from "@/app/actions/training";
import { Field, SaveButton, useSave } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { GENDERS, teamAgeText, type Gender } from "@/lib/nff/bands";

// Season plan ------------------------------------------------------------------------------

export function SeasonForm({
  groupId,
  sub,
  year,
  months,
  themes,
  descriptions,
  current,
}: {
  groupId: string;
  sub: string;
  year: number;
  months: string[];
  themes: string[];
  descriptions: string[];
  /** This month (1–12) when the year shown is this year: it comes first, and the months before it are folded away. */
  current?: number;
}) {
  const [t, setT] = useState(themes);
  const [dsc, setD] = useState(descriptions);
  const { pending, run, errorBox } = useSave();
  const card = (i: number) => (
    <fieldset key={months[i]} className="nm-card nm-month">
      <legend className="nm-month__name">
        {months[i]}
        {current === i + 1 ? <span className="nm-badge nm-badge--neutral">Denne måneden</span> : null}
      </legend>
      <Field label="Tema">
        <input className="nm-input" value={t[i]} maxLength={80} onChange={(e) => setT((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />
      </Field>
      <Field label="Beskrivelse">
        <textarea className="nm-input" rows={2} value={dsc[i]} maxLength={500} onChange={(e) => setD((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />
      </Field>
    </fieldset>
  );
  const first = current ? current - 1 : 0;
  const idx = months.map((_, i) => i);
  return (
    <form
      className="nm-form"
      style={{ maxWidth: 720 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSeasonAction(groupId, sub, year, t, dsc));
      }}
    >
      {idx.slice(first).map(card)}
      {first ? (
        <details className="nm-month-past">
          <summary>
            Tidligere måneder ({months[0].toLowerCase()}–{months[first - 1].toLowerCase()})
          </summary>
          <div className="nm-form">{idx.slice(0, first).map(card)}</div>
        </details>
      ) : null}
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

export function TeamSettingsForm({
  groupId,
  sub,
  initial,
  pitchGroups,
  initialPitches,
  year,
}: {
  groupId: string;
  sub: string;
  initial: Record<string, string>;
  pitchGroups: PitchGroup[];
  initialPitches: number[];
  /** The season year (Oslo), for the team's age. */
  year: number;
}) {
  const [v, setV] = useState(initial);
  const [chosen, setChosen] = useState(initialPitches);
  const { pending, run, errorBox } = useSave();
  const set = (k: string) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const all = pitchGroups.flatMap((g) => g.pitches);
  const by = /^\d{4}$/.test(v.birth_year.trim()) ? Number(v.birth_year) : null;
  const ageHint =
    by !== null
      ? `${teamAgeText(by, (v.gender || null) as Gender | null, year)} i ${year}.`
      : v.age_group
        ? `Tidligere: «${v.age_group}». Fyll inn fødselsåret, så følger alder og NFF-bånd med hvert år.`
        : "Alder og NFF-bånd regnes ut hvert år.";
  return (
    <form
      className="nm-form"
      style={{ maxWidth: 640 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveTeamSettingsAction(groupId, sub, v, chosen));
      }}
    >
      <div className="nm-form-row">
        <Field label="Fødselsår" hint={ageHint}>
          <input className="nm-input" inputMode="numeric" maxLength={4} value={v.birth_year} onChange={set("birth_year")} />
        </Field>
        <Field label="Kjønn">
          <select className="nm-input" value={v.gender} onChange={set("gender")}>
            <option value="">Ikke valgt</option>
            {Object.entries(GENDERS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
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
      {errorBox}
      <SaveButton pending={pending} />
    </form>
  );
}

// Principles ------------------------------------------------------------------------------

export function PrinciplesForm({ groupId, sub, initial }: { groupId: string; sub: string; initial: string }) {
  const [text, setText] = useState(initial);
  const { pending, run, errorBox } = useSave();
  return (
    <form
      className="nm-form"
      style={{ maxWidth: 720 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => savePrinciplesAction(groupId, sub, text));
      }}
    >
      <Field label="Prinsipper" hint="Måter dere vil gjøre ting på, uansett øvelse. Skrives av trenerne, og KI endrer dem aldri.">
        <textarea className="nm-input" style={{ minHeight: 160 }} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} />
      </Field>
      {errorBox}
      <SaveButton pending={pending}>Lagre prinsippene</SaveButton>
    </form>
  );
}

// Learnings ---------------------------------------------------------------------------------

export function LearningForm({ groupId, sub, initial, canKi, nNew }: { groupId: string; sub: string; initial: string; canKi: boolean; nNew: number }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const { pending, run, errorBox } = useSave();
  return (
    <form
      className="nm-form"
      style={{ maxWidth: 720 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveLearningAction(groupId, sub, text));
      }}
    >
      <Field label="Lærdommer" hint="Det laget har lært av evalueringene. «Oppdater med KI» skriver dem om ut fra nye evalueringer. Ingen navn.">
        <textarea className="nm-input" style={{ minHeight: 220 }} value={text} maxLength={3000} onChange={(e) => setText(e.target.value)} />
      </Field>
      {errorBox}
      <div className="nm-row" style={{ gap: "var(--space-2)" }}>
        <button type="submit" className="nm-btn nm-btn--primary" disabled={pending}>
          <Icon icon={Save} />
          Lagre lærdommene
        </button>
        {canKi ? (
          <button type="button" className="nm-btn nm-btn--secondary" disabled={pending || nNew === 0} onClick={() => run(() => learningKiAction(groupId, sub, text), () => router.refresh())}>
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

// A subgroup's own, or the main group's -------------------------------------------------------

/**
 * Whose this page is: the main group's (the default for its teams), the
 * main group's inherited by a subgroup, or the subgroup's own, with a way back
 * to the main group's after «Er du sikker?».
 */
export function ScopeNote({
  groupId,
  sub,
  subName,
  mainName,
  inherited,
  part,
  year,
}: {
  groupId: string;
  sub: string;
  subName: string;
  mainName: string;
  inherited: boolean;
  part: "season" | "team" | "principles" | "learnings";
  year?: number;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const { pending, run, errorBox } = useSave();
  if (!sub) return <p className="nm-hint" style={{ margin: "0 0 var(--space-3)" }}>Gjelder {mainName}, og er standard for lagene som ikke har sitt eget.</p>;
  if (inherited) return <p className="nm-hint" style={{ margin: "0 0 var(--space-3)" }}>{subName} følger {mainName}. Lagrer du, får {subName} sitt eget.</p>;
  return (
    <div style={{ margin: "0 0 var(--space-3)" }}>
      <p className="nm-hint" style={{ margin: 0 }}>
        Eget for {subName}. Endringer i {mainName} gjelder ikke her.
      </p>
      {confirm ? (
        <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
          <span role="alert" style={{ alignSelf: "center" }}>
            Er du sikker? Det {subName} har skrevet her, slettes.
          </span>
          <button
            type="button"
            className="nm-btn nm-btn--danger"
            disabled={pending}
            onClick={() => run(() => followMainGroupAction(groupId, sub, part, year), () => (setConfirm(false), router.refresh()))}
          >
            Ja, følg {mainName}
          </button>
          <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setConfirm(false)}>
            Avbryt
          </button>
        </div>
      ) : (
        <button type="button" className="nm-btn nm-btn--ghost" style={{ marginTop: "var(--space-1)" }} onClick={() => setConfirm(true)}>
          <Icon icon={Undo2} />
          Følg {mainName} igjen
        </button>
      )}
      {errorBox}
    </div>
  );
}

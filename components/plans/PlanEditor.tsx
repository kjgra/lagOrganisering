"use client";

import { ArrowDown, ArrowUp, Plus, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { savePlanAction } from "@/app/actions/plans";
import { DraftNote, LeaveGuard, useLocalDraft } from "@/components/ui/draft";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { PlanSettings } from "@/lib/plans/plan";

export interface EditorExercise {
  key: string;
  ref: { bank: string } | { keep: number };
  name: string;
  category: string;
  note: string;
}

const num = (s: string, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(s) || 0)));

/** Put a plan together from the bank (or change a version, or copy an earlier session's plan): exercises in order, times and texts. */
export function PlanEditor(props: {
  groupId: string;
  eventId: string;
  baseId: number | null;
  /** The base is from an earlier event: saved here as a new plan. */
  copy?: boolean;
  initial: PlanSettings;
  chosen: EditorExercise[];
  bank: EditorExercise[];
  doneHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [s, setS] = useState<PlanSettings>(props.initial);
  const [list, setList] = useState<EditorExercise[]>(props.chosen);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bankOpen, setBankOpen] = useState(!props.chosen.length);
  const set = <K extends keyof PlanSettings>(k: K, v: PlanSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const [saved, setSaved] = useState(false);
  const [initial] = useState(() => JSON.stringify({ s: props.initial, list: props.chosen }));
  const value = useMemo(() => ({ s, list }), [s, list]);
  const dirty = !saved && JSON.stringify(value) !== initial;
  const draft = useLocalDraft(`nm-plan:${props.groupId}:${props.eventId}:${props.baseId ?? "ny"}`, value, dirty);
  const restore = () => {
    const v = draft.saved?.value;
    if (!v) return;
    setS({ ...props.initial, ...v.s });
    setList(v.list.filter((x) => props.bank.some((b) => b.key === x.key) || props.chosen.some((c) => c.key === x.key)));
    draft.dismiss();
  };

  const total = useMemo(() => {
    const n = list.length;
    return s.oppvarming + n * s.stasjon + Math.max(0, n - 1) * (n > 1 ? s.bytte : 0) + s.avslutning;
  }, [list.length, s]);
  const filtered = props.bank.filter((b) => !list.some((x) => x.key === b.key) && (!query || `${b.name} ${b.category}`.toLowerCase().includes(query.toLowerCase())));
  const move = (i: number, d: number) =>
    setList((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const save = () =>
    start(async () => {
      setError(null);
      const r = await savePlanAction({ groupId: props.groupId, eventId: props.eventId, baseId: props.baseId, exercises: list.map((x) => x.ref), settings: s });
      if (!r.ok) return setError(r.error);
      setSaved(true);
      draft.clear();
      if (r.message) toast(r.message);
      router.push(`${props.doneHref}?opplegg=${r.data.id}#plan-h`);
    });

  const minutes = (k: "oppvarming" | "stasjon" | "bytte" | "avslutning", label: string, lo: number, hi: number) => (
    <label className="nm-field">
      <span className="nm-field__label">{label}</span>
      <input className="nm-input" type="number" inputMode="numeric" min={lo} max={hi} value={s[k]} onChange={(e) => set(k, num(e.target.value, lo, hi))} />
    </label>
  );

  return (
    <form
      className="nm-form"
      style={{ maxWidth: 720 }}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {draft.saved ? <DraftNote at={draft.saved.at} onRestore={restore} onDiscard={draft.clear} /> : null}
      <LeaveGuard when={dirty && !pending} text="Endringene i opplegget er ikke lagret. De ligger som kladd på denne enheten, så du kan fortsette senere." />
      <label className="nm-field">
        <span className="nm-field__label">Tittel</span>
        <input className="nm-input" value={s.tittel} maxLength={120} required onChange={(e) => set("tittel", e.target.value)} />
      </label>
      <label className="nm-field">
        <span className="nm-field__label">Tema</span>
        <input className="nm-input" value={s.tema} maxLength={80} onChange={(e) => set("tema", e.target.value)} />
      </label>

      <section className="nm-stack" style={{ gap: "var(--space-1)" }} aria-labelledby="ov-h">
        <h2 className="nm-section-label" id="ov-h" style={{ marginTop: "var(--space-2)" }}>
          Øvelser ({list.length})
        </h2>
        {list.length ? null : <p className="nm-muted" style={{ margin: 0 }}>Velg øvelser fra banken under.</p>}
        {list.map((x, i) => (
          <div key={x.key} className="nm-pick">
            <div>
              <strong>
                {i + 1}. {x.name}
              </strong>
              <div className="nm-hint">
                {x.category}
                {x.note ? ` · ${x.note}` : ""}
              </div>
            </div>
            <button type="button" className="nm-iconbtn" aria-label={`Flytt ${x.name} opp`} disabled={i === 0} onClick={() => move(i, -1)}>
              <Icon icon={ArrowUp} />
            </button>
            <button type="button" className="nm-iconbtn" aria-label={`Flytt ${x.name} ned`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>
              <Icon icon={ArrowDown} />
            </button>
            <button type="button" className="nm-iconbtn" aria-label={`Fjern ${x.name}`} onClick={() => setList((l) => l.filter((y) => y.key !== x.key))}>
              <Icon icon={X} />
            </button>
          </div>
        ))}
      </section>

      <details open={bankOpen} onToggle={(e) => setBankOpen(e.currentTarget.open)}>
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: "var(--fs-body-lg)", minHeight: 32 }}>Øvelsesbanken ({props.bank.length})</summary>
        <label className="nm-sr" htmlFor="bank-q">
          Søk i øvelsesbanken
        </label>
        <input id="bank-q" className="nm-input" style={{ margin: "var(--space-2) 0" }} placeholder="Søk" value={query} onChange={(e) => setQuery(e.target.value)} />
        {filtered.map((b) => (
          <div key={b.key} className="nm-pick">
            <div>
              <strong>{b.name}</strong>
              <div className="nm-hint">
                {b.category}
                {b.note ? ` · ${b.note}` : ""}
              </div>
            </div>
            <button type="button" className="nm-btn nm-btn--secondary" disabled={list.length >= 8} onClick={() => setList((l) => [...l, b])}>
              <Icon icon={Plus} />
              Legg til
            </button>
          </div>
        ))}
        {!filtered.length ? <p className="nm-muted">Ingen flere øvelser.</p> : null}
      </details>

      <h2 className="nm-section-label" style={{ marginTop: "var(--space-2)" }}>
        Tidsplan · ca. {total} min
      </h2>
      <div className="nm-form-row">
        {minutes("oppvarming", "Oppvarming (min)", 0, 60)}
        {minutes("stasjon", "Per øvelse (min)", 1, 60)}
        {minutes("bytte", "Bytte (min)", 0, 10)}
        {minutes("avslutning", "Avslutning (min)", 0, 60)}
      </div>
      <label className="nm-check">
        <input type="checkbox" checked={s.rotasjon} onChange={(e) => set("rotasjon", e.target.checked)} />
        <span>
          Stasjoner med rotasjon
          <span className="nm-hint" style={{ display: "block" }}>
            Én gruppe per øvelse samtidig, og alle gruppene gjør alle øvelsene.
          </span>
        </span>
      </label>
      <label className="nm-field">
        <span className="nm-field__label">Oppvarming</span>
        <input className="nm-input" value={s.oppvarming_tekst} maxLength={300} onChange={(e) => set("oppvarming_tekst", e.target.value)} />
      </label>
      <label className="nm-field">
        <span className="nm-field__label">Avslutning</span>
        <input className="nm-input" value={s.avslutning_tekst} maxLength={300} onChange={(e) => set("avslutning_tekst", e.target.value)} />
      </label>

      <h2 className="nm-section-label" style={{ marginTop: "var(--space-2)" }}>
        Fokus og stikkord
      </h2>
      <label className="nm-field">
        <span className="nm-field__label">Forsvar</span>
        <input className="nm-input" value={s.forsvar} maxLength={300} onChange={(e) => set("forsvar", e.target.value)} />
      </label>
      <label className="nm-field">
        <span className="nm-field__label">Angrep</span>
        <input className="nm-input" value={s.angrep} maxLength={300} onChange={(e) => set("angrep", e.target.value)} />
      </label>
      {[0, 1, 2].map((i) => (
        <div key={i} className="nm-form-row">
          <label className="nm-field">
            <span className="nm-field__label">Stikkord {i + 1}</span>
            <input
              className="nm-input"
              value={s.stikkord[i]?.tittel ?? ""}
              maxLength={60}
              onChange={(e) => set("stikkord", Object.assign([...s.stikkord], { [i]: { tittel: e.target.value, tekst: s.stikkord[i]?.tekst ?? "" } }).map((k) => k ?? { tittel: "", tekst: "" }))}
            />
          </label>
          <label className="nm-field">
            <span className="nm-field__label">Forklaring</span>
            <input
              className="nm-input"
              value={s.stikkord[i]?.tekst ?? ""}
              maxLength={200}
              onChange={(e) => set("stikkord", Object.assign([...s.stikkord], { [i]: { tittel: s.stikkord[i]?.tittel ?? "", tekst: e.target.value } }).map((k) => k ?? { tittel: "", tekst: "" }))}
            />
          </label>
        </div>
      ))}
      <label className="nm-field">
        <span className="nm-field__label">Spørsmål til felles avslutning (ett per linje)</span>
        <textarea className="nm-input" value={s.sporsmal} maxLength={1500} onChange={(e) => set("sporsmal", e.target.value)} />
      </label>
      <label className="nm-field">
        <span className="nm-field__label">Merknad under tidsplanen</span>
        <textarea className="nm-input" style={{ minHeight: 72 }} value={s.merknad} maxLength={600} onChange={(e) => set("merknad", e.target.value)} />
      </label>

      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      <div>
        <button type="submit" className="nm-btn nm-btn--primary nm-btn--lg" disabled={pending || !list.length}>
          <Icon icon={Save} />
          {props.baseId && !props.copy ? "Lagre som ny versjon" : "Lagre opplegget"}
        </button>
      </div>
    </form>
  );
}

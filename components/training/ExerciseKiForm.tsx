"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { exerciseKiEstimateAction, exerciseKiRunAction } from "@/app/actions/training";
import { ModelFields, PitchFields } from "@/components/plans/KiFields";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

export interface ExerciseKiFormProps {
  groupId: string;
  theme: string;
  themeNote: string;
  categories: Record<string, string>;
  pitches: { id: number; name: string; facts: string }[];
  pitchNote: string;
  standardHref: string;
  models: { id: string; label: string; choice: string }[];
  model: string;
  domains: string[];
  budgetText: string;
  simulated: boolean;
  /** The new exercise opens at `${donePath}/${id}${doneQuery}`. */
  donePath: string;
  doneQuery: string;
}

/** «Ny øvelse med KI»: order one exercise for the bank, the same way as a session plan. */
export function ExerciseKiForm(p: ExerciseKiFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [theme, setTheme] = useState(p.theme);
  const [category, setCategory] = useState("");
  const [players, setPlayers] = useState("");
  const [minutes, setMinutes] = useState("");
  const [wish, setWish] = useState("");
  const [link, setLink] = useState("");
  const [model, setModel] = useState(p.model);
  const [pitchIds, setPitchIds] = useState<number[]>(p.pitches.length === 1 ? [p.pitches[0].id] : []);
  const [prices, setPrices] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const num = (x: string) => (x.trim() ? Math.round(Number(x)) : null);
  const input = () => ({ groupId: p.groupId, theme, category, players: num(players), minutes: num(minutes), wish, link, pitchIds, model });
  const estimate = () =>
    start(async () => {
      setError(null);
      const r = await exerciseKiEstimateAction(input());
      if (!r.ok) return setError(r.error);
      setPrices(r.data);
      if (!r.data) setError("Fikk ikke beregnet prisen nå, men du kan likevel starte.");
    });
  const run = () =>
    start(async () => {
      setError(null);
      setRunning(true);
      const r = await exerciseKiRunAction(input());
      setRunning(false);
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      router.push(`${p.donePath}/${r.data}${p.doneQuery}`);
    });

  return (
    <form
      className="nm-form"
      style={{ maxWidth: 720 }}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        run();
      }}
    >
      {p.simulated ? (
        <div className="nm-note">KI er simulert i dette miljøet: du får en eksempeløvelse, og ingenting sendes til Anthropic.</div>
      ) : null}
      <p style={{ margin: 0 }}>
        KI lager én øvelse ut fra temaet, lagets standard, øvelsesbanken og evalueringene. Øvelsen legges i banken som kandidat, og du kan se over og endre den før den brukes. Navn på spillere sendes aldri.
      </p>
      <label className="nm-field">
        <span className="nm-field__label">Tema</span>
        <input className="nm-input" value={theme} maxLength={80} onChange={(e) => setTheme(e.target.value)} />
        {p.themeNote ? <span className="nm-hint">{p.themeNote}</span> : null}
      </label>
      <label className="nm-field">
        <span className="nm-field__label">Kategori (valgfritt)</span>
        <select className="nm-input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">KI velger</option>
          {Object.entries(p.categories).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <div className="nm-form-row">
        <label className="nm-field">
          <span className="nm-field__label">Antall spillere</span>
          <input className="nm-input" type="number" inputMode="numeric" min={1} max={60} value={players} onChange={(e) => setPlayers(e.target.value)} />
          <span className="nm-hint">Valgfritt</span>
        </label>
        <label className="nm-field">
          <span className="nm-field__label">Tid (min)</span>
          <input className="nm-input" type="number" inputMode="numeric" min={1} max={120} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          <span className="nm-hint">Valgfritt</span>
        </label>
      </div>
      <PitchFields
        legend="Baner (valgfritt)"
        hint="Velg banene øvelsen skal få plass på. KI får med mål og lys."
        pitches={p.pitches}
        pitchNote={p.pitchNote}
        standardHref={p.standardHref}
        value={pitchIds}
        onChange={setPitchIds}
      />
      <label className="nm-field">
        <span className="nm-field__label">Ønsker (valgfritt)</span>
        <textarea className="nm-input" value={wish} maxLength={1000} placeholder="F.eks. 2 mot 1 med avslutning på småmål, lite kø" onChange={(e) => setWish(e.target.value)} />
        <span className="nm-hint">Ikke skriv navn eller helseopplysninger.</span>
      </label>
      <label className="nm-field">
        <span className="nm-field__label">Lenke til en øvelse (valgfritt)</span>
        <input className="nm-input" type="url" value={link} maxLength={600} placeholder="https://www.tiim.no/…" onChange={(e) => setLink(e.target.value)} />
        <span className="nm-hint">Tillatte nettsteder: {p.domains.join(", ")}</span>
      </label>
      <ModelFields models={p.models} value={model} onChange={setModel} prices={prices} onEstimate={estimate} pending={pending} budgetText={p.budgetText} />
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      {running ? (
        <div className="nm-note" role="status">
          KI jobber … Dette tar vanligvis under ett minutt. Ikke lukk siden.
        </div>
      ) : null}
      <div>
        <button type="submit" className="nm-btn nm-btn--primary nm-btn--lg" disabled={pending}>
          <Icon icon={Sparkles} />
          Lag øvelse med KI
        </button>
      </div>
    </form>
  );
}

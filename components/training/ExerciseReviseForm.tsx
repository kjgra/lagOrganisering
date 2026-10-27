"use client";

import { Pencil, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { exerciseReviseEstimateAction, exerciseReviseRunAction } from "@/app/actions/training";
import { ModelFields, PitchFields } from "@/components/plans/KiFields";
import { ExerciseForm, type ExerciseValues } from "@/components/training/ExerciseForm";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

export interface ExerciseReviseFormProps {
  groupId: string;
  /** The subgroup whose «Trening» is used, or '' for the main group. */
  sub: string;
  id: number;
  name: string;
  pitches: { id: number; name: string; facts: string }[];
  pitchNote: string;
  standardHref: string;
  models: { id: string; label: string; choice: string }[];
  model: string;
  domains: string[];
  budgetText: string;
  simulated: boolean;
  /** Manual edit of the same exercise. */
  manualHref: string;
  listHref: string;
  categories: Record<string, string>;
  statuses: Record<string, string>;
}

/**
 * «Juster med KI»: say what to change, and KI's version opens in the usual
 * exercise form. Nothing is saved until the trainer saves the form.
 */
export function ExerciseReviseForm(p: ExerciseReviseFormProps) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [wish, setWish] = useState("");
  const [players, setPlayers] = useState("");
  const [minutes, setMinutes] = useState("");
  const [link, setLink] = useState("");
  const [model, setModel] = useState(p.model);
  const [pitchIds, setPitchIds] = useState<number[]>([]);
  const [prices, setPrices] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ values: ExerciseValues; warnings: string[]; n: number } | null>(null);

  const num = (x: string) => (x.trim() ? Math.round(Number(x)) : null);
  const input = () => ({ groupId: p.groupId, sub: p.sub, id: p.id, players: num(players), minutes: num(minutes), wish, link, pitchIds, model });
  const estimate = () =>
    start(async () => {
      setError(null);
      const r = await exerciseReviseEstimateAction(input());
      if (!r.ok) return setError(r.error);
      setPrices(r.data);
      if (!r.data) setError("Fikk ikke beregnet prisen nå, men du kan likevel starte.");
    });
  const run = () =>
    start(async () => {
      setError(null);
      setRunning(true);
      const r = await exerciseReviseRunAction(input());
      setRunning(false);
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      setResult((x) => ({ ...r.data, n: (x?.n ?? 0) + 1 }));
    });

  if (result) {
    return (
      <>
        <div className="nm-note" role="status" style={{ maxWidth: 760, marginBottom: "var(--space-3)" }}>
          Dette er forslaget fra KI. Ingenting er lagret ennå: se over, endre om du vil, og trykk «Lagre øvelsen».
        </div>
        {result.warnings.length ? (
          <div className="nm-alert" role="alert" style={{ maxWidth: 760, marginBottom: "var(--space-3)" }}>
            Merk: {result.warnings.join(" ")}
          </div>
        ) : null}
        <div className="nm-row" style={{ gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          <button type="button" className="nm-btn nm-btn--secondary" onClick={() => setResult(null)}>
            <Icon icon={RotateCcw} />
            Juster på nytt
          </button>
        </div>
        <ExerciseForm
          key={result.n}
          groupId={p.groupId}
          id={p.id}
          initial={result.values}
          categories={p.categories}
          statuses={p.statuses}
          listHref={p.listHref}
          canDelete={false}
        />
      </>
    );
  }

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
        <div className="nm-note">KI er simulert i dette miljøet: du får et eksempel på en justering, og ingenting sendes til Anthropic.</div>
      ) : null}
      <p style={{ margin: 0 }}>
        KI justerer «{p.name}» etter det du skriver, og tar hensyn til lagets standard, banene og evalueringene. Du ser over forslaget før noe lagres. Navn på spillere sendes aldri.
      </p>
      <div>
        <Link href={p.manualHref} className="nm-btn nm-btn--ghost">
          <Icon icon={Pencil} />
          Endre manuelt i stedet
        </Link>
      </div>
      <label className="nm-field">
        <span className="nm-field__label">Hva skal endres?</span>
        <textarea
          className="nm-input"
          value={wish}
          maxLength={1000}
          placeholder="F.eks. gjør den enklere for de yngste, mindre kø, avslutning på småmål"
          onChange={(e) => setWish(e.target.value)}
        />
        <span className="nm-hint">Ikke skriv navn eller helseopplysninger.</span>
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
          Juster med KI
        </button>
      </div>
    </form>
  );
}

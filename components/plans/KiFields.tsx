"use client";

import Link from "next/link";

/** The team's pitches to choose from when ordering from KI. */
export function PitchFields(p: {
  legend: string;
  hint: string;
  pitches: { id: number; name: string; facts: string }[];
  pitchNote: string;
  standardHref: string | null;
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="nm-field__label" style={{ marginBottom: "var(--space-1)" }}>
        {p.legend}
      </legend>
      {p.pitches.map((x) => (
        <label key={x.id} className="nm-check">
          <input type="checkbox" checked={p.value.includes(x.id)} onChange={(e) => p.onChange(e.target.checked ? [...p.value, x.id] : p.value.filter((z) => z !== x.id))} />
          <span>
            {x.name}
            <span className="nm-hint" style={{ display: "block" }}>
              {x.facts}
            </span>
          </span>
        </label>
      ))}
      <p className="nm-hint" style={{ margin: 0 }}>
        {p.pitches.length ? (p.pitchNote ? `Merknad: ${p.pitchNote}` : p.hint) : "Laget har ingen baner under Trening › Laget ennå. "}
        {!p.pitches.length && p.standardHref ? (
          <Link href={p.standardHref} style={{ textDecoration: "underline" }}>
            Legg til baner
          </Link>
        ) : null}
      </p>
    </fieldset>
  );
}

/** The model choice with a price estimate per model and the team's budget. */
export function ModelFields(p: {
  models: { id: string; label: string; choice: string }[];
  value: string;
  onChange: (model: string) => void;
  prices: Record<string, string> | null;
  onEstimate: () => void;
  pending: boolean;
  budgetText: string;
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="nm-field__label" style={{ marginBottom: "var(--space-1)" }}>
        Modell
      </legend>
      {p.models.map((m) => (
        <label key={m.id} className="nm-check">
          <input type="radio" name="model" checked={p.value === m.id} onChange={() => p.onChange(m.id)} />
          <span>
            {m.choice} ({m.label})
            {p.prices?.[m.id] ? <span className="nm-hint" style={{ display: "block" }}>Pris: {p.prices[m.id]}</span> : null}
          </span>
        </label>
      ))}
      <button type="button" className="nm-btn nm-btn--ghost" onClick={p.onEstimate} disabled={p.pending}>
        Beregn pris
      </button>
      <p className="nm-hint" style={{ margin: "var(--space-1) 0 0" }}>
        {p.budgetText}
      </p>
    </fieldset>
  );
}

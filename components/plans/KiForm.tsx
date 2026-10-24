"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { kiEstimateAction, kiRunAction } from "@/app/actions/plans";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

export interface KiFormProps {
  groupId: string;
  eventId: string;
  baseId: number | null;
  baseVersion: number | null;
  theme: string;
  themeNote: string;
  minutes: number | null;
  /** The team's pitch from «Lagets standard», as KI gets it; empty if none. */
  pitch: string;
  models: { id: string; label: string; choice: string }[];
  model: string;
  comments: { id: number; text: string }[];
  domains: string[];
  budgetText: string;
  simulated: boolean;
  doneHref: string;
}

/** Order a plan from KI (or an adjustment of a version): theme, length, wishes, links and comments. */
export function KiForm(p: KiFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [theme, setTheme] = useState(p.theme);
  const [minutes, setMinutes] = useState(p.minutes ? String(p.minutes) : "");
  const [wish, setWish] = useState("");
  const [links, setLinks] = useState("");
  const [model, setModel] = useState(p.model);
  const [picked, setPicked] = useState<number[]>(p.comments.map((c) => c.id));
  const [prices, setPrices] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const input = () => ({
    groupId: p.groupId,
    eventId: p.eventId,
    baseId: p.baseId,
    theme,
    minutes: minutes ? Math.round(Number(minutes)) : null,
    wish,
    links,
    commentIds: picked,
    model,
  });
  const estimate = () =>
    start(async () => {
      setError(null);
      const r = await kiEstimateAction(input());
      if (!r.ok) return setError(r.error);
      setPrices(r.data);
      if (!r.data) setError("Fikk ikke beregnet prisen nå, men du kan likevel starte.");
    });
  const run = () =>
    start(async () => {
      setError(null);
      setRunning(true);
      const r = await kiRunAction(input());
      setRunning(false);
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      router.push(`${p.doneHref}?opplegg=${r.data.id}#plan-h`);
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
        <div className="nm-note">KI er simulert i dette miljøet: du får et eksempelopplegg, og ingenting sendes til Anthropic.</div>
      ) : null}
      <p style={{ margin: 0 }}>
        {p.baseVersion
          ? `KI justerer versjon ${p.baseVersion} etter ønskene dine og lagrer resultatet som en ny versjon.`
          : "KI lager et opplegg ut fra månedens tema, lagets standard, øvelsesbanken og evalueringene. Navn på spillere sendes aldri."}
      </p>
      <p className="nm-hint" style={{ margin: 0 }}>
        Bane: {p.pitch || "ikke valgt. Velg bane under Lagets standard."}
      </p>
      <label className="nm-field">
        <span className="nm-field__label">Tema</span>
        <input className="nm-input" value={theme} maxLength={80} onChange={(e) => setTheme(e.target.value)} />
        {p.themeNote ? <span className="nm-hint">{p.themeNote}</span> : null}
      </label>
      {!p.baseId ? (
        <label className="nm-field">
          <span className="nm-field__label">Lengde på økta (min)</span>
          <input className="nm-input" type="number" inputMode="numeric" min={15} max={240} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
      ) : null}
      <label className="nm-field">
        <span className="nm-field__label">{p.baseId ? "Hva skal endres?" : "Ønsker (valgfritt)"}</span>
        <textarea
          className="nm-input"
          value={wish}
          maxLength={1000}
          placeholder={p.baseId ? "F.eks. bytt øvelse 2 med noe som har mer avslutning" : "F.eks. mye ballkontakt, lite kø"}
          onChange={(e) => setWish(e.target.value)}
        />
        <span className="nm-hint">Ikke skriv navn eller helseopplysninger.</span>
      </label>
      <label className="nm-field">
        <span className="nm-field__label">Lenker til øvelser (valgfritt, maks 3)</span>
        <textarea className="nm-input" style={{ minHeight: 64 }} value={links} maxLength={1000} placeholder="https://www.tiim.no/…" onChange={(e) => setLinks(e.target.value)} />
        <span className="nm-hint">Tillatte nettsteder: {p.domains.join(", ")}</span>
      </label>
      {p.comments.length ? (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="nm-field__label" style={{ marginBottom: "var(--space-1)" }}>
            Kommentarer KI skal ta hensyn til
          </legend>
          {p.comments.map((c) => (
            <label key={c.id} className="nm-check">
              <input type="checkbox" checked={picked.includes(c.id)} onChange={(e) => setPicked((x) => (e.target.checked ? [...x, c.id] : x.filter((y) => y !== c.id)))} />
              <span>{c.text}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="nm-field__label" style={{ marginBottom: "var(--space-1)" }}>
          Modell
        </legend>
        {p.models.map((m) => (
          <label key={m.id} className="nm-check">
            <input type="radio" name="model" checked={model === m.id} onChange={() => setModel(m.id)} />
            <span>
              {m.choice} ({m.label})
              {prices?.[m.id] ? <span className="nm-hint" style={{ display: "block" }}>Pris: {prices[m.id]}</span> : null}
            </span>
          </label>
        ))}
        <button type="button" className="nm-btn nm-btn--ghost" onClick={estimate} disabled={pending}>
          Beregn pris
        </button>
        <p className="nm-hint" style={{ margin: "var(--space-1) 0 0" }}>
          {p.budgetText}
        </p>
      </fieldset>
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
          {p.baseId ? "Juster med KI" : "Lag opplegg med KI"}
        </button>
      </div>
    </form>
  );
}

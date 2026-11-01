"use client";

import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { quickCreateAction, quickEstimateAction } from "@/app/actions/plans";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/toast";

export interface QuickCreateProps {
  groupId: string;
  sub: string;
  eventId: string;
  eventPath: string;
  players: number;
  teams: number;
  sizeText: string;
  previousTeams: number | null;
  distribution: string;
  theme: string;
  minutes: number;
  coaches: number;
  pitches: { id: number; name: string }[];
  pitchIds: number[];
  model: { id: string; label: string };
  budgetText: string;
  simulated: boolean;
  /** The invitation is not sent yet: everyone invited is counted. */
  invited: boolean;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="nm-quick__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * «Hurtigopprett»: team proposal and KI plan in one tap, with the group's
 * usual choices and no wishes. Both are saved as drafts the trainer approves.
 */
export function QuickCreate(p: QuickCreateProps) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [theme, setTheme] = useState(p.theme);
  const [pitchIds, setPitchIds] = useState(p.pitchIds);
  const [price, setPrice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const askPitches = !p.pitchIds.length && p.pitches.length > 0;

  const input = () => ({
    groupId: p.groupId,
    sub: p.sub,
    eventId: p.eventId,
    theme,
    pitchIds,
    model: p.model.id,
  });
  const estimate = () =>
    start(async () => {
      setError(null);
      const r = await quickEstimateAction(input());
      if (!r.ok) return setError(r.error);
      const nok = r.data?.[p.model.id];
      if (!nok) return setError("Fikk ikke beregnet prisen nå, men du kan likevel starte.");
      setPrice(nok);
    });
  const run = () =>
    start(async () => {
      setError(null);
      setRunning(true);
      const r = await quickCreateAction(input());
      setRunning(false);
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      setOpen(false);
      router.push(r.data.planId ? `${p.eventPath}?opplegg=${r.data.planId}#plan-h` : `${p.eventPath}#lag-h`);
    });

  return (
    <>
      <button type="button" className="nm-btn nm-btn--secondary nm-btn--lg" onClick={() => setOpen(true)}>
        <Icon icon={Zap} />
        Hurtigopprett
      </button>
      {open ? (
        <Sheet title="Hurtigopprett" onClose={() => !pending && setOpen(false)} busy={pending}>
          <form
            className="nm-stack"
            style={{ gap: "var(--space-3)" }}
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            {p.simulated ? <div className="nm-note">KI er simulert i dette miljøet: du får et eksempelopplegg.</div> : null}
            <p style={{ margin: 0 }}>KI lager lag og treningsopplegg med lagets vanlige valg. Begge lagres som utkast som du ser over og godkjenner.</p>
            <dl className="nm-quick">
              <Row label="Lag">
                {p.teams} {p.teams === 1 ? "lag" : "lag à"} {p.teams === 1 ? `med ${p.players} spillere` : p.sizeText}
                <span className="nm-hint" style={{ display: "block" }}>
                  {p.previousTeams
                    ? `Som forrige trening (${p.previousTeams} lag), ${p.players} ${p.invited ? "invitert" : "kommer"}.`
                    : p.invited
                      ? `${p.players} spillere er invitert.`
                      : `${p.players} spillere har svart ja.`}
                </span>
              </Row>
              <Row label="Fordeling">{p.distribution}</Row>
              {p.theme ? <Row label="Tema">{p.theme}</Row> : null}
              <Row label="Økt">
                {p.minutes} min · {p.coaches ? `${p.coaches} ${p.coaches === 1 ? "trener" : "trenere"} har svart ja` : "ingen trenere har svart ja"}
              </Row>
              {!askPitches && pitchIds.length ? (
                <Row label="Baner">
                  {p.pitches
                    .filter((x) => pitchIds.includes(x.id))
                    .map((x) => x.name)
                    .join(", ")}
                </Row>
              ) : null}
            </dl>
            {!p.theme ? (
              <label className="nm-field">
                <span className="nm-field__label">Tema</span>
                <input className="nm-input" value={theme} maxLength={80} required onChange={(e) => setTheme(e.target.value)} />
                <span className="nm-hint">Årshjulet har ikke noe tema for denne måneden.</span>
              </label>
            ) : null}
            {askPitches ? (
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="nm-field__label" style={{ marginBottom: "var(--space-1)" }}>
                  Baner for økta
                </legend>
                {p.pitches.map((x) => (
                  <label key={x.id} className="nm-check">
                    <input
                      type="checkbox"
                      checked={pitchIds.includes(x.id)}
                      onChange={(e) => setPitchIds((v) => (e.target.checked ? [...v, x.id] : v.filter((z) => z !== x.id)))}
                    />
                    <span>{x.name}</span>
                  </label>
                ))}
                <p className="nm-hint" style={{ margin: 0 }}>
                  Valget huskes til neste gang.
                </p>
              </fieldset>
            ) : null}
            <div>
              <button type="button" className="nm-btn nm-btn--ghost" onClick={estimate} disabled={pending}>
                Beregn pris
              </button>
              <p className="nm-hint" style={{ margin: "var(--space-1) 0 0" }}>
                {price ? `Pris for opplegget: ca. ${price} (${p.model.label}). ` : ""}
                {p.budgetText}
              </p>
            </div>
            {error ? (
              <div className="nm-alert" role="alert">
                {error}
              </div>
            ) : null}
            <div aria-live="polite">
              {running ? (
                <div className="nm-note" role="status">
                  Lager lag og opplegg … Dette tar vanligvis under ett minutt. Ikke lukk siden.
                </div>
              ) : null}
            </div>
            <div>
              <button type="submit" className="nm-btn nm-btn--primary nm-btn--lg" disabled={pending}>
                <Icon icon={Zap} />
                Lag alt
              </button>
            </div>
          </form>
        </Sheet>
      ) : null}
    </>
  );
}

"use client";

import { GitBranch, ListOrdered, Wand2 } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { arrowSteps, buildTimeline, choiceOf, inferSteps } from "@/lib/plans/animation";
import { ALT_LETTERS, MAX_STEPS, type Drawing, type Sketch, type StepInfo } from "@/lib/plans/drawing";

const TYPE = { lop: "Løp", pasning: "Pasning", foring: "Føring" } as const;

/** Who starts an arrow: the nearest named player where the arrow starts, in its step. */
function starters(s: Sketch): string[] {
  const steps = arrowSteps(s);
  const tl = buildTimeline(s, 1);
  return s.piler.map((a, i) => {
    const start = tl.steps[Math.min(steps[i], tl.steps.length) - 1]?.start ?? s.objekter.map((o) => [o.x, o.y]);
    let best = "";
    let bd = 3.5;
    s.objekter.forEach((o, j) => {
      const d = Math.hypot(start[j][0] - a.fra[0], start[j][1] - a.fra[1]);
      if ((o.type === "spiller" || o.type === "trener") && o.tekst && d < bd) {
        bd = d;
        best = o.tekst;
      }
    });
    return best;
  });
}

/**
 * «Rekkefølge og valg»: which step each arrow is in, captions, and an optional
 * choice with alternatives. Works on the drawing and gives back a new one.
 */
export function StepEditor({ drawing, onChange }: { drawing: Drawing; onChange: (d: Drawing) => void }) {
  const sketches = drawing.skisser.map((s, i) => ({ s, i })).filter((x) => x.s.piler.length);
  if (!sketches.length) return null;
  const update = (i: number, f: (s: Sketch) => void) => {
    const d = structuredClone(drawing);
    f(d.skisser[i]);
    onChange(d);
  };
  return (
    <details className="nm-steps">
      <summary>
        <Icon icon={ListOrdered} size={20} />
        Rekkefølge og valg i animasjonen
      </summary>
      <p className="nm-hint">Hvert trinn får én tekst. Innenfor et trinn ordner appen rekkefølgen ut fra hvor pilene starter og slutter. Velg «Starter» bare når det blir feil. Uten trinn gjetter appen også trinnene.</p>
      {sketches.map(({ s, i }) => (
        <SketchSteps key={i} s={s} title={sketches.length > 1 ? s.tittel || `Skisse ${i + 1}` : ""} update={(f) => update(i, f)} />
      ))}
    </details>
  );
}

function SketchSteps({ s, title, update }: { s: Sketch; title: string; update: (f: (s: Sketch) => void) => void }) {
  const steps = arrowSteps(s);
  const choice = choiceOf(s);
  const n = Math.max(1, ...steps, s.trinnliste.length);
  const names = starters(s);
  const picks = Math.min(MAX_STEPS, Math.max(4, n + 1));
  const ensure = (x: Sketch, len: number) => {
    while (x.trinnliste.length < len) x.trinnliste.push({ tekst: "" });
  };
  const setStep = (i: number, k: number) =>
    update((x) => {
      x.piler.forEach((a, j) => (a.trinn = j === i ? k : steps[j]));
    });
  const setAlt = (i: number, alt: number) =>
    update((x) => {
      x.piler[i].alternativ = alt || undefined;
      if (!alt) delete x.piler[i].alternativ;
    });
  const setStart = (i: number, v: string) =>
    update((x) => {
      const a = x.piler[i];
      delete a.etter;
      delete a.samtidig;
      const [kind, n] = v.split(":");
      if (kind === "etter" || kind === "samtidig") a[kind] = Number(n);
    });
  const setHidden = (i: number, on: boolean) =>
    update((x) => {
      if (on) x.piler[i].skjult = true;
      else delete x.piler[i].skjult;
    });
  const setText = (k: number, alt: number | null, t: string) =>
    update((x) => {
      ensure(x, k + 1);
      const e: StepInfo = x.trinnliste[k];
      if (alt === null) e.tekst = t;
      else {
        const list = [...(e.tekster ?? [])];
        while (list.length < alt) list.push("");
        list[alt - 1] = t;
        e.tekster = list;
      }
    });
  const toggleChoice = (on: boolean) =>
    update((x) => {
      if (on) {
        const k = Math.min(1, n - 1);
        ensure(x, k + 1);
        x.trinnliste[k].valg = { sporsmal: "", alternativer: ["", ""] };
      } else {
        x.trinnliste.forEach((t) => {
          delete t.valg;
          delete t.tekster;
        });
        x.piler.forEach((a) => delete a.alternativ);
      }
    });
  const moveChoice = (k: number) =>
    update((x) => {
      ensure(x, k + 1);
      const v = x.trinnliste.find((t) => t.valg)?.valg;
      x.trinnliste.forEach((t) => delete t.valg);
      if (v) x.trinnliste[k].valg = v;
    });
  const setChoice = (f: (v: { sporsmal: string; alternativer: string[] }) => void) =>
    update((x) => {
      const t = x.trinnliste.find((y) => y.valg);
      if (t?.valg) f(t.valg);
    });

  return (
    <section className="nm-steps__sketch">
      {title ? <h4 className="nm-h3">{title}</h4> : null}
      <button type="button" className="nm-btn nm-btn--ghost" onClick={() => update((x) => inferSteps(x).forEach((k, j) => (x.piler[j].trinn = k)))}>
        <Icon icon={Wand2} />
        Foreslå rekkefølge
      </button>
      <ul className="nm-steps__arrows">
        {s.piler.map((a, i) => (
          <li key={i}>
            <div className="nm-steps__head">
              <span className="nm-steps__label">
                Pil {i + 1}: {TYPE[a.type].toLowerCase()}
                {names[i] ? ` · ${names[i]}` : ""}
              </span>
              <label className="nm-steps__check">
                <input type="checkbox" checked={!!a.skjult} onChange={(e) => setHidden(i, e.target.checked)} />
                Bare i animasjonen
              </label>
            </div>
            <div className="nm-steps__pick" role="group" aria-label={`Trinn for pil ${i + 1}`}>
              {Array.from({ length: picks }, (_, k) => (
                <button key={k} type="button" aria-pressed={steps[i] === k + 1} onClick={() => setStep(i, k + 1)}>
                  {k + 1}
                </button>
              ))}
            </div>
            {s.piler.some((b, j) => j !== i && steps[j] === steps[i]) ? (
              <label className="nm-field">
                <span className="nm-field__label">Starter</span>
                <select className="nm-input" value={a.etter ? `etter:${a.etter}` : a.samtidig ? `samtidig:${a.samtidig}` : ""} onChange={(e) => setStart(i, e.target.value)}>
                  <option value="">Automatisk</option>
                  {s.piler.map((b, j) =>
                    j !== i && steps[j] === steps[i]
                      ? (["etter", "samtidig"] as const).map((kind) => (
                          <option key={`${kind}${j}`} value={`${kind}:${j + 1}`}>
                            {kind === "etter" ? "Etter" : "Samtidig med"} {TYPE[b.type].toLowerCase()}
                            {names[j] ? ` · ${names[j]}` : ""} (pil {j + 1})
                          </option>
                        ))
                      : null,
                  )}
                </select>
              </label>
            ) : null}
            {choice ? (
              <div className="nm-steps__pick" role="group" aria-label={`Alternativ for pil ${i + 1}`}>
                {[0, ...choice.alternativer.map((_, j) => j + 1)].map((alt) => (
                  <button key={alt} type="button" aria-pressed={(a.alternativ ?? 0) === alt} onClick={() => setAlt(i, alt)}>
                    {alt ? `Bare ${ALT_LETTERS[alt - 1]}` : "Alle"}
                  </button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <label className="nm-steps__check">
        <input type="checkbox" checked={!!choice} onChange={(e) => toggleChoice(e.target.checked)} />
        <Icon icon={GitBranch} size={18} />
        Øvelsen har et valg (for eksempel hva forsvareren gjør)
      </label>
      {choice ? (
        <div className="nm-steps__choice">
          <label className="nm-field">
            <span className="nm-field__label">Valget skjer i trinn</span>
            <select className="nm-input" value={choice.step} onChange={(e) => moveChoice(Number(e.target.value))}>
              {Array.from({ length: n }, (_, k) => (
                <option key={k} value={k}>
                  {k + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="nm-field">
            <span className="nm-field__label">Spørsmål</span>
            <input className="nm-input" maxLength={60} value={choice.sporsmal} placeholder="Hva gjør forsvareren?" onChange={(e) => setChoice((v) => (v.sporsmal = e.target.value))} />
          </label>
          {choice.alternativer.map((t, j) => (
            <label key={j} className="nm-field">
              <span className="nm-field__label">Alternativ {ALT_LETTERS[j]}</span>
              <input className="nm-input" maxLength={40} value={t} placeholder={j ? "Dekker løpet" : "Går mot ballen"} onChange={(e) => setChoice((v) => (v.alternativer[j] = e.target.value))} />
            </label>
          ))}
          {choice.alternativer.length < ALT_LETTERS.length ? (
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setChoice((v) => v.alternativer.push(""))}>
              Legg til alternativ {ALT_LETTERS[choice.alternativer.length]}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="nm-steps__texts">
        {Array.from({ length: n }, (_, k) => {
          const e = s.trinnliste[k];
          const split = choice && k >= choice.step;
          return split ? (
            choice.alternativer.map((_, j) => (
              <label key={`${k}-${j}`} className="nm-field">
                <span className="nm-field__label">
                  Tekst til trinn {k + 1}, alternativ {ALT_LETTERS[j]}
                </span>
                <input className="nm-input" maxLength={120} value={e?.tekster?.[j] ?? (j === 0 ? e?.tekst ?? "" : "")} onChange={(ev) => setText(k, j + 1, ev.target.value)} />
              </label>
            ))
          ) : (
            <label key={k} className="nm-field">
              <span className="nm-field__label">Tekst til trinn {k + 1}</span>
              <input className="nm-input" maxLength={120} value={e?.tekst ?? ""} onChange={(ev) => setText(k, null, ev.target.value)} />
            </label>
          );
        })}
      </div>
    </section>
  );
}

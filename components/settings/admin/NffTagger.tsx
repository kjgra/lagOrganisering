"use client";

import { AKTIVITETER, BAND_KEYS, DELFERDIGHETER, HOVEDTEMA, LEARNING_POINTS, ROLES, delfTag, temaTag, type BandKey } from "@/lib/nff/fagplan";

export interface NffValue {
  bands: BandKey[];
  nff_activity: string;
  nff_tags: string[];
}

const BAND_LABEL: Record<BandKey, string> = { "6-7": "6–7 år", "8-9": "8–9 år", "10-12": "10–12 år" };

/**
 * Tags an exercise with NFF's fagplan: bands, one activity category, hovedtema and
 * delferdigheter, and the learning points for the chosen bands and topics.
 */
export function NffTagger({ value, onChange }: { value: NffValue; onChange: (v: NffValue) => void }) {
  const { bands, nff_activity, nff_tags } = value;
  const shown = bands.length ? bands : BAND_KEYS;
  const has = (t: string) => nff_tags.includes(t);
  const toggle = (t: string, on: boolean) => onChange({ ...value, nff_tags: on ? [...nff_tags, t] : nff_tags.filter((x) => x !== t) });
  const toggleBand = (b: BandKey, on: boolean) => {
    const next = BAND_KEYS.filter((x) => (x === b ? on : bands.includes(x)));
    // Learning points for a band that is no longer chosen go too.
    onChange({ ...value, bands: next, nff_tags: nff_tags.filter((t) => !t.startsWith(`lm.${b}.`) || on) });
  };
  const temaer = HOVEDTEMA.filter((t) => t.bands.some((b) => shown.includes(b)));
  const delf = DELFERDIGHETER.filter((t) => t.bands.some((b) => shown.includes(b)));
  const topics = [...temaer.filter((t) => has(temaTag(t.key))), ...delf.filter((t) => has(delfTag(t.key)))];

  const check = (tag: string, label: string) => (
    <label key={tag} className="nm-check">
      <input type="checkbox" checked={has(tag)} onChange={(e) => toggle(tag, e.target.checked)} />
      <span>{label}</span>
    </label>
  );

  return (
    <fieldset className="nm-form" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="nm-h3" style={{ marginBottom: "var(--space-1)" }}>
        NFFs fagplan
      </legend>
      <p className="nm-hint" style={{ margin: 0 }}>
        Brukes til å finne øvelser og av KI når den setter sammen økter.
      </p>

      <div className="nm-field">
        <span className="nm-field__label">Passer for</span>
        <div className="nm-row" style={{ gap: "var(--space-4)", flexWrap: "wrap" }}>
          {BAND_KEYS.map((b) => (
            <label key={b} className="nm-check">
              <input type="checkbox" checked={bands.includes(b)} onChange={(e) => toggleBand(b, e.target.checked)} />
              <span>{BAND_LABEL[b]}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="nm-field">
        <span className="nm-field__label">Aktivitetskategori</span>
        <select className="nm-input" value={nff_activity} onChange={(e) => onChange({ ...value, nff_activity: e.target.value })}>
          <option value="">Ikke valgt</option>
          {AKTIVITETER.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label} ({a.share})
            </option>
          ))}
        </select>
      </label>

      <div className="nm-field">
        <span className="nm-field__label">Hovedtema</span>
        {temaer.map((t) => check(temaTag(t.key), `${t.label} (${t.bands.map((b) => BAND_LABEL[b]).join(", ")})`))}
      </div>

      <div className="nm-field">
        <span className="nm-field__label">Delferdigheter</span>
        <div className="nm-form-row">
          {(["angrep", "forsvar"] as const).map((side) => (
            <div key={side}>
              <span className="nm-hint">{side === "angrep" ? "Angrep" : "Forsvar"}</span>
              {delf.filter((t) => t.side === side).map((t) => check(delfTag(t.key), t.label))}
            </div>
          ))}
        </div>
      </div>

      <div className="nm-field">
        <span className="nm-field__label">Læringsmomenter</span>
        {!topics.length ? (
          <p className="nm-hint" style={{ margin: 0 }}>
            Velg hovedtema eller delferdigheter først, så vises NFFs læringsmomenter for dem.
          </p>
        ) : (
          shown.flatMap((b) =>
            topics
              .filter((t) => t.bands.includes(b))
              .map((t) => {
                const points = LEARNING_POINTS.filter((p) => p.band === b && p.topic === t.key);
                if (!points.length) return null;
                const n = points.filter((p) => has(p.id)).length;
                return (
                  <details key={`${b}-${t.key}`} className="nm-exercise" open={n > 0}>
                    <summary style={{ cursor: "pointer", minHeight: "var(--touch-min)", display: "flex", alignItems: "center", fontWeight: 700 }}>
                      {t.label} · {BAND_LABEL[b]}
                      {n ? ` (${n} valgt)` : ""}
                    </summary>
                    {[...new Set(points.map((p) => p.role))].map((role) => (
                      <div key={role ?? "-"}>
                        {role ? <p className="nm-hint" style={{ margin: "var(--space-2) 0 0" }}>{ROLES[role]}</p> : null}
                        {points
                          .filter((p) => p.role === role)
                          .map((p) => (
                            <label key={p.id} className="nm-check">
                              <input type="checkbox" checked={has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} />
                              <span>
                                {p.text}
                                <span className="nm-hint" style={{ display: "block" }}>
                                  {p.group}
                                </span>
                              </span>
                            </label>
                          ))}
                      </div>
                    ))}
                  </details>
                );
              }),
          )
        )}
      </div>
    </fieldset>
  );
}

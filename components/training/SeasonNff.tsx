"use client";

import { AlertTriangle, Check, Lightbulb, Minus, Pencil, Settings2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveSeasonAction, saveSeasonSetupAction, saveThemeWordAction } from "@/app/actions/training";
import { Field, SaveButton, useSave } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import type { BandKey } from "@/lib/nff/fagplan";
import { autoLink, normTheme, notContent, themeKey, type KiLinks } from "@/lib/nff/theme-link";

// Årshjul with a setup per year: NFF's terms (picked from lists) or the team's own words.

export type SeasonMode = "nff" | "egne";
export type SeasonLevel = "hovedtema" | "delferdighet" | "laeringsmoment";

export const LEVELS: Record<SeasonLevel, { label: string; hint: string }> = {
  hovedtema: { label: "Hovedtema", hint: "For eksempel «Spille oss framover». Deretter 1–2 læringsmomenter. Delferdigheten blir tagg." },
  delferdighet: { label: "Delferdighet", hint: "For eksempel «Pasning». Deretter 1–2 læringsmomenter. Hovedtemaet blir tagg." },
  laeringsmoment: { label: "Læringsmoment", hint: "Et stikkord og 1–2 læringsmomenter. Hovedtema og delferdighet følger med som tagger." },
};

/** «Sett opp året»: NFF's terms or the team's own, what is picked first, and where to start. */
export function SeasonSetupForm({
  groupId,
  sub,
  year,
  initial,
  copyYear,
  bandText,
  back,
}: {
  groupId: string;
  sub: string;
  year: number;
  /** The year's setup, or null for a new year. */
  initial: { mode: SeasonMode; primary_level: SeasonLevel } | null;
  /** A year with themes the new year can start from, when the year has none. */
  copyYear: { year: number; months: number } | null;
  /** «10–12 år», or null when the team has no birth year (NFF's terms need one). */
  bandText: string | null;
  back: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<SeasonMode>(initial?.mode ?? (bandText ? "nff" : "egne"));
  const [level, setLevel] = useState<SeasonLevel>(initial?.primary_level ?? "hovedtema");
  const [copy, setCopy] = useState(!!copyYear);
  const { pending, run, errorBox } = useSave();
  const fs = { border: 0, padding: 0, margin: 0 } as const;
  const legend = { fontWeight: 700, fontSize: "var(--fs-body-lg)" } as const;
  return (
    <form
      className="nm-form"
      style={{ maxWidth: 640 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => saveSeasonSetupAction(groupId, sub, year, { mode, primaryLevel: level, copyFrom: copy && copyYear ? copyYear.year : null }),
          () => router.push(back),
        );
      }}
    >
      <fieldset style={fs}>
        <legend style={legend}>Hvilke begreper?</legend>
        <label className="nm-check">
          <input type="radio" name="mode" checked={mode === "nff"} disabled={!bandText} onChange={() => setMode("nff")} />
          <span>
            NFFs begreper
            <span className="nm-hint" style={{ display: "block" }}>
              {bandText ? `Velg fra NFFs fagplan for ${bandText} i nedtrekk. KI får nøyaktig det dere velger.` : "Sett lagets fødselsår under Laget først, så vet appen hvilket aldersbånd som gjelder."}
            </span>
          </span>
        </label>
        <label className="nm-check">
          <input type="radio" name="mode" checked={mode === "egne"} onChange={() => setMode("egne")} />
          <span>
            Egne begreper
            <span className="nm-hint" style={{ display: "block" }}>
              Skriv temaene med egne ord. Appen kobler dem til NFF for KI og «Sjekk mot NFF».
            </span>
          </span>
        </label>
      </fieldset>
      {mode === "nff" ? (
        <fieldset style={fs}>
          <legend style={legend}>Hva velger dere først hver måned?</legend>
          {(Object.keys(LEVELS) as SeasonLevel[]).map((k) => (
            <label key={k} className="nm-check">
              <input type="radio" name="level" checked={level === k} onChange={() => setLevel(k)} />
              <span>
                {LEVELS[k].label}
                <span className="nm-hint" style={{ display: "block" }}>
                  {LEVELS[k].hint}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {copyYear ? (
        <fieldset style={fs}>
          <legend style={legend}>Start fra</legend>
          <label className="nm-check">
            <input type="radio" name="copy" checked={copy} onChange={() => setCopy(true)} />
            <span>
              Årshjulet for {copyYear.year}
              <span className="nm-hint" style={{ display: "block" }}>
                {copyYear.months} {copyYear.months === 1 ? "måned" : "måneder"} med tema blir kopiert. Dere kan endre dem etterpå.
              </span>
            </span>
          </label>
          <label className="nm-check">
            <input type="radio" name="copy" checked={!copy} onChange={() => setCopy(false)} />
            <span>Tomt årshjul</span>
          </label>
        </fieldset>
      ) : null}
      {initial ? <p className="nm-hint">Månedene beholdes når dere endrer oppsettet.</p> : null}
      {errorBox}
      <SaveButton pending={pending}>{initial ? "Lagre oppsettet" : `Lag årshjul for ${year}`}</SaveButton>
    </form>
  );
}

export interface NffTopic {
  id: string;
  kind: "hovedtema" | "delferdighet";
  label: string;
}

export interface NffPoint {
  id: string;
  topic_id: string;
  text: string;
  /** «Ballfører», «Resten av laget», … for a hovedtema's points; empty for a delferdighet's. */
  role: string;
}

export interface NffMonth {
  theme: string;
  description: string;
  hovedtema: string;
  delferdighet: string;
  points: string[];
  /** Picks suggested from the month's own words (the year used egne begreper before). */
  suggested: boolean;
}

/** The month's theme was written by hand («Ferie»), not picked from NFF's list. */
const OWN = "__eget";

/** The årshjul with NFF's terms: per month, the primary term from a list, then 1–2 learning points. */
export function SeasonNffForm({
  groupId,
  sub,
  year,
  months,
  level,
  topics,
  points,
  initial,
  current,
}: {
  groupId: string;
  sub: string;
  year: number;
  months: string[];
  level: SeasonLevel;
  topics: NffTopic[];
  points: NffPoint[];
  initial: NffMonth[];
  current?: number;
}) {
  const [m, setM] = useState<NffMonth[]>(initial);
  // A month whose theme is not a term from the list is «Eget ord».
  const label = new Map(topics.map((t) => [t.id, t.label]));
  const kind = new Map(topics.map((t) => [t.id, t.kind]));
  const topicOf = new Map(points.map((p) => [p.id, p.topic_id]));
  const [own, setOwn] = useState<boolean[]>(() =>
    initial.map((x) => {
      const primary = level === "hovedtema" ? x.hovedtema : level === "delferdighet" ? x.delferdighet : "";
      return level !== "laeringsmoment" && !!x.theme && !primary;
    }),
  );
  const { pending, run, errorBox } = useSave();
  const hovedtema = topics.filter((t) => t.kind === "hovedtema");
  const delferdigheter = topics.filter((t) => t.kind === "delferdighet");
  const set = (i: number, f: (x: NffMonth) => NffMonth) => setM((all) => all.map((x, j) => (j === i ? { ...f(x), suggested: false } : x)));

  /** The topics a month's learning points can come from. */
  const sources = (x: NffMonth): NffTopic[] =>
    level === "hovedtema"
      ? [...hovedtema.filter((t) => t.id === x.hovedtema), ...delferdigheter]
      : level === "delferdighet"
        ? [...delferdigheter.filter((t) => t.id === x.delferdighet), ...hovedtema]
        : topics;

  /** Hovedtema and delferdighet follow the picked learning points when they are not picked first. */
  const derive = (x: NffMonth): NffMonth => {
    const from = (k: NffTopic["kind"]) => x.points.map((p) => topicOf.get(p) ?? "").find((t) => kind.get(t) === k) ?? "";
    const allowed = new Set(sources(x).map((t) => t.id));
    const pts = x.points.filter((p) => allowed.has(topicOf.get(p) ?? ""));
    const y = { ...x, points: pts };
    if (level !== "hovedtema") y.hovedtema = from("hovedtema") || (level === "delferdighet" ? x.hovedtema : "");
    if (level !== "delferdighet") y.delferdighet = from("delferdighet");
    return y;
  };

  const pointSelect = (i: number, slot: 0 | 1) => {
    const x = m[i];
    const src = sources(x);
    const disabled = (level === "hovedtema" && !x.hovedtema) || (level === "delferdighet" && !x.delferdighet) || (slot === 1 && !x.points[0]);
    return (
      <Field label={slot === 0 ? "Læringsmoment" : "Læringsmoment 2 (valgfritt)"}>
        <select
          className="nm-input"
          value={x.points[slot] ?? ""}
          disabled={disabled}
          onChange={(e) =>
            set(i, (y) => {
              const pts = [...y.points];
              if (e.target.value) pts[slot] = e.target.value;
              else pts.splice(slot, slot === 0 ? 2 : 1);
              return derive({ ...y, points: pts.filter(Boolean) });
            })
          }
        >
          <option value="">{slot === 0 ? "Velg læringsmoment" : "Ingen"}</option>
          {src.flatMap((t) => {
            const pts = points.filter((p) => p.topic_id === t.id && (slot === 0 || p.id !== x.points[0]));
            const roles = [...new Set(pts.map((p) => p.role))];
            return roles.map((role) => (
              <optgroup key={`${t.id}-${role}`} label={`${t.kind === "hovedtema" ? "" : "Delf. "}${t.label}${role ? ` · ${role}` : ""}`}>
                {pts
                  .filter((p) => p.role === role)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.text}
                    </option>
                  ))}
              </optgroup>
            ));
          })}
        </select>
      </Field>
    );
  };

  const card = (i: number) => {
    const x = m[i];
    const primaryList = level === "hovedtema" ? hovedtema : delferdigheter;
    const primary = level === "hovedtema" ? x.hovedtema : x.delferdighet;
    const tags = [
      level !== "hovedtema" && x.hovedtema ? `Hovedtema: ${label.get(x.hovedtema) ?? x.hovedtema}` : "",
      level !== "delferdighet" && x.delferdighet ? `Delferdighet: ${label.get(x.delferdighet) ?? x.delferdighet}` : "",
    ].filter(Boolean);
    return (
      <fieldset key={months[i]} className="nm-card nm-month">
        <legend className="nm-month__name">
          {months[i]}
          {current === i + 1 ? <span className="nm-badge nm-badge--neutral">Denne måneden</span> : null}
          {x.suggested ? <span className="nm-badge nm-badge--neutral">Forslag</span> : null}
        </legend>
        {level === "laeringsmoment" ? (
          <Field label="Stikkord" hint="Månedens tema med egne ord, for eksempel «Se opp før mottak».">
            <input className="nm-input" value={x.theme} maxLength={80} onChange={(e) => set(i, (y) => ({ ...y, theme: e.target.value }))} />
          </Field>
        ) : (
          <>
            <Field label={LEVELS[level].label}>
              <select
                className="nm-input"
                value={own[i] ? OWN : primary}
                onChange={(e) => {
                  const v = e.target.value;
                  setOwn((o) => o.map((b, j) => (j === i ? v === OWN : b)));
                  set(i, (y) => {
                    const id = v === OWN ? "" : v;
                    const z = level === "hovedtema" ? { ...y, hovedtema: id } : { ...y, delferdighet: id };
                    return derive({ ...z, theme: v === OWN ? "" : (label.get(id) ?? "") });
                  });
                }}
              >
                <option value="">Ingen tema</option>
                {primaryList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
                <option value={OWN}>Eget ord (for eksempel ferie)</option>
              </select>
            </Field>
            {own[i] ? (
              <Field label="Tema">
                <input className="nm-input" value={x.theme} maxLength={80} onChange={(e) => set(i, (y) => ({ ...y, theme: e.target.value }))} />
              </Field>
            ) : null}
          </>
        )}
        {own[i] ? null : (
          <>
            {pointSelect(i, 0)}
            {x.points[0] ? pointSelect(i, 1) : null}
            {tags.length ? (
              <p className="nm-hint" style={{ margin: 0 }}>
                {tags.join(" · ")}
              </p>
            ) : null}
          </>
        )}
        <Field label="Beskrivelse">
          <textarea className="nm-input" rows={2} value={x.description} maxLength={500} onChange={(e) => set(i, (y) => ({ ...y, description: e.target.value }))} />
        </Field>
      </fieldset>
    );
  };

  const first = current ? current - 1 : 0;
  const idx = months.map((_, i) => i);
  return (
    <form
      className="nm-form"
      style={{ maxWidth: 720 }}
      onSubmit={(e) => {
        e.preventDefault();
        const focus = m.map((x, i) =>
          own[i] || !x.theme.trim() ? null : { hovedtemaId: x.hovedtema || null, delferdighetId: x.delferdighet || null, learningPointIds: x.points },
        );
        run(() =>
          saveSeasonAction(
            groupId,
            sub,
            year,
            m.map((x) => x.theme),
            m.map((x) => x.description),
            focus,
          ),
        );
      }}
    >
      {m.some((x) => x.suggested) ? (
        <p className="nm-hint" style={{ margin: 0 }}>
          Måneder merket «Forslag» er koblet fra temaene dere skrev før. Sjekk dem og lagre.
        </p>
      ) : null}
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

/** «NFFs begreper · hovedtema først · Endre oppsett» above the months. */
export function SeasonSetupLine({ mode, level, href }: { mode: SeasonMode; level: SeasonLevel; href: string }) {
  return (
    <p className="nm-hint" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)" }}>
      <span>{mode === "nff" ? `NFFs begreper, ${LEVELS[level].label.toLowerCase()} først.` : "Egne begreper, koblet til NFF."}</span>
      <Link href={href} className="nm-btn nm-btn--ghost" style={{ minHeight: "var(--touch-min)" }}>
        <Icon icon={Settings2} />
        Endre oppsett
      </Link>
    </p>
  );
}

/** A word in the team's word list, as the page passes it. */
export interface NffWord {
  hovedtema_ids: string[];
  delferdighet_ids: string[];
  learning_point_ids: string[];
}

/** What the egne-begreper form needs to show and change each month's NFF link. */
export interface NffLinkData {
  band: BandKey;
  topics: NffTopic[];
  points: NffPoint[];
  /** The team's word list, by normalised word. */
  words: Record<string, NffWord>;
  /** KI's links of words the app's word list does not know (kiKey). */
  ki?: KiLinks;
}

const LINK_STATUS: Record<"bekreftet" | "forslag" | "telles-ikke" | "ikke-koblet", { word: string; badge: string; icon: LucideIcon }> = {
  bekreftet: { word: "Bekreftet", badge: "nm-badge--kommer", icon: Check },
  forslag: { word: "Forslag", badge: "nm-badge--neutral", icon: Lightbulb },
  "telles-ikke": { word: "Telles ikke", badge: "nm-badge--kommer-ikke", icon: Minus },
  "ikke-koblet": { word: "Ikke koblet", badge: "nm-badge--ikke-svart", icon: AlertTriangle },
};

/** «Koblet til NFF» under a month with the team's own words: the link, confirm it, or choose it yourselves. */
export function MonthLink({ groupId, sub, theme, data }: { groupId: string; sub: string; theme: string; data: NffLinkData }) {
  const term = themeKey(theme);
  const own = term ? (data.words[term] ?? data.words[normTheme(theme)]) : undefined;
  return <MonthLinkInner key={`${term}|${JSON.stringify(own ?? null)}`} groupId={groupId} sub={sub} theme={theme} data={data} own={own} />;
}

function MonthLinkInner({ groupId, sub, theme, data, own }: { groupId: string; sub: string; theme: string; data: NffLinkData; own: NffWord | undefined }) {
  const auto = autoLink(theme, data.band, data.ki);
  const current = own
    ? { h: own.hovedtema_ids, df: own.delferdighet_ids, lp: own.learning_point_ids }
    : auto
      ? { h: auto.hovedtema, df: auto.delferdigheter, lp: auto.learningPoints.slice(0, 2) }
      : { h: [], df: [], lp: [] };
  const [editing, setEditing] = useState(false);
  const [h, setH] = useState<string[]>(current.h);
  const [df, setDf] = useState<string[]>(current.df);
  const [lp, setLp] = useState<string[]>(current.lp);
  const { pending, run, errorBox } = useSave();
  if (!normTheme(theme)) return null;
  const label = new Map(data.topics.map((t) => [t.id, t.label]));
  const status = own ? "bekreftet" : auto ? "forslag" : notContent(theme) ? "telles-ikke" : "ikke-koblet";
  const st = LINK_STATUS[status];
  const nPoints = own ? own.learning_point_ids.length : (auto?.learningPoints.length ?? 0);
  const tags = [
    ...current.h.map((id) => `Hovedtema ${label.get(id) ?? id}`),
    ...current.df.map((id) => `Delf. ${label.get(id) ?? id}`),
    ...(nPoints ? [`${nPoints} ${nPoints === 1 ? "læringsmoment" : "læringsmomenter"}`] : []),
  ];
  const save = (v: { h: string[]; df: string[]; lp: string[] }) =>
    run(
      () => saveThemeWordAction(groupId, sub, theme, { hovedtemaIds: v.h, delferdighetIds: v.df, learningPointIds: v.lp }),
      () => setEditing(false),
    );
  const toggle = (set: (f: (x: string[]) => string[]) => void, id: string) => set((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const sources = data.topics.filter((t) => h.includes(t.id) || df.includes(t.id));
  const allowed = new Set(sources.map((t) => t.id));
  const pts = lp.filter((p) => allowed.has(data.points.find((x) => x.id === p)?.topic_id ?? ""));
  const pointSelect = (slot: 0 | 1) => (
    <Field label={slot === 0 ? "Læringsmoment (valgfritt)" : "Læringsmoment 2 (valgfritt)"}>
      <select
        className="nm-input"
        value={pts[slot] ?? ""}
        disabled={!sources.length || (slot === 1 && !pts[0])}
        onChange={(e) =>
          setLp(() => {
            const next = [...pts];
            if (e.target.value) next[slot] = e.target.value;
            else next.splice(slot, slot === 0 ? 2 : 1);
            return next.filter(Boolean);
          })
        }
      >
        <option value="">Ingen</option>
        {sources.flatMap((t) => {
          const list = data.points.filter((p) => p.topic_id === t.id && (slot === 0 || p.id !== pts[0]));
          return [...new Set(list.map((p) => p.role))].map((role) => (
            <optgroup key={`${t.id}-${role}`} label={`${t.kind === "hovedtema" ? "" : "Delf. "}${t.label}${role ? ` · ${role}` : ""}`}>
              {list
                .filter((p) => p.role === role)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.text}
                  </option>
                ))}
            </optgroup>
          ));
        })}
      </select>
    </Field>
  );
  const box = { border: 0, padding: 0, margin: 0 } as const;
  return (
    <div className="nm-month-link" role="group" aria-label={`Koblet til NFF for ${theme.trim()}`}>
      <div className="nm-month-link__head">
        <strong>Koblet til NFF</strong>
        <span className={`nm-badge ${st.badge}`}>
          <Icon icon={st.icon} />
          {st.word}
        </span>
      </div>
      {tags.length ? <p style={{ margin: 0 }}>{tags.join(" · ")}</p> : null}
      {status === "forslag" && auto?.ki ? <p className="nm-hint" style={{ margin: 0 }}>KI foreslo koblingen. Bekreft den, eller endre den.</p> : null}
      {status === "ikke-koblet" ? <p className="nm-hint" style={{ margin: 0 }}>Appen kjenner ikke ordet. Velg koblingen selv, så får KI og «Sjekk mot NFF» den.</p> : null}
      {editing ? (
        <>
          <fieldset style={box}>
            <legend className="nm-field__label">Hovedtema</legend>
            {data.topics
              .filter((t) => t.kind === "hovedtema")
              .map((t) => (
                <label key={t.id} className="nm-check">
                  <input type="checkbox" checked={h.includes(t.id)} onChange={() => toggle(setH, t.id)} />
                  <span>{t.label}</span>
                </label>
              ))}
          </fieldset>
          <fieldset style={box}>
            <legend className="nm-field__label">Delferdigheter</legend>
            {data.topics
              .filter((t) => t.kind === "delferdighet")
              .map((t) => (
                <label key={t.id} className="nm-check">
                  <input type="checkbox" checked={df.includes(t.id)} onChange={() => toggle(setDf, t.id)} />
                  <span>{t.label}</span>
                </label>
              ))}
          </fieldset>
          {pointSelect(0)}
          {pts[0] ? pointSelect(1) : null}
          <p className="nm-hint" style={{ margin: 0 }}>
            Koblingen gjelder ordet «{theme.trim()}» for hele laget, også neste år.
          </p>
          {errorBox}
          <div className="nm-month-link__actions">
            <button type="button" className="nm-btn nm-btn--primary" disabled={pending || (!h.length && !df.length && !pts.length)} onClick={() => save({ h, df, lp: pts })}>
              <Icon icon={Check} />
              Lagre koblingen
            </button>
            <button type="button" className="nm-btn nm-btn--secondary" disabled={pending} onClick={() => setEditing(false)}>
              Avbryt
            </button>
            {own ? (
              <button type="button" className="nm-btn nm-btn--ghost" disabled={pending} onClick={() => save({ h: [], df: [], lp: [] })}>
                Bruk appens forslag
              </button>
            ) : null}
          </div>
        </>
      ) : status === "telles-ikke" ? null : (
        <>
          {errorBox}
          <div className="nm-month-link__actions">
            {status === "forslag" ? (
              <button type="button" className="nm-btn nm-btn--secondary" disabled={pending} onClick={() => save(current)}>
                <Icon icon={Check} />
                Bekreft
              </button>
            ) : null}
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setEditing(true)}>
              <Icon icon={Pencil} />
              {status === "ikke-koblet" ? "Velg kobling" : "Endre kobling"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

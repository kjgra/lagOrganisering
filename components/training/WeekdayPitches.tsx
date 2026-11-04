"use client";

import { AlarmClock, CalendarClock, CalendarPlus, CircleOff, MapPin, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteWeekdayPitchesAction, saveWeekdayPitchesAction } from "@/app/actions/pitches";
import { Field, SaveButton, useSave } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";

const DAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

/** One row of fixed pitches, ready to show. */
export interface WeekdayRow {
  id: number;
  weekday: number;
  from: string;
  to: string | null;
  pitchIds: number[];
  pitchNames: string;
  /** «Fra 4. nov til og med 31. mar» */
  period: string;
  status: "now" | "coming" | "ending" | "ended";
}

interface Draft {
  from: string;
  to: string;
  days: Record<number, number[]>;
}

/**
 * «Faste baner per ukedag» on Trening › Laget: after the banefordeling the
 * trainer picks pitches only for the days the team trains, from a date and
 * (optionally) until the next fordeling is expected.
 */
export function WeekdayPitches({
  groupId,
  sub,
  inherited,
  pool,
  rows,
  today,
  ending,
}: {
  groupId: string;
  sub: string;
  /** A subgroup showing the main group's: saving gives it its own. */
  inherited: boolean;
  /** The team's pitches («Baner» above). */
  pool: { id: number; name: string }[];
  rows: WeekdayRow[];
  today: string;
  /** «Faste baner for mandager slutter 31. mar.», when within the reminder time. */
  ending: string | null;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const { pending, run, errorBox } = useSave();
  const chosenDays = draft ? Object.keys(draft.days).map(Number).sort() : [];

  const open = (d: Draft) => {
    setConfirm(null);
    setDraft(d);
  };
  const toggleDay = (wd: number, on: boolean) =>
    setDraft((d) => {
      if (!d) return d;
      const days = { ...d.days };
      if (on) days[wd] = days[wd] ?? (pool.length === 1 ? [pool[0].id] : []);
      else delete days[wd];
      return { ...d, days };
    });
  const togglePitch = (wd: number, id: number, on: boolean) =>
    setDraft((d) => (d ? { ...d, days: { ...d.days, [wd]: on ? [...(d.days[wd] ?? []), id] : (d.days[wd] ?? []).filter((x) => x !== id) } } : d));

  if (!pool.length) {
    return <p className="nm-hint">Velg lagets baner over og lagre, så kan dere sette faste baner for treningsdagene.</p>;
  }

  return (
    <div className="nm-stack" style={{ gap: "var(--space-3)" }}>
      <p className="nm-hint" style={{ margin: 0 }}>
        Etter banefordelingen velger dere baner for dagene dere trener. De gjelder fra datoen til neste endring eller sluttdatoen, og velges da av seg selv
        for hver trening. En enkelt trening kan få andre baner på treningen.
      </p>
      {ending ? (
        <div className="nm-note" role="status">
          <Icon icon={AlarmClock} />
          <span>{ending} Legg inn nye når neste banefordeling er klar.</span>
        </div>
      ) : null}
      {rows.length ? (
        <ul className="nm-list">
          {rows.map((r) => (
            <li key={r.id} style={{ flexWrap: "wrap" }}>
              <div className="nm-list__main">
                <span className="nm-list__name">{DAYS[r.weekday - 1]}</span>
                <span style={{ display: "inline-flex", gap: "var(--space-1)", alignItems: "flex-start" }}>
                  <Icon icon={MapPin} size={16} />
                  <span>{r.pitchNames}</span>
                </span>
                <span className="nm-hint">{r.period}</span>
                {r.status !== "now" ? (
                  <span className="nm-badge nm-badge--neutral" style={{ alignSelf: "flex-start" }}>
                    <Icon icon={r.status === "coming" ? CalendarClock : r.status === "ending" ? AlarmClock : CircleOff} size={16} />
                    {r.status === "coming" ? "Kommer" : r.status === "ending" ? "Slutter snart" : "Sluttet"}
                  </span>
                ) : null}
              </div>
              <div className="nm-row" style={{ gap: "var(--space-1)" }}>
                <button
                  type="button"
                  className="nm-btn nm-btn--ghost"
                  onClick={() =>
                    open({
                      from: r.status === "coming" ? r.from : today,
                      to: r.status === "ended" ? "" : (r.to ?? ""),
                      days: { [r.weekday]: r.status === "ended" ? [] : r.pitchIds },
                    })
                  }
                >
                  <Icon icon={Pencil} />
                  Endre fra dato
                </button>
                {!inherited ? (
                  <button type="button" className="nm-btn nm-btn--ghost" aria-label={`Slett ${DAYS[r.weekday - 1].toLowerCase()} ${r.period.toLowerCase()}`} onClick={() => setConfirm(r.id)}>
                    <Icon icon={Trash2} />
                    Slett
                  </button>
                ) : null}
              </div>
              {confirm === r.id ? (
                <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap", width: "100%" }}>
                  <span role="alert" style={{ alignSelf: "center" }}>
                    Slette {DAYS[r.weekday - 1].toLowerCase()} ({r.period.toLowerCase()})?
                  </span>
                  <button
                    type="button"
                    className="nm-btn nm-btn--danger"
                    disabled={pending}
                    onClick={() => run(() => deleteWeekdayPitchesAction(groupId, sub, r.id), () => setConfirm(null))}
                  >
                    Ja, slett
                  </button>
                  <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setConfirm(null)}>
                    Avbryt
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="nm-muted" style={{ margin: 0 }}>
          Ingen faste baner ennå. Banene velges for hver trening.
        </p>
      )}

      {draft ? (
        <form
          className="nm-form nm-card"
          style={{ maxWidth: 640, padding: "var(--space-3)" }}
          aria-label="Faste baner fra dato"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                saveWeekdayPitchesAction({
                  groupId,
                  sub,
                  from: draft.from,
                  to: draft.to || null,
                  days: chosenDays.map((wd) => ({ weekday: wd, pitch_ids: draft.days[wd] })),
                }),
              () => setDraft(null),
            );
          }}
        >
          <div className="nm-form-row">
            <Field label="Gjelder fra">
              <input className="nm-input" type="date" required value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
            </Field>
            <Field label="Til og med (valgfritt)" hint="Når neste banefordeling ventes. Dere får en påminnelse før.">
              <input className="nm-input" type="date" min={draft.from || undefined} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
            </Field>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="nm-field__label" style={{ marginBottom: "var(--space-1)" }}>
              Treningsdager
            </legend>
            <p className="nm-hint" style={{ margin: "0 0 var(--space-2)" }}>
              Velg bare dagene som endres. De andre dagene beholder banene sine.
            </p>
            {DAYS.map((name, i) => {
              const wd = i + 1;
              const on = wd in draft.days;
              return (
                <div key={wd}>
                  <label className="nm-check">
                    <input type="checkbox" checked={on} onChange={(e) => toggleDay(wd, e.target.checked)} />
                    <span style={{ fontWeight: 700 }}>{name}</span>
                  </label>
                  {on ? (
                    <div role="group" aria-label={`Baner ${name.toLowerCase()}`} style={{ paddingLeft: "var(--space-5)" }}>
                      {pool.map((p) => (
                        <label key={p.id} className="nm-check">
                          <input type="checkbox" checked={draft.days[wd].includes(p.id)} onChange={(e) => togglePitch(wd, p.id, e.target.checked)} />
                          <span>{p.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </fieldset>
          {errorBox}
          <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
            <SaveButton pending={pending}>Lagre faste baner</SaveButton>
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setDraft(null)}>
              Avbryt
            </button>
          </div>
        </form>
      ) : (
        <>
          {errorBox}
          <div>
            <button type="button" className="nm-btn nm-btn--secondary" onClick={() => open({ from: today, to: "", days: {} })}>
              <Icon icon={CalendarPlus} />
              Nye faste baner
            </button>
          </div>
        </>
      )}
    </div>
  );
}

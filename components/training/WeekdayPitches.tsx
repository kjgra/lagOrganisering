"use client";

import { AlarmClock, CalendarClock, CalendarPlus, MapPin, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { deletePeriodAction, saveWeekdayPitchesAction } from "@/app/actions/pitches";
import { Field, SaveButton, useSave } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { PitchTree } from "@/components/training/PitchTree";
import type { PitchGroup } from "@/lib/plans/plan";

const DAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

/** One row of fixed pitches, ready to show. */
export interface WeekdayRow {
  id: number;
  weekday: number;
  from: string;
  to: string | null;
  pitchIds: number[];
  pitchNames: string[];
  /** «04.11.26–31.03.27» */
  span: string;
  status: "now" | "coming" | "ending";
}

interface Draft {
  from: string;
  to: string;
  days: Record<number, number[]>;
  /** Editing this banefordeling (its start and end), not adding a new one. */
  editing: { from: string; to: string | null } | null;
}

/**
 * «Faste baner per ukedag» on Trening › Laget: after the banefordeling the
 * trainer picks pitches only for the days the team trains, from a date and
 * (optionally) until the next fordeling is expected.
 */
export function WeekdayPitches({
  groupId,
  sub,
  groups,
  rows,
  today,
  ending,
}: {
  groupId: string;
  sub: string;
  /** All the pitches at the facility, by main pitch. */
  groups: PitchGroup[];
  rows: WeekdayRow[];
  today: string;
  /** «Faste baner for mandager slutter 31. mar.», when within the reminder time. */
  ending: string | null;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirm, setConfirm] = useState(false);
  const { pending, run, errorBox } = useSave();
  const chosenDays = draft ? Object.keys(draft.days).map(Number).sort() : [];

  const open = (d: Draft) => {
    setConfirm(false);
    setDraft(d);
  };
  /** The whole banefordeling a row belongs to: every day with the same start and end. */
  const edit = (r: WeekdayRow) => {
    const same = rows.filter((x) => x.from === r.from && x.to === r.to);
    open({ from: r.from, to: r.to ?? "", days: Object.fromEntries(same.map((x) => [x.weekday, x.pitchIds])), editing: { from: r.from, to: r.to } });
  };
  const toggleDay = (wd: number, on: boolean) =>
    setDraft((d) => {
      if (!d) return d;
      const days = { ...d.days };
      if (on) days[wd] = days[wd] ?? [];
      else delete days[wd];
      return { ...d, days };
    });
  const setPitches = (wd: number, ids: number[]) => setDraft((d) => (d ? { ...d, days: { ...d.days, [wd]: ids } } : d));

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
        <div className="nm-stack" style={{ gap: "var(--space-2)" }}>
          {rows.map((r) => (
            <section
              key={r.id}
              className="nm-card"
              aria-label={`${DAYS[r.weekday - 1]} ${r.span}`}
              style={{
                padding: "var(--space-3)",
                ...(r.status === "coming" ? { borderStyle: "dashed", background: "var(--surface-muted)" } : {}),
              }}
            >
              <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap", alignItems: "baseline" }}>
                <strong style={{ fontSize: "var(--fs-body-lg)" }}>{DAYS[r.weekday - 1]}</strong>
                <span className="nm-muted">({r.span})</span>
                {r.status !== "now" ? (
                  <span className="nm-badge nm-badge--neutral">
                    <Icon icon={r.status === "coming" ? CalendarClock : AlarmClock} size={16} />
                    {r.status === "coming" ? "Kommer" : "Slutter snart"}
                  </span>
                ) : null}
              </div>
              <ul style={{ listStyle: "none", margin: "var(--space-2) 0", padding: 0, display: "grid", gap: "var(--space-1)" }}>
                {r.pitchNames.map((n) => (
                  <li key={n} style={{ display: "flex", gap: "var(--space-1)", alignItems: "flex-start" }}>
                    <Icon icon={MapPin} size={16} />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="nm-btn nm-btn--ghost" onClick={() => edit(r)}>
                <Icon icon={Pencil} />
                Endre banefordelingen
              </button>
            </section>
          ))}
        </div>
      ) : (
        <p className="nm-muted" style={{ margin: 0 }}>
          Ingen faste baner ennå. Banene velges for hver trening.
        </p>
      )}

      {draft ? (
        <form
          className="nm-form nm-card"
          style={{ maxWidth: 640, padding: "var(--space-3)" }}
          aria-label={draft.editing ? "Endre banefordelingen" : "Faste baner fra dato"}
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
                  replace: draft.editing ?? undefined,
                }),
              () => setDraft(null),
            );
          }}
        >
          <Field label="Gjelder fra">
            <input className="nm-input" type="date" required value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          </Field>
          <Field label="Til og med (valgfritt)" hint="Når neste banefordeling ventes. Dere får en påminnelse før.">
            <input className="nm-input" type="date" min={draft.from || undefined} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </Field>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="nm-field__label" style={{ marginBottom: "var(--space-1)" }}>
              Treningsdager
            </legend>
            <p className="nm-hint" style={{ margin: "0 0 var(--space-2)" }}>
              {draft.editing
                ? "Fjern haken for en dag for å ta den ut av banefordelingen."
                : "Velg bare dagene som endres. De andre dagene beholder banene sine."}
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
                    <div style={{ paddingLeft: "var(--space-3)" }}>
                      <PitchTree groups={groups} label={`Baner ${name.toLowerCase()}`} value={draft.days[wd]} onChange={(ids) => setPitches(wd, ids)} />
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
            {draft.editing && !confirm ? (
              <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setConfirm(true)}>
                <Icon icon={Trash2} />
                Slett banefordelingen
              </button>
            ) : null}
          </div>
          {draft.editing && confirm ? (
            <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
              <span role="alert" style={{ alignSelf: "center" }}>
                Slette banefordelingen for alle dagene?
              </span>
              <button
                type="button"
                className="nm-btn nm-btn--danger"
                disabled={pending}
                onClick={() => run(() => deletePeriodAction(groupId, sub, draft.editing!.from, draft.editing!.to), () => setDraft(null))}
              >
                Ja, slett
              </button>
              <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setConfirm(false)}>
                Avbryt
              </button>
            </div>
          ) : null}
        </form>
      ) : (
        <>
          {errorBox}
          <div>
            <button type="button" className="nm-btn nm-btn--secondary" onClick={() => open({ from: today, to: "", days: {}, editing: null })}>
              <Icon icon={CalendarPlus} />
              Nye faste baner
            </button>
          </div>
        </>
      )}
    </div>
  );
}

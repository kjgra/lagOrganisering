"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { feedbackAction } from "@/app/actions/plans";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

export interface FeedbackDraft {
  exercise_no: number | null;
  title: string;
  planned: number | null;
  rating: number | null;
  tags: string[];
  actual_minutes: string;
  actual_players: string;
  body: string;
  use_again: string;
}

/** One trainer's evaluation after the training: each exercise and the session as a whole. */
export function FeedbackForm(p: {
  planId: number;
  registered: number | null;
  rows: FeedbackDraft[];
  ratings: Record<string, string>;
  tags: Record<string, string>;
  useAgain: Record<string, string>;
  doneHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState(p.rows);
  const [error, setError] = useState<string | null>(null);
  const upd = (i: number, ch: Partial<FeedbackDraft>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...ch } : x)));

  const save = () =>
    start(async () => {
      setError(null);
      const r = await feedbackAction({
        planId: p.planId,
        registered: p.registered,
        rows: rows.map((x) => ({ exercise_no: x.exercise_no, rating: x.rating, tags: x.tags, actual_minutes: x.actual_minutes, actual_players: x.actual_players, body: x.body, use_again: x.use_again })),
      });
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      router.push(`${p.doneHref}?opplegg=${p.planId}#plan-h`);
    });

  return (
    <form
      className="nm-form"
      style={{ maxWidth: 720 }}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <p style={{ margin: 0 }}>Evalueringene hjelper laget og KI å lage bedre økter. Skriv uten navn på spillere.</p>
      {rows.map((x, i) => {
        const session = x.exercise_no === null;
        return (
          <fieldset key={i} className="nm-card nm-proposal" style={{ margin: 0 }}>
            <legend style={{ fontWeight: 700, fontSize: 18, padding: "0 4px" }}>{x.title}</legend>
            <div className="nm-rate" role="group" aria-label="Vurdering">
              {Object.entries(p.ratings)
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .map(([k, label]) => (
                  <button key={k} type="button" className="nm-btn nm-btn--secondary" aria-pressed={x.rating === Number(k)} onClick={() => upd(i, { rating: x.rating === Number(k) ? null : Number(k) })}>
                    {label}
                  </button>
                ))}
            </div>
            {!session ? (
              <>
                <div className="nm-row" style={{ gap: 6 }} role="group" aria-label="Stikkord">
                  {Object.entries(p.tags).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      className="nm-chip"
                      style={{ cursor: "pointer" }}
                      aria-pressed={x.tags.includes(k)}
                      onClick={() => upd(i, { tags: x.tags.includes(k) ? x.tags.filter((t) => t !== k) : [...x.tags, k] })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="nm-form-row">
                  <label className="nm-field">
                    <span className="nm-field__label">Faktisk tid (min){x.planned ? ` · plan ${x.planned}` : ""}</span>
                    <input className="nm-input" type="number" inputMode="numeric" min={0} max={240} value={x.actual_minutes} onChange={(e) => upd(i, { actual_minutes: e.target.value })} />
                  </label>
                  <label className="nm-field">
                    <span className="nm-field__label">Bruke igjen?</span>
                    <select className="nm-input" value={x.use_again} onChange={(e) => upd(i, { use_again: e.target.value })}>
                      <option value="">–</option>
                      {Object.entries(p.useAgain).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <label className="nm-field">
                <span className="nm-field__label">Antall spillere som kom{p.registered !== null ? ` (${p.registered} påmeldt)` : ""}</span>
                <input className="nm-input" type="number" inputMode="numeric" min={0} max={200} value={x.actual_players} onChange={(e) => upd(i, { actual_players: e.target.value })} />
              </label>
            )}
            <label className="nm-field">
              <span className="nm-field__label">Kommentar</span>
              <textarea className="nm-input" style={{ minHeight: 64 }} maxLength={300} value={x.body} onChange={(e) => upd(i, { body: e.target.value })} />
            </label>
          </fieldset>
        );
      })}
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      <div>
        <button type="submit" className="nm-btn nm-btn--primary nm-btn--lg" disabled={pending}>
          <Icon icon={Save} />
          Lagre evalueringen
        </button>
      </div>
    </form>
  );
}

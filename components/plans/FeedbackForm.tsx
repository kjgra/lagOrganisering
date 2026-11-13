"use client";

import { ChevronDown, ChevronUp, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bankFeedbackAction, feedbackAction } from "@/app/actions/plans";
import { FeedbackDictation } from "@/components/plans/FeedbackDictation";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { type FeedbackFill, QUICK_TAGS } from "@/lib/plans/feedback";

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

/** After a training: the plan version, and where to go when saved. */
interface PlanTarget {
  planId: number;
  registered: number | null;
  doneHref: string;
}

/** From the bank: one exercise, and the page stays. */
interface BankTarget {
  groupId: string;
  exerciseId: number;
}

/**
 * One trainer's evaluation: after the training, each exercise and the session
 * as a whole; from the bank, one exercise. Both end up in the same data.
 */
export function FeedbackForm(p: {
  target: PlanTarget | BankTarget;
  rows: FeedbackDraft[];
  ratings: Record<string, string>;
  tags: Record<string, string>;
  /** Keywords for «Hele økta» after a training. */
  sessionTags?: Record<string, string>;
  useAgain: Record<string, string>;
  /** The trainer may use KI: «Fortell om økta» fills in the form. */
  ki?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState(p.rows);
  const [error, setError] = useState<string | null>(null);
  const upd = (i: number, ch: Partial<FeedbackDraft>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...ch } : x)));
  // Details are optional: open from the start only when there is one row, or when something besides the rating is filled in.
  const hasDetails = (x: FeedbackDraft) => Boolean(x.actual_minutes || x.actual_players || x.body || x.use_again || x.tags.some((t) => !QUICK_TAGS.includes(t)));
  const [open, setOpen] = useState<boolean[]>(() => p.rows.map((x) => p.rows.length === 1 || hasDetails(x)));
  const [filled, setFilled] = useState(0);
  // KI's fields go over what is there; keywords are added. From the bank, KI's exercise 1 is the only row.
  const fill = (fills: FeedbackFill[]) => {
    const plan = "planId" in p.target;
    setRows((r) =>
      r.map((x) => {
        const f = fills.find((y) => (plan ? y.exercise_no === x.exercise_no : y.exercise_no === 1));
        if (!f) return x;
        return {
          ...x,
          rating: f.rating ?? x.rating,
          tags: f.tags ? [...new Set([...x.tags, ...f.tags])] : x.tags,
          actual_minutes: f.actual_minutes ?? x.actual_minutes,
          actual_players: f.actual_players ?? x.actual_players,
          use_again: f.use_again ?? x.use_again,
          body: f.body ?? x.body,
        };
      }),
    );
    // Show what KI filled in.
    setOpen((o) => o.map((v, j) => v || fills.some((f) => (plan ? f.exercise_no === rows[j]?.exercise_no : f.exercise_no === 1))));
    setFilled((n) => n + 1);
  };

  const save = () =>
    start(async () => {
      setError(null);
      const t = p.target;
      const raw = (x: FeedbackDraft) => ({ rating: x.rating, tags: x.tags, actual_minutes: x.actual_minutes, body: x.body, use_again: x.use_again });
      const r =
        "planId" in t
          ? await feedbackAction({ planId: t.planId, registered: t.registered, rows: rows.map((x) => ({ ...raw(x), exercise_no: x.exercise_no, actual_players: x.actual_players })) })
          : await bankFeedbackAction({ groupId: t.groupId, exerciseId: t.exerciseId, row: raw(rows[0]) });
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      if ("planId" in t) router.push(`${t.doneHref}?opplegg=${t.planId}#plan-h`);
      else router.refresh();
    });

  const [said, setSaid] = useState("");
  const rated = rows.filter((x) => x.rating !== null).length;
  const quickTags = QUICK_TAGS.filter((k) => k in p.tags);

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
      <p style={{ margin: 0 }}>
        {"planId" in p.target
          ? "Ett trykk per øvelse holder. Vil du si mer, trykk «Mer detaljer». Evalueringene hjelper laget og KI å lage bedre økter."
          : "Vurder øvelsen slik den har fungert for laget. Den teller sammen med evalueringene etter trening. Tøm feltene og lagre for å fjerne din evaluering."}{" "}
        Skriv uten navn på spillere.
      </p>
      {p.ki ? <FeedbackDictation target={"planId" in p.target ? { planId: p.target.planId } : p.target} session={"planId" in p.target} onFill={fill} /> : null}
      {filled ? (
        <div className="nm-note" role="status">
          KI har fylt ut feltene under. Ingenting er lagret ennå: se over, rett om du vil, og trykk «Lagre evalueringen».
        </div>
      ) : null}
      {rows.map((x, i) => {
        const session = "planId" in p.target && x.exercise_no === null;
        const isOpen = open[i];
        const tags = session ? (p.sessionTags ?? {}) : p.tags;
        const chip = (k: string, label: string) => (
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
        );
        return (
          <fieldset key={i} className="nm-card nm-proposal" style={{ margin: 0 }}>
            <legend style={{ fontWeight: 700, fontSize: "var(--fs-body-lg)", padding: "0 var(--space-1)" }}>{x.title}</legend>
            <div className="nm-rate nm-rate--big" role="group" aria-label="Vurdering">
              {Object.entries(p.ratings)
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .map(([k, label]) => {
                  const [emoji, ...word] = label.split(" ");
                  return (
                    <button
                      key={k}
                      type="button"
                      className="nm-btn nm-btn--secondary"
                      aria-pressed={x.rating === Number(k)}
                      onClick={() => {
                        const r = x.rating === Number(k) ? null : Number(k);
                        upd(i, { rating: r });
                        setSaid(`${x.title}: ${r === null ? "ingen vurdering" : word.join(" ")}`);
                      }}
                    >
                      <span className="nm-rate__emoji">{emoji}</span> {word.join(" ")}
                    </button>
                  );
                })}
            </div>
            {!session && !isOpen && x.rating === 1 && quickTags.length ? (
              <div className="nm-note" style={{ flexDirection: "column", gap: "var(--space-2)" }}>
                <span style={{ fontWeight: 600 }}>Hva skurret? (valgfritt)</span>
                <div className="nm-row" style={{ gap: "var(--space-2)" }} role="group" aria-label="Hva skurret?">
                  {quickTags.map((k) => chip(k, p.tags[k]))}
                </div>
              </div>
            ) : null}
            {p.rows.length > 1 ? (
              <div>
                <button type="button" className="nm-btn nm-btn--ghost nm-more" aria-expanded={isOpen} onClick={() => setOpen((o) => o.map((v, j) => (j === i ? !v : v)))}>
                  <span className="nm-more__label">Mer detaljer</span>
                  <Icon icon={isOpen ? ChevronUp : ChevronDown} />
                  {!isOpen && x.tags.length ? <span className="nm-more__count">{x.tags.length === 1 ? "1 stikkord" : `${x.tags.length} stikkord`}</span> : null}
                </button>
              </div>
            ) : null}
            {isOpen ? (
              <>
                {Object.keys(tags).length ? (
                  <div className="nm-row" style={{ gap: "var(--space-2)" }} role="group" aria-label={session ? "Stikkord for hele økta" : "Stikkord"}>
                    {Object.entries(tags).map(([k, label]) => chip(k, label))}
                  </div>
                ) : null}
                {!session ? (
                  <div className="nm-form-row">
                    <label className="nm-field">
                      <span className="nm-field__label">Faktisk tid (min){x.planned ? ` · plan ${x.planned}` : ""}</span>
                      <input className="nm-input" type="number" inputMode="numeric" min={0} max={240} value={x.actual_minutes} onChange={(e) => upd(i, { actual_minutes: e.target.value })} />
                    </label>
                    <label className="nm-field">
                      <span className="nm-field__label">Bruke igjen?</span>
                      <select className="nm-input" value={x.use_again} onChange={(e) => upd(i, { use_again: e.target.value })}>
                        <option value="">{x.rating === 3 ? "Ja (fordi 👍)" : "–"}</option>
                        {Object.entries(p.useAgain).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <label className="nm-field">
                    <span className="nm-field__label">Antall spillere som kom{"registered" in p.target && p.target.registered !== null ? ` (${p.target.registered} påmeldt)` : ""}</span>
                    <input className="nm-input" type="number" inputMode="numeric" min={0} max={200} value={x.actual_players} onChange={(e) => upd(i, { actual_players: e.target.value })} />
                  </label>
                )}
                <label className="nm-field">
                  <span className="nm-field__label">Kommentar</span>
                  <textarea className="nm-input" style={{ minHeight: 64 }} maxLength={300} value={x.body} onChange={(e) => upd(i, { body: e.target.value })} />
                </label>
              </>
            ) : null}
          </fieldset>
        );
      })}
      <div aria-live="polite" className="nm-sr-only">
        {said}
      </div>
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      <div className="nm-savebar">
        {rows.length > 1 ? (
          <span className="nm-savebar__count">
            {rated} av {rows.length}
            <small>vurdert</small>
          </span>
        ) : null}
        <button type="submit" className="nm-btn nm-btn--primary nm-btn--lg" disabled={pending}>
          <Icon icon={Save} />
          Lagre evalueringen
        </button>
      </div>
    </form>
  );
}

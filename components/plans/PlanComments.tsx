"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deletePlanCommentAction, planCommentAction } from "@/app/actions/plans";
import { Icon } from "@/components/ui/icon";

export interface PlanCommentView {
  id: number;
  version: number;
  exerciseNo: number | null;
  author: string;
  mine: boolean;
  body: string;
  when: string;
  usedIn: number | null;
}

/** Comments on the plan (for the other trainers, and as wishes when KI adjusts it). */
export function PlanComments({ groupId, planId, exercises, comments, canWrite }: { groupId: string; planId: number; exercises: string[]; comments: PlanCommentView[]; canWrite: boolean }) {
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");
  const [no, setNo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = () =>
    start(async () => {
      setError(null);
      const r = await planCommentAction({ planId, body, exerciseNo: no ? Number(no) : null });
      if (!r.ok) return setError(r.error);
      setBody("");
      setNo("");
    });
  const remove = (id: number) =>
    start(async () => {
      setError(null);
      const r = await deletePlanCommentAction(groupId, id);
      if (!r.ok) setError(r.error);
    });

  if (!comments.length && !canWrite) return null;
  return (
    <div className="nm-stack" style={{ gap: 8 }} aria-busy={pending}>
      <h3 className="nm-h3">Kommentarer</h3>
      {comments.length ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {comments.map((c) => (
            <li key={c.id} className="nm-note" style={{ display: "block" }}>
              <div className="nm-row" style={{ justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 15 }}>
                  <strong>{c.author}</strong>
                  <span className="nm-muted">
                    {" "}
                    · v{c.version}
                    {c.exerciseNo ? ` · øvelse ${c.exerciseNo}` : ""} · {c.when}
                  </span>
                </span>
                {c.mine && c.usedIn === null ? (
                  <button type="button" className="nm-iconbtn" aria-label="Slett kommentaren" onClick={() => remove(c.id)} disabled={pending}>
                    <Icon icon={Trash2} size={18} />
                  </button>
                ) : null}
              </div>
              <div>{c.body}</div>
              {c.usedIn !== null ? <div className="nm-hint">Brukt av KI i versjon {c.usedIn}</div> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      {canWrite ? (
        <form
          className="nm-stack"
          style={{ gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim()) send();
          }}
        >
          <label className="nm-sr" htmlFor={`pc-no-${planId}`}>
            Gjelder
          </label>
          <select id={`pc-no-${planId}`} className="nm-input" value={no} onChange={(e) => setNo(e.target.value)}>
            <option value="">Hele opplegget</option>
            {exercises.map((n, i) => (
              <option key={i} value={i + 1}>
                Øvelse {i + 1}: {n}
              </option>
            ))}
          </select>
          <label className="nm-sr" htmlFor={`pc-${planId}`}>
            Kommentar
          </label>
          <textarea id={`pc-${planId}`} className="nm-input" style={{ minHeight: 72 }} placeholder="Skriv en kommentar (uten navn på spillere)" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />
          <div>
            <button type="submit" className="nm-btn nm-btn--secondary" disabled={pending || !body.trim()}>
              Send kommentar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

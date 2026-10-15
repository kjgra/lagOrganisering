"use client";

import { Check, Pencil, RotateCcw, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { commentAction, proposalAction } from "@/app/actions/proposals";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { ChipView, ProposalView } from "@/lib/proposal-view";
import type { Action } from "@/lib/store/proposals";

const STATUS_BADGE: Record<string, string> = {
  approved: "nm-badge--kommer",
  pending: "nm-badge--ikke-svart",
  draft: "nm-badge--neutral",
  rejected: "nm-badge--kommer-ikke",
  rolled_back: "nm-badge--kommer-ikke",
};

const ACTION_UI: Record<Action, { label: string; icon: typeof Check; cls: string }> = {
  submit: { label: "Send til godkjenning", icon: Send, cls: "nm-btn--primary" },
  approve: { label: "Godkjenn", icon: Check, cls: "nm-btn--primary" },
  reject: { label: "Avslå", icon: X, cls: "nm-btn--secondary" },
  rollback: { label: "Rull tilbake", icon: RotateCcw, cls: "nm-btn--secondary" },
  delete: { label: "Slett", icon: Trash2, cls: "nm-btn--danger" },
};

export function MiniChip({ c }: { c: ChipView }) {
  return (
    <span className="nm-minichip" data-coach={c.coach || undefined}>
      {c.coach ? <span className="nm-chip__mark">Trener</span> : null}
      {c.name}
      {c.short.map((s, i) => (
        <span key={c.tags[i]} className="nm-chip__mark" title={c.tags[i]}>
          {s}
        </span>
      ))}
      {c.note ? <span className="nm-minichip__note">{c.note}</span> : null}
    </span>
  );
}

/** A saved proposal: teams in vest colours, status, actions, comments and history. */
export function ProposalCard({ p, editHref, eventLine }: { p: ProposalView; editHref?: string; eventLine?: { text: string; href: string } }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const act = (a: Action) =>
    start(async () => {
      setError(null);
      const r = await proposalAction(p.id, a, p.name);
      if (!r.ok) return setError(r.error);
      setConfirmDelete(false);
      if (r.message) toast(r.message);
    });

  return (
    <article className="nm-card nm-proposal" aria-busy={pending}>
      {eventLine ? (
        <Link href={eventLine.href} className="nm-muted" style={{ fontSize: "var(--fs-caption)", fontWeight: 700 }}>
          {eventLine.text}
        </Link>
      ) : null}
      <div className="nm-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "var(--fs-heading)", lineHeight: "var(--lh-heading)", fontWeight: 700 }}>{p.name}</div>
          <div className="nm-muted" style={{ fontSize: "var(--fs-body)" }}>
            {p.groups.length} lag · {p.nPlayers} spillere · Laget av {p.createdBy} · Lagret {p.updated}
          </div>
        </div>
        <div className="nm-row" style={{ gap: "var(--space-2)" }}>
          {p.lockedBy ? (
            <span className="nm-badge nm-badge--neutral">
              <Icon icon={Pencil} size={16} />
              Redigeres av {p.lockedBy}
            </span>
          ) : null}
          <span className={`nm-badge ${STATUS_BADGE[p.status] ?? "nm-badge--neutral"}`}>{p.statusLabel}</span>
        </div>
      </div>
      <div className="nm-swatches" aria-hidden="true">
        {p.groups.map((g) => (
          <span key={g.label} className={`nm-team--${g.vest}`}>
            {g.members.length}
          </span>
        ))}
      </div>
      <details>
        <summary style={{ cursor: "pointer", fontWeight: 700, minHeight: 32 }}>Vis lagene</summary>
        <div className="nm-teams" style={{ marginTop: "var(--space-2)" }}>
          {p.groups.map((g) => (
            <section key={g.label} className={`nm-team nm-team--${g.vest}`} aria-label={g.title}>
              <div className="nm-team__head">
                <span>{g.title}</span>
                <span className="nm-team__count">{g.members.length}</span>
              </div>
              <div className="nm-team__body">
                {g.members.length ? g.members.map((c) => <MiniChip key={c.id} c={c} />) : <span className="nm-muted">Ingen her</span>}
              </div>
            </section>
          ))}
        </div>
        {p.unplaced.length ? (
          <div style={{ marginTop: "var(--space-2)" }}>
            <span className="nm-muted">
              {p.unplacedLabel} ({p.unplaced.length}):
            </span>
            <div className="nm-row" style={{ gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
              {p.unplaced.map((c) => (
                <MiniChip key={c.id} c={c} />
              ))}
            </div>
          </div>
        ) : null}
      </details>
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      {confirmDelete ? (
        <div className="nm-note" role="alertdialog" aria-label={`Slette «${p.name}»?`}>
          <span style={{ flex: 1 }}>Slette «{p.name}»? Historikken beholdes, men forslaget vises ikke lenger.</span>
          <div className="nm-row" style={{ gap: "var(--space-2)" }}>
            <button type="button" className="nm-btn nm-btn--danger" onClick={() => act("delete")} disabled={pending}>
              <Icon icon={Trash2} size={20} />
              Slett
            </button>
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setConfirmDelete(false)}>
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <div className="nm-row" style={{ gap: "var(--space-2)" }}>
          {p.editable && editHref ? (
            <Link href={editHref} className="nm-btn nm-btn--secondary">
              <Icon icon={Pencil} size={20} />
              Åpne og rediger
            </Link>
          ) : null}
          {p.actions.map((a) => {
            const ui = ACTION_UI[a];
            return (
              <button
                key={a}
                type="button"
                className={`nm-btn ${ui.cls}`}
                disabled={pending}
                onClick={() => (a === "delete" ? setConfirmDelete(true) : act(a))}
              >
                <Icon icon={ui.icon} size={20} />
                {ui.label}
              </button>
            );
          })}
        </div>
      )}
      <details>
        <summary style={{ cursor: "pointer", fontWeight: 700, minHeight: 32 }}>Kommentarer ({p.comments.length})</summary>
        <div className="nm-stack" style={{ marginTop: "var(--space-2)" }}>
          {p.comments.length ? (
            p.comments.map((c, i) => (
              <div key={i}>
                <div className="nm-muted" style={{ fontSize: "var(--fs-caption)" }}>
                  <strong>{c.who}</strong> · {c.when}
                </div>
                <div>{c.text}</div>
              </div>
            ))
          ) : (
            <p className="nm-muted" style={{ margin: 0 }}>
              Ingen kommentarer ennå.
            </p>
          )}
          <form
            className="nm-row"
            style={{ flexWrap: "nowrap" }}
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                setError(null);
                const r = await commentAction(p.id, comment);
                if (!r.ok) return setError(r.error);
                setComment("");
              });
            }}
          >
            <label className="nm-sr" htmlFor={`c-${p.id}`}>
              Kommentar
            </label>
            <input id={`c-${p.id}`} className="nm-input" placeholder="Skriv en kommentar" maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
            <button type="submit" className="nm-btn nm-btn--secondary" disabled={pending || !comment.trim()}>
              Kommenter
            </button>
          </form>
          <p className="nm-muted" style={{ fontSize: "var(--fs-caption)", margin: 0 }}>
            Ikke skriv helseopplysninger eller andre sensitive opplysninger.
          </p>
        </div>
      </details>
      <details>
        <summary style={{ cursor: "pointer", fontWeight: 700, minHeight: 32 }}>Historikk</summary>
        <ul style={{ margin: "var(--space-2) 0 0", paddingLeft: "var(--space-5)" }}>
          {p.history.map((h, i) => (
            <li key={i}>
              {h.when} · <strong>{h.who}</strong> {h.text}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

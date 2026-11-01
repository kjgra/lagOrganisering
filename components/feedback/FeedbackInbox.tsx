"use client";

import { Send, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { publishFeedbackAction, rejectFeedbackAction } from "@/app/actions/feedback";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { FEEDBACK_MAX } from "@/lib/feedback";

export interface InboxItem {
  id: number;
  kindLabel: string;
  body: string;
  meta: string;
  from: string;
}

/** One waiting report: edit the text if needed, then send it to GitHub or delete it. */
export function FeedbackInboxItem({ item, canPublish }: { item: InboxItem; canPublish: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [text, setText] = useState(item.body);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const act = (f: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) =>
    start(async () => {
      setError(null);
      const r = await f();
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
    });
  const labelId = `nm-fb-${item.id}`;
  return (
    <li className="nm-card nm-stack" style={{ padding: "var(--space-3)", gap: "var(--space-3)" }} aria-busy={pending} aria-labelledby={labelId}>
      <div>
        <strong id={labelId}>{item.kindLabel}</strong>
        <div className="nm-hint">
          Fra {item.from} · {item.meta}
        </div>
      </div>
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      <label className="nm-field">
        <span className="nm-field__label">Tekst som publiseres</span>
        <textarea className="nm-input" style={{ minHeight: 110 }} value={text} maxLength={FEEDBACK_MAX} onChange={(e) => setText(e.target.value)} />
        <span className="nm-hint">Navnet på avsenderen tas ikke med. Rett teksten før du sender hvis den sier noe om en person.</span>
      </label>
      <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
        <button type="button" className="nm-btn nm-btn--primary" disabled={pending || !canPublish || !text.trim()} onClick={() => act(() => publishFeedbackAction(item.id, text))}>
          <Icon icon={Send} />
          Send til GitHub
        </button>
        {confirmDelete ? (
          <>
            <button type="button" className="nm-btn nm-btn--danger" disabled={pending} onClick={() => act(() => rejectFeedbackAction(item.id))}>
              Ja, slett
            </button>
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setConfirmDelete(false)}>
              Avbryt
            </button>
          </>
        ) : (
          <button type="button" className="nm-btn nm-btn--ghost" disabled={pending} onClick={() => setConfirmDelete(true)}>
            <Icon icon={Trash2} />
            Avvis
          </button>
        )}
      </div>
    </li>
  );
}

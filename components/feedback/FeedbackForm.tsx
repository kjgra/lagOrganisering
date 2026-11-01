"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";
import { sendFeedbackAction } from "@/app/actions/feedback";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { FEEDBACK_KINDS, FEEDBACK_MAX, type FeedbackKind } from "@/lib/feedback";

/** «Tilbakemelding»: a problem or a suggestion, in a few words. */
export function FeedbackForm({ page }: { page: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<FeedbackKind>("feil");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError(null);
      const r = await sendFeedbackAction({ kind, body, page, width: typeof window === "undefined" ? null : Math.round(window.innerWidth) });
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      setBody("");
      setSent(true);
    });
  };

  return (
    <form className="nm-stack" style={{ gap: "var(--space-4)" }} onSubmit={submit} aria-busy={pending}>
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      {sent ? (
        <p className="nm-hint" role="status" style={{ margin: 0 }}>
          Takk! Admin leser tilbakemeldingen og vurderer den. Du kan sende en til om du vil.
        </p>
      ) : null}
      <div className="nm-field">
        <span className="nm-field__label" id="nm-fb-kind">
          Hva gjelder det?
        </span>
        <div className="nm-seg" role="group" aria-labelledby="nm-fb-kind">
          {FEEDBACK_KINDS.map((k) => (
            <button key={k.key} type="button" aria-pressed={kind === k.key} onClick={() => setKind(k.key)}>
              {k.label}
            </button>
          ))}
        </div>
      </div>
      <label className="nm-field">
        <span className="nm-field__label">{kind === "feil" ? "Hva skjedde, og hva gjorde du da?" : "Hva vil du foreslå?"}</span>
        <textarea
          className="nm-input"
          style={{ minHeight: 140 }}
          value={body}
          maxLength={FEEDBACK_MAX}
          placeholder={kind === "feil" ? "F.eks. Lagforslaget ble ikke lagret da jeg trykket Lagre på trening i går." : "F.eks. Det hadde vært fint å kunne kopiere et opplegg til neste uke."}
          onChange={(e) => {
            setBody(e.target.value);
            setSent(false);
          }}
        />
        <span className="nm-hint">
          Ikke skriv navn, kontaktinfo eller helseopplysninger. Admin kan legge teksten ut offentlig på GitHub for å følge den opp. {body.length}/{FEEDBACK_MAX} tegn.
        </span>
      </label>
      <div>
        <button type="submit" className="nm-btn nm-btn--primary" disabled={pending || !body.trim()}>
          <Icon icon={Send} />
          Send tilbakemelding
        </button>
      </div>
    </form>
  );
}

"use client";

import { Check, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { applyProposalAction, rejectProposalAction } from "@/app/actions/improvements";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { REJECTION_MAX } from "@/lib/plans/improvements";

/** «Bruk», «Endre først» or «Avvis» (with one sentence on why). */
export function ProposalDecision({ groupId, id, archive, editHref, doneHref }: { groupId: string; id: number; archive: boolean; editHref: string; doneHref: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [why, setWhy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const done = (r: { ok: boolean; error?: string; message?: string }) => {
    if (!r.ok) return setError(r.error ?? "Noe gikk galt.");
    if (r.message) toast(r.message);
    router.push(doneHref);
  };
  const apply = () => start(async () => done(await applyProposalAction(groupId, id)));
  const reject = () => start(async () => done(await rejectProposalAction(groupId, id, why)));
  return (
    <div className="nm-form" style={{ maxWidth: 760 }} aria-busy={pending}>
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      {rejecting ? (
        <>
          <label className="nm-field">
            <span className="nm-field__label">Hvorfor passer ikke forslaget?</span>
            <textarea className="nm-input" style={{ minHeight: 64 }} maxLength={REJECTION_MAX} value={why} onChange={(e) => setWhy(e.target.value)} />
            <span className="nm-hint">Én setning holder. KI får den med seg neste gang.</span>
          </label>
          <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
            <button type="button" className="nm-btn nm-btn--primary" onClick={reject} disabled={pending}>
              <Icon icon={X} />
              Avvis forslaget
            </button>
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setRejecting(false)} disabled={pending}>
              Avbryt
            </button>
          </div>
        </>
      ) : (
        <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button type="button" className="nm-btn nm-btn--primary" onClick={apply} disabled={pending}>
            <Icon icon={Check} />
            {archive ? "Arkiver øvelsen" : "Bruk"}
          </button>
          {archive ? null : (
            <Link href={editHref} className="nm-btn nm-btn--secondary">
              <Icon icon={Pencil} />
              Endre først
            </Link>
          )}
          <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setRejecting(true)} disabled={pending}>
            <Icon icon={X} />
            Avvis
          </button>
        </div>
      )}
    </div>
  );
}

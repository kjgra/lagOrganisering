"use client";

import { Download, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { erasePersonAction } from "@/app/actions/admin";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

/** Download and erase what is stored about one person (request for access or erasure). */
export function PersonPanel({ groupId, memberId, name, isTrainer, empty }: { groupId: string; memberId: string; name: string; isTrainer: boolean; empty: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const href = `/api/personvern?lag=${encodeURIComponent(groupId)}&person=${encodeURIComponent(memberId)}`;
  const erase = () =>
    start(async () => {
      setError(null);
      const r = await erasePersonAction(groupId, memberId, isTrainer);
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      setConfirm(false);
    });
  return (
    <div className="nm-stack" style={{ gap: "var(--space-3)" }} aria-busy={pending}>
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      <div className="nm-row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
        <a href={href} className="nm-btn nm-btn--secondary">
          <Icon icon={Download} />
          Last ned (JSON)
        </a>
        {empty ? null : confirm ? (
          <>
            <button type="button" className="nm-btn nm-btn--danger" disabled={pending} onClick={erase}>
              Ja, slett for {name}
            </button>
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setConfirm(false)}>
              Avbryt
            </button>
          </>
        ) : (
          <button type="button" className="nm-btn nm-btn--ghost" disabled={pending} onClick={() => setConfirm(true)}>
            <Icon icon={Trash2} />
            Slett opplysningene
          </button>
        )}
      </div>
      <p className="nm-hint" style={{ margin: 0 }}>
        {isTrainer
          ? "Sletting fjerner tilganger, innstillinger og varsler. Det treneren har skrevet, blir stående uten navn. Tilgangen i appen må gis på nytt hvis treneren skal bruke den igjen."
          : "Sletting fjerner nivå, tagger, par og plassen i lagforslag i denne gruppen. Det kan ikke angres."}
      </p>
    </div>
  );
}

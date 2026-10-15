"use client";

import { Check, RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { approvePlanAction, unapprovePlanAction } from "@/app/actions/plans";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/toast";
import type { BankCandidate } from "@/lib/plans/plan";

type Choice = "save" | "variant" | "skip";

/** Approve a version (choosing which new exercises go into the bank), or undo the approval. */
export function PlanControls({ planId, version, approved, candidates }: { planId: number; version: number; approved: boolean; candidates: BankCandidate[] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<number, Choice>>(() => Object.fromEntries(candidates.map((c) => [c.index, c.default])));

  const approve = () =>
    start(async () => {
      setError(null);
      const r = await approvePlanAction({ planId, bank: candidates.map((c) => ({ index: c.index, choice: choices[c.index] ?? c.default })) });
      if (!r.ok) return setError(r.error);
      setOpen(false);
      if (r.message) toast(r.message);
    });
  const undo = () =>
    start(async () => {
      setError(null);
      const r = await unapprovePlanAction(planId);
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
    });

  return (
    <div aria-busy={pending}>
      {error && !open ? (
        <div className="nm-alert" role="alert" style={{ marginBottom: "var(--space-2)" }}>
          {error}
        </div>
      ) : null}
      {approved ? (
        <button type="button" className="nm-btn nm-btn--ghost" onClick={undo} disabled={pending}>
          <Icon icon={RotateCcw} />
          Angre godkjenning
        </button>
      ) : (
        <button type="button" className="nm-btn nm-btn--secondary" onClick={() => (candidates.length ? setOpen(true) : approve())} disabled={pending}>
          <Icon icon={Check} />
          Godkjenn versjon {version}
        </button>
      )}
      {open ? (
        <Sheet title={`Godkjenn versjon ${version}`} onClose={() => setOpen(false)} busy={pending}>
          <p style={{ margin: "0 0 var(--space-3)" }}>Opplegget har øvelser som ikke er i øvelsesbanken. Skal de lagres der som kandidater?</p>
          {error ? (
            <div className="nm-alert" role="alert" style={{ marginBottom: "var(--space-3)" }}>
              {error}
            </div>
          ) : null}
          <div className="nm-stack" style={{ gap: "var(--space-3)" }}>
            {candidates.map((c) => (
              <fieldset key={c.index} style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 700, fontSize: "var(--fs-body-lg)" }}>
                  {c.index}. {c.navn}
                  <span className="nm-muted" style={{ fontWeight: 400 }}>
                    {c.kilde === "justert" ? " · justert" : " · ny"}
                  </span>
                </legend>
                {c.match ? (
                  <p className="nm-hint" style={{ margin: "var(--space-1) 0 var(--space-1)" }}>
                    Ligner «{c.match.name}» i banken ({Math.round(c.match.score * 100)} %).
                  </p>
                ) : null}
                {(["save", ...(c.match ? (["variant"] as const) : []), "skip"] as Choice[]).map((ch) => (
                  <label key={ch} className="nm-check" style={{ minHeight: 36, padding: "var(--space-1) 0" }}>
                    <input type="radio" name={`c${c.index}`} checked={(choices[c.index] ?? c.default) === ch} onChange={() => setChoices((x) => ({ ...x, [c.index]: ch }))} />
                    {ch === "save" ? "Lagre som ny øvelse" : ch === "variant" ? `Lagre som variant av «${c.match?.name}»` : "Ikke lagre"}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <button type="button" className="nm-btn nm-btn--primary nm-btn--block" style={{ marginTop: "var(--space-4)" }} onClick={approve} disabled={pending}>
            <Icon icon={Check} />
            Godkjenn
          </button>
        </Sheet>
      ) : null}
    </div>
  );
}

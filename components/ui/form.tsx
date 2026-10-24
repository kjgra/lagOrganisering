"use client";

import { Save } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/actions";

/** Run an action with an error line and a toast. */
export function useSave() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (f: () => Promise<ActionResult<unknown>>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await f();
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      after?.();
    });
  const errorBox = error ? (
    <div className="nm-alert" role="alert">
      {error}
    </div>
  ) : null;
  return { pending, run, errorBox };
}

export function SaveButton({ pending, children = "Lagre" }: { pending: boolean; children?: ReactNode }) {
  return (
    <div>
      <button type="submit" className="nm-btn nm-btn--primary" disabled={pending}>
        <Icon icon={Save} />
        {children}
      </button>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="nm-field">
      <span className="nm-field__label">{label}</span>
      {children}
      {hint ? <span className="nm-hint">{hint}</span> : null}
    </label>
  );
}

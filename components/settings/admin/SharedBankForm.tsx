"use client";

import { Save } from "lucide-react";
import { useState, useTransition } from "react";
import { setSharedBankAction } from "@/app/actions/admin";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

export interface BankGroup {
  id: string;
  name: string;
  /** Exercises in the group's own bank. */
  exercises: number;
}

const OWN = "";

/** Superadmin: let every group use one group's exercise bank, or give each group its own. */
export function SharedBankForm({ groups, current }: { groups: BankGroup[]; current: string | null }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(current ?? OWN);
  const [error, setError] = useState<string | null>(null);
  // Exercises in other groups' own banks are hidden while a shared bank is used.
  const chosen = groups.find((g) => g.id === value);
  const hidden = value === OWN ? [] : groups.filter((g) => g.id !== value && g.exercises > 0);
  const save = () =>
    start(async () => {
      setError(null);
      const r = await setSharedBankAction(value === OWN ? null : value);
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
    });
  return (
    <div className="nm-form" style={{ maxWidth: 560 }} aria-busy={pending}>
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      <label className="nm-field">
        <span className="nm-field__label">Øvelsesbank</span>
        <select className="nm-input" value={value} onChange={(e) => setValue(e.target.value)}>
          <option value={OWN}>Hver gruppe har sin egen</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              Felles: {g.name}
            </option>
          ))}
        </select>
        {chosen ? (
          <span className="nm-hint">
            Banken til {chosen.name} har {chosen.exercises} {chosen.exercises === 1 ? "øvelse" : "øvelser"}.
          </span>
        ) : null}
      </label>
      {hidden.length ? (
        <div className="nm-note" role="status">
          {hidden.map((g) => `${g.name} har ${g.exercises} ${g.exercises === 1 ? "egen øvelse" : "egne øvelser"}`).join(", ")}. De vises ikke så lenge den felles banken brukes, men
          blir ikke slettet.
        </div>
      ) : null}
      <div>
        <button type="button" className="nm-btn nm-btn--primary" onClick={save} disabled={pending || value === (current ?? OWN)}>
          <Icon icon={Save} />
          Lagre
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { saveAiSettingsAction } from "@/app/actions/admin";
import { Field, SaveButton, useSave } from "@/components/ui/form";

// KI settings (superadmin) ------------------------------------------------------------------

export function AiSettingsForm({ initial, models, editable }: { initial: Record<string, string>; models: { id: string; label: string }[]; editable: boolean }) {
  const [v, setV] = useState(initial);
  const { pending, run, errorBox } = useSave();
  const set = (k: string) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      className="nm-form"
      style={{ maxWidth: 560 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveAiSettingsAction(v));
      }}
    >
      <fieldset disabled={!editable || pending} className="nm-form" style={{ border: 0, padding: 0, margin: 0 }}>
        <Field label="Standardmodell">
          <select className="nm-input" value={v.model} onChange={set("model")}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="nm-form-row">
          <Field label="Grense per lag (kr/mnd)">
            <input className="nm-input" inputMode="decimal" value={v.group_limit_nok} onChange={set("group_limit_nok")} />
          </Field>
          <Field label="Grense totalt (USD/mnd)">
            <input className="nm-input" inputMode="decimal" value={v.total_limit_usd} onChange={set("total_limit_usd")} />
          </Field>
          <Field label="Maks nye øvelser per opplegg">
            <input className="nm-input" inputMode="numeric" value={v.max_new_exercises} onChange={set("max_new_exercises")} />
          </Field>
          <Field label="Dollarkurs (kr)">
            <input className="nm-input" inputMode="decimal" value={v.usd_nok} onChange={set("usd_nok")} />
          </Field>
        </div>
        <Field label="Nettsteder KI kan hente lenker fra" hint="Kommaseparert, f.eks. tiim.no, fotball.no">
          <input className="nm-input" value={v.link_domains} onChange={set("link_domains")} />
        </Field>
      </fieldset>
      {errorBox}
      {editable ? <SaveButton pending={pending} /> : <p className="nm-hint">Bare superadmin kan endre KI-innstillingene.</p>}
    </form>
  );
}

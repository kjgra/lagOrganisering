"use client";

import { useTransition } from "react";
import { setTheme } from "@/app/actions/theme";

const OPTIONS = [
  { key: "light", label: "Lys" },
  { key: "dark", label: "Mørk" },
  { key: "system", label: "Som telefonen" },
];

export function ThemePicker({ current }: { current: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="nm-seg" role="group" aria-label="Tema" aria-busy={pending}>
      {OPTIONS.map((o) => (
        <button key={o.key} type="button" aria-pressed={current === o.key} onClick={() => start(() => setTheme(o.key))}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

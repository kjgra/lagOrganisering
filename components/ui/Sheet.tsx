"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/** A bottom sheet on the phone, a dialog box on desktop. Escape or the backdrop closes it. */
export function Sheet({ title, onClose, busy, children }: { title: string; onClose: () => void; busy?: boolean; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="nm-sheet-wrap">
      <div className="nm-backdrop" onClick={onClose} />
      <div className="nm-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy}>
        <div className="nm-sheet__handle" />
        <div className="nm-sheet__head">
          <h2 id={titleId}>{title}</h2>
          <button ref={close} type="button" className="nm-iconbtn nm-iconbtn--outline" aria-label="Lukk" onClick={onClose}>
            <Icon icon={X} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

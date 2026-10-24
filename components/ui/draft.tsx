"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/Sheet";

/**
 * Unsaved work on the phone: a local draft (only ids and settings, never
 * names) kept while editing, and a light check before leaving the page.
 * localStorage can be missing (private mode), so every access is guarded.
 */

const MAX_AGE_MS = 7 * 24 * 3600_000;

interface Stored<T> {
  at: number;
  value: T;
}

function read<T>(key: string): Stored<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored<T>;
    return typeof s?.at === "number" && Date.now() - s.at < MAX_AGE_MS ? s : null;
  } catch {
    return null;
  }
}

/** Saves `value` under `key` while `dirty`, and offers an earlier draft once on mount. */
export function useLocalDraft<T>(key: string, value: T, dirty: boolean) {
  const [saved, setSaved] = useState<Stored<T> | null>(null);
  useEffect(() => {
    // Read once after mount: the server render has no localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(read<T>(key));
  }, [key]);
  useEffect(() => {
    if (!dirty) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
    } catch {
      /* no storage: the draft is simply not kept */
    }
  }, [key, value, dirty]);
  const clear = useCallback(() => {
    setSaved(null);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);
  const dismiss = useCallback(() => setSaved(null), []);
  return { saved, clear, dismiss };
}

/** «Du har en ulagret kladd fra kl. 18:40» with «Fortsett» and «Forkast». */
export function DraftNote({ at, onRestore, onDiscard }: { at: number; onRestore: () => void; onDiscard: () => void }) {
  const t = new Date(at);
  const today = t.toDateString() === new Date().toDateString();
  const when = `${today ? "" : `${t.getDate()}.${t.getMonth() + 1}. `}kl. ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  return (
    <div className="nm-note nm-draftnote" role="status">
      <span style={{ flex: 1 }}>Du har ulagrede endringer fra {when} på denne enheten.</span>
      <span className="nm-row" style={{ gap: "var(--space-2)" }}>
        <button type="button" className="nm-btn nm-btn--secondary" onClick={onRestore}>
          Fortsett der du slapp
        </button>
        <button type="button" className="nm-btn nm-btn--ghost" onClick={onDiscard}>
          Forkast
        </button>
      </span>
    </div>
  );
}

/**
 * While `when` is true: a link out of the page asks first (in a bottom sheet,
 * not a browser dialog), and closing or reloading the page gets the browser's
 * own warning.
 */
export function LeaveGuard({ when, text }: { when: boolean; text: string }) {
  const router = useRouter();
  const [to, setTo] = useState<string | null>(null);
  useEffect(() => {
    if (!when) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.closest(".nm-sheet")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setTo(url.pathname + url.search + url.hash);
    };
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [when]);
  if (!to) return null;
  return (
    <Sheet title="Gå uten å lagre?" onClose={() => setTo(null)}>
      <p style={{ marginTop: 0, fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)" }}>{text}</p>
      <div className="nm-stack">
        <button type="button" className="nm-btn nm-btn--primary nm-btn--block" onClick={() => setTo(null)}>
          Bli her
        </button>
        <button
          type="button"
          className="nm-btn nm-btn--secondary nm-btn--block"
          onClick={() => {
            const href = to;
            setTo(null);
            router.push(href);
          }}
        >
          <Icon icon={LogOut} />
          Gå uten å lagre
        </button>
      </div>
    </Sheet>
  );
}

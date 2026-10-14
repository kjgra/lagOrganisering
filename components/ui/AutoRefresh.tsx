"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Reloads the server data every `seconds` while the tab is visible, so
 * proposals, locks and tags from other trainers show up. Coming back to the
 * tab reloads at once. Skipped while a text field has focus.
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const busy = () => {
      const a = document.activeElement;
      return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA") ;
    };
    const tick = () => {
      if (document.visibilityState === "visible" && !busy() && !document.querySelector(".nm-sheet")) router.refresh();
    };
    const t = setInterval(tick, seconds * 1000);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router, seconds]);
  return null;
}

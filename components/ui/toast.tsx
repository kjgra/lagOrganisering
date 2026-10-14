"use client";

import { Check } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icon";

/**
 * Confirmation toast: a dark pill with a yellow edge, «Forslag 3 lagret».
 * No modals at the pitch. Messages are also announced to screen readers.
 */

const ToastContext = createContext<(text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((t: string) => {
    setText(t);
    setN((x) => x + 1);
  }, []);
  useEffect(() => {
    if (!text) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(null), 3200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, n]);
  return (
    <ToastContext value={show}>
      {children}
      <div aria-live="polite" className="nm-sr">
        {text}
      </div>
      {text ? (
        <div className="nm-toast" role="status" key={n}>
          <Icon icon={Check} size={20} />
          {text}
        </div>
      ) : null}
    </ToastContext>
  );
}

export function useToast(): (text: string) => void {
  return useContext(ToastContext);
}

/** Shows a toast once when `text` is set, e.g. from a server redirect (?melding=...). */
export function ToastOnMount({ text }: { text: string | null | undefined }) {
  const toast = useToast();
  const shown = useRef(false);
  useEffect(() => {
    if (text && !shown.current) {
      shown.current = true;
      toast(text);
    }
  }, [text, toast]);
  return null;
}

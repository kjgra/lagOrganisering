"use client";

import { Check } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icon";

/**
 * Confirmation toast: a dark pill with a yellow edge, «Forslag 3 lagret».
 * No modals at the pitch. Messages are also announced to screen readers.
 * The toast sits just above the action bar and bottom menu, a tap closes it,
 * and it can carry one action such as «Angre».
 */

export interface ToastAction {
  label: string;
  run: () => void;
}

type Show = (text: string, action?: ToastAction) => void;

const ToastContext = createContext<Show>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ text: string; action?: ToastAction; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const n = useRef(0);
  const show = useCallback<Show>((text, action) => {
    n.current += 1;
    setToast({ text, action, n: n.current });
  }, []);
  useEffect(() => {
    if (!toast) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), toast.action ? 6000 : 3200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);
  return (
    <ToastContext value={show}>
      {children}
      <div aria-live="polite" className="nm-sr">
        {toast?.text}
      </div>
      {toast ? (
        <div className="nm-toast" role="status" key={toast.n} onClick={() => setToast(null)}>
          <Icon icon={Check} size={20} />
          <span className="nm-toast__text">{toast.text}</span>
          {toast.action ? (
            <button
              type="button"
              className="nm-toast__action"
              onClick={(e) => {
                e.stopPropagation();
                toast.action?.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </ToastContext>
  );
}

export function useToast(): Show {
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

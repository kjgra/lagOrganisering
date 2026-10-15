"use client";

import { ChevronDown, Star, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { SubRow, subKey, useFavorites } from "@/components/groups/GroupRows";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { PickerMain } from "@/lib/groups";
import { ctxPath } from "@/lib/routes";

interface SwitcherData {
  groups: PickerMain[];
  favorites: string[];
  recent: string[];
  current: string;
  /** The section to open in the new group, e.g. "/arrangementer". */
  section: string;
  currentMain: string;
  currentSub: string;
}

const Ctx = createContext<{ open: (trigger: HTMLElement | null) => void; data: SwitcherData } | null>(null);

/**
 * Change group without leaving the screen: a bottom sheet on phones, a panel
 * next to the group selector on desktop. Favourites, «Sist brukt» (up to 3
 * that are not favourites) and «Alle grupper».
 */
export function GroupSwitcherProvider({ data, children }: { data: SwitcherData; children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <Ctx
      value={{
        data,
        open: (t) => {
          trigger.current = t;
          setOpen(true);
        },
      }}
    >
      {children}
      {isOpen ? <Sheet data={data} onClose={close} /> : null}
    </Ctx>
  );
}

function Sheet({ data, onClose }: { data: SwitcherData; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const { favorites, toggle } = useFavorites(data.favorites);
  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const many = data.groups.length > 1;
  const find = (key: string) => {
    const [g, s] = key.split(":");
    const main = data.groups.find((x) => x.id === g);
    const sub = main?.subs.find((x) => x.id === s);
    return main && sub ? { main, sub } : null;
  };
  const favs = favorites.map(find).filter((x) => x !== null);
  const recent = data.recent
    .filter((k) => !favorites.includes(k) && k !== data.current)
    .map(find)
    .filter((x) => x !== null)
    .slice(0, 3);
  const pick = (main: PickerMain, subId: string) => {
    onClose();
    toast(`Byttet til ${main.subs.find((s) => s.id === subId)?.name}`);
    router.push(ctxPath(main.id, subId, data.section));
  };
  const row = ({ main, sub }: { main: PickerMain; sub: PickerMain["subs"][number] }) => {
    const key = subKey(main.id, sub.id);
    return (
      <SubRow
        key={key}
        main={main}
        sub={sub}
        showMain={many}
        current={data.current === key}
        favorite={favorites.includes(key)}
        onPick={() => pick(main, sub.id)}
        onToggle={() => toggle(key, !favorites.includes(key))}
      />
    );
  };

  return (
    <div className="nm-sheet-wrap">
      <div className="nm-backdrop" onClick={onClose} />
      <div className="nm-sheet" role="dialog" aria-modal="true" aria-labelledby="nm-sw-t">
        <div className="nm-sheet__handle" />
        <div className="nm-sheet__head">
          <h2 id="nm-sw-t">Bytt gruppe</h2>
          <button ref={closeBtn} type="button" className="nm-iconbtn nm-iconbtn--outline" aria-label="Lukk" onClick={onClose}>
            <Icon icon={X} />
          </button>
        </div>
        {favs.length ? (
          <>
            <h3 className="nm-section-label" style={{ marginTop: 0 }}>
              <Icon icon={Star} size={16} /> Favoritter
            </h3>
            <ul className="nm-list nm-groups">{favs.map(row)}</ul>
          </>
        ) : null}
        {recent.length ? (
          <>
            <h3 className="nm-section-label">Sist brukt</h3>
            <ul className="nm-list nm-groups">{recent.map(row)}</ul>
          </>
        ) : null}
        {!favs.length && !recent.length ? (
          <p className="nm-muted" style={{ fontSize: "var(--fs-body)" }}>
            Ingen favoritter ennå. Trykk på stjerna ved en gruppe under «Alle grupper».
          </p>
        ) : null}
        <button
          type="button"
          className="nm-btn nm-btn--secondary nm-btn--block"
          style={{ marginTop: "var(--space-4)" }}
          onClick={() => {
            onClose();
            router.push("/velg-gruppe");
          }}
        >
          <Icon icon={Users} />
          Alle grupper
        </button>
      </div>
    </div>
  );
}

/** «Gutter 2016 · Nymark IL – Fotball · Bytt ▾» at the top of the main pages on phones. */
export function ContextCard() {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  return (
    <button
      type="button"
      className="nm-context nm-phone-only"
      aria-haspopup="dialog"
      onClick={(e) => ctx.open(e.currentTarget)}
    >
      <span>
        <span className="nm-context__sub">{ctx.data.currentSub}</span>
        <span className="nm-context__main">{ctx.data.currentMain}</span>
      </span>
      <span className="nm-context__go">
        Bytt
        <Icon icon={ChevronDown} size={20} />
      </span>
    </button>
  );
}

/** The group selector in the side menu on desktop. */
export function SideGroupSelect() {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  return (
    <div className="nm-side__group">
      <span className="nm-side__label">Gruppe</span>
      <button
        type="button"
        className="nm-select"
        aria-haspopup="dialog"
        aria-label={`Bytt gruppe – nå: ${ctx.data.currentSub}`}
        onClick={(e) => ctx.open(e.currentTarget)}
      >
        <span>
          <span className="nm-select__main">{ctx.data.currentMain}</span>
          <span className="nm-select__sub">└ {ctx.data.currentSub}</span>
        </span>
        <Icon icon={ChevronDown} />
      </button>
    </div>
  );
}

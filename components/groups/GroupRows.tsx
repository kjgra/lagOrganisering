"use client";

import { Check, Star } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/preferences";
import { Icon } from "@/components/ui/icon";
import type { PickerMain, PickerSub } from "@/lib/groups";

export const subKey = (mainId: string, subId: string | null) => `${mainId}:${subId ?? ""}`;

/** Favourites with optimistic updates; the server keeps the truth. */
export function useFavorites(initial: string[]) {
  const [favorites, setOptimistic] = useOptimistic(initial, (cur: string[], change: { key: string; on: boolean }) =>
    change.on ? [...cur, change.key] : cur.filter((x) => x !== change.key),
  );
  const [, start] = useTransition();
  const toggle = (key: string, on: boolean) =>
    start(async () => {
      setOptimistic({ key, on });
      await toggleFavorite(key, on);
    });
  return { favorites, toggle };
}

export function StarButton({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="nm-iconbtn nm-star"
      aria-pressed={on}
      aria-label={on ? `Fjern ${label} fra favoritter` : `Legg ${label} til i favoritter`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <Icon icon={Star} size={24} />
    </button>
  );
}

/** A subgroup row: the whole row picks the group; the star is its own button. */
export function SubRow({
  main,
  sub,
  showMain,
  current,
  favorite,
  onPick,
  onToggle,
}: {
  main: PickerMain;
  sub: PickerSub;
  showMain?: boolean;
  current: boolean;
  favorite: boolean;
  onPick: () => void;
  onToggle: () => void;
}) {
  return (
    <li className={current ? "nm-grow is-current" : "nm-grow"}>
      <button type="button" className="nm-grow__main" onClick={onPick} aria-current={current ? "true" : undefined}>
        <span className="nm-grow__name">
          {current ? <Icon icon={Check} size={20} /> : null}
          {sub.name}
        </span>
        <span className="nm-grow__meta">{showMain ? main.name : `${sub.members} medlemmer`}</span>
      </button>
      <StarButton on={favorite} label={sub.name} onToggle={onToggle} />
    </li>
  );
}

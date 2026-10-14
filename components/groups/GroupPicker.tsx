"use client";

import { ChevronLeft, ChevronRight, Info, Search, Star, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import type { PickerMain } from "@/lib/groups";
import { ctxPath } from "@/lib/routes";
import { SubRow, subKey, useFavorites } from "./GroupRows";

/**
 * Choose main group and subgroup, with favourites first. One main group:
 * its subgroups are shown directly. Phone: two steps; desktop: main groups
 * on the left, subgroups on the right.
 */
export function GroupPicker({
  groups,
  favorites: initialFavorites,
  current,
}: {
  groups: PickerMain[];
  favorites: string[];
  current: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const single = groups.length === 1;
  const currentMain = current?.split(":")[0];
  const [step, setStep] = useState<"main" | "sub">(single ? "sub" : "main");
  const [mainId, setMainId] = useState(groups.find((g) => g.id === currentMain)?.id ?? groups[0]?.id);
  const [q, setQ] = useState("");
  const { favorites, toggle } = useFavorites(initialFavorites);
  const title = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (moved.current && step === "sub") title.current?.focus();
  }, [step, mainId]);

  const main = groups.find((g) => g.id === mainId) ?? groups[0];
  if (!main) return <p>Du har ingen grupper.</p>;

  const pick = (m: PickerMain, subId: string | null) => {
    const name = subId ? m.subs.find((s) => s.id === subId)?.name : m.name;
    toast(`Åpnet ${name}`);
    router.push(ctxPath(m.id, subId, "/arrangementer"));
  };

  const favs = groups.flatMap((g) => g.subs.filter((s) => favorites.includes(subKey(g.id, s.id))).map((s) => ({ g, s })));
  const query = q.trim().toLowerCase();
  const list = main.subs.filter((s) => !query || s.name.toLowerCase().includes(query));
  const mainFavs = list.filter((s) => favorites.includes(subKey(main.id, s.id)));
  const rest = list.filter((s) => !favorites.includes(subKey(main.id, s.id)));
  const row = (m: PickerMain, s: PickerMain["subs"][number], showMain = false) => {
    const key = subKey(m.id, s.id);
    return (
      <SubRow
        key={key}
        main={m}
        sub={s}
        showMain={showMain}
        current={current === key}
        favorite={favorites.includes(key)}
        onPick={() => pick(m, s.id)}
        onToggle={() => toggle(key, !favorites.includes(key))}
      />
    );
  };

  return (
    <>
      <h1 className="nm-page-title">Velg gruppe</h1>
      <p className="nm-picker-lead">
        {single
          ? "Velg undergruppa du skal jobbe med."
          : `Du er med i ${groups.length} hovedgrupper. Velg undergruppa du skal jobbe med.`}
      </p>
      <div className={`nm-picker is-step-${step}${single ? " is-single" : ""}`}>
        {favs.length ? (
          <section className="nm-fav-all">
            <h2 className="nm-section-label" style={{ marginTop: 0 }}>
              <Icon icon={Star} size={16} /> Favoritter
            </h2>
            <ul className="nm-list nm-groups">{favs.map(({ g, s }) => row(g, s, true))}</ul>
          </section>
        ) : (
          <div className="nm-note nm-fav-all">
            <Icon icon={Star} />
            <span>Trykk på stjerna ved en gruppe du bruker ofte. Favorittene dine ligger øverst her og i gruppebytteren.</span>
          </div>
        )}
        <section className="nm-picker__main">
          <h2 className="nm-section-label">Hovedgrupper</h2>
          <ul className="nm-list nm-groups">
            {groups.map((g) => {
              const sel = g.id === main.id;
              return (
                <li key={g.id} className={sel ? "nm-grow is-selected" : "nm-grow"}>
                  <button
                    type="button"
                    className="nm-grow__main"
                    aria-current={sel ? "true" : undefined}
                    onClick={() => {
                      moved.current = true;
                      setMainId(g.id);
                      setStep("sub");
                      setQ("");
                    }}
                  >
                    <span className="nm-grow__name">{g.name}</span>
                    <span className="nm-grow__meta">
                      {g.subs.length} undergrupper · {g.members} medlemmer
                    </span>
                  </button>
                  <span className="nm-grow__go">
                    <Icon icon={ChevronRight} size={24} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="nm-picker__sub">
          {!single ? (
            <button
              type="button"
              className="nm-btn nm-btn--ghost nm-phone-only"
              style={{ paddingLeft: 4, margin: "0 0 4px -4px" }}
              onClick={() => setStep("main")}
            >
              <Icon icon={ChevronLeft} />
              Hovedgrupper
            </button>
          ) : null}
          <h2 className="nm-picker__title" ref={title} tabIndex={-1}>
            {main.name}
          </h2>
          {main.subs.length > 6 ? (
            <label className="nm-search">
              <span className="nm-sr">Søk i undergrupper</span>
              <Icon icon={Search} />
              <input
                className="nm-input"
                type="search"
                placeholder={`Søk i ${main.subs.length} undergrupper`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
          ) : null}
          <ul className="nm-list nm-groups" style={{ marginTop: 12 }}>
            <li className={current === subKey(main.id, null) ? "nm-grow is-current" : "nm-grow"}>
              <button type="button" className="nm-grow__main" onClick={() => pick(main, null)}>
                <span className="nm-grow__name">
                  <Icon icon={Users} size={20} />
                  Alle i hovedgruppa
                </span>
                <span className="nm-grow__meta">{main.members} medlemmer · for å fordele hele gruppa</span>
              </button>
            </li>
          </ul>
          {mainFavs.length ? (
            <>
              <h3 className="nm-section-label">
                <Icon icon={Star} size={16} /> Favoritter
              </h3>
              <ul className="nm-list nm-groups">{mainFavs.map((s) => row(main, s))}</ul>
            </>
          ) : null}
          <h3 className="nm-section-label">Undergrupper</h3>
          {rest.length ? (
            <ul className="nm-list nm-groups">{rest.map((s) => row(main, s))}</ul>
          ) : (
            <p className="nm-muted" style={{ fontSize: 16 }}>
              {query ? `Ingen treff på «${q}».` : "Ingen undergrupper."}
            </p>
          )}
        </section>
      </div>
      <p className="nm-muted nm-picker-foot">
        <Icon icon={Info} size={18} />
        Valget huskes. Neste gang åpner appen rett i gruppa du brukte sist.
      </p>
    </>
  );
}

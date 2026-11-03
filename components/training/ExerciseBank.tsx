"use client";

import { ArrowRightLeft, ClipboardCheck, Flame, Footprints, Goal, type LucideIcon, Pencil, RotateCcw, SearchX, Shapes, Shield, Sparkles, Swords, Users, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { DrawingSvg } from "@/components/plans/DrawingSvg";
import { Icon } from "@/components/ui/icon";
import { FILTER_KEYS, NO_FILTERS, RATING_FILTERS, filtersFrom, hasFilters, matches, type BankFilters, type BankItem } from "@/lib/plans/bank-filter";

/** The width where the bank becomes a grid of cards with thumbnails and filters (matches globals.css). */
const WIDE = "(min-width: 1024px)";

function useWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(WIDE);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  oppvarming: Flame,
  ballmestring: Footprints,
  pasning_mottak: ArrowRightLeft,
  vending: RotateCcw,
  avslutning: Goal,
  angrep: Swords,
  forsvar: Shield,
  smaaspill: Users,
};

export type Options = [key: string, label: string][];

export interface BankOptions {
  alder: Options;
  tema: Options;
  aktivitet: Options;
  delf: Options;
  kategori: Options;
}

const STATUS_BADGE: Record<string, string> = {
  active: "nm-badge--kommer",
  candidate: "nm-badge--ikke-svart",
};

/**
 * The exercise bank: a list on a phone, and on a wide screen a grid of cards with a thumbnail
 * (the exercise's drawing, or a made-up one from its category) and filters. One markup, so the
 * links and buttons are the same in both.
 */
export function ExerciseBank({
  items,
  base,
  ai,
  fresh,
  statuses,
  options,
}: {
  items: BankItem[];
  /** «…/trening/ovelser». */
  base: string;
  /** The trainer may use KI: the pencil is «Juster med KI». */
  ai: boolean;
  /** A new exercise from «Ny øvelse med KI», marked. */
  fresh: number | null;
  statuses: Record<string, string>;
  options: BankOptions;
}) {
  const wide = useWide();
  const params = useSearchParams();
  const [f, setF] = useState<BankFilters>(() => filtersFrom(params));
  // A phone has no filters, so it shows everything even when the URL has some.
  const active = wide && hasFilters(f);
  const shown = active ? items.filter((b) => matches(b, f)) : items;
  const ids = new Set(shown.map((b) => b.id));

  const update = (next: BankFilters) => {
    setF(next);
    // In the URL, so «Tilbake» from an exercise comes back to the same filters (no server round trip).
    const sp = new URLSearchParams(window.location.search);
    for (const k of FILTER_KEYS) {
      if (next[k]) sp.set(k, next[k]);
      else sp.delete(k);
    }
    const qs = sp.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  };
  const set = (k: keyof BankFilters) => (e: { target: { value: string } }) => update({ ...f, [k]: e.target.value });

  const select = (k: keyof BankFilters, label: string, opts: Options) => (
    <label className="nm-field">
      <span className="nm-field__label">{label}</span>
      <select className="nm-input" value={f[k]} onChange={set(k)}>
        <option value="">Alle</option>
        {opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="nm-bank-wrap">
      <div role="search" className="nm-bank-filters nm-wide-only" aria-label="Filtrer øvelsene">
        <label className="nm-field nm-bank-filters__q">
          <span className="nm-field__label">Søk i navn</span>
          <input className="nm-input" type="search" value={f.q} maxLength={80} onChange={set("q")} />
        </label>
        {select("alder", "Aldersbånd", options.alder)}
        {select("tema", "Hovedtema", options.tema)}
        {select("aktivitet", "Aktivitet", options.aktivitet)}
        {select("delf", "Delferdighet", options.delf)}
        {select("kategori", "Kategori", options.kategori)}
        {select(
          "vurdering",
          "Vurdering",
          Object.entries(RATING_FILTERS).filter(([r]) => items.some((b) => b.rating === r)),
        )}
        <div className="nm-bank-filters__count">
          <p className="nm-hint" role="status" style={{ margin: 0 }}>
            {active ? `Viser ${shown.length} av ${items.length} øvelser` : `${items.length} øvelser`}
          </p>
          {hasFilters(f) ? (
            <button type="button" className="nm-btn nm-btn--ghost" onClick={() => update(NO_FILTERS)}>
              <Icon icon={X} />
              Nullstill filtre
            </button>
          ) : null}
        </div>
      </div>
      {shown.length ? null : (
        <div className="nm-note">
          <Icon icon={SearchX} />
          <span>Ingen øvelser passer filtrene.</span>
        </div>
      )}
      <div className="nm-bank-grid">
        {options.kategori.map(([c, label]) =>
          shown.some((b) => b.category === c) ? (
            <section key={c} className="nm-section">
              <h3 className="nm-section-label">{label}</h3>
              <ul className="nm-list nm-bank" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {items
                  .filter((b) => b.category === c && ids.has(b.id))
                  .map((b) => (
                    <li key={b.id} id={`ovelse-${b.id}`} className={b.id === fresh ? "nm-pick nm-pick--new" : "nm-pick"}>
                      <Link href={`${base}/${b.id}/vis`} className="nm-thumb" tabIndex={-1} aria-hidden="true">
                        {b.drawing ? <DrawingSvg drawing={b.drawing} title={`Tegning av ${b.name}`} /> : <MadeThumb item={b} />}
                        </Link>
                      <div className="nm-pick__main">
                      <span className="nm-pick__cat">{label}</span>
                        <Link
                          href={`${base}/${b.id}/vis`}
                          style={{
                            fontWeight: 700,
                            textDecoration: "underline",
                          }}
                        >
                          {b.name}
                        </Link>
                        <div className="nm-hint">{b.summary}</div>
                        {b.nff ? <div className="nm-hint">NFF: {b.nff}</div> : null}
                      </div>
                      <div className="nm-pick__end">
                        {b.id === fresh ? (
                          <span className="nm-badge nm-badge--neutral">
                            <Icon icon={Sparkles} />
                            Ny
                          </span>
                        ) : null}
                        {b.avoid ? <span className="nm-badge nm-badge--kommer-ikke">Unngås av KI</span> : null}
                        <span className={`nm-badge ${STATUS_BADGE[b.status] ?? "nm-badge--neutral"}`}>{statuses[b.status] ?? b.status}</span>
                        <Link href={`${base}/${b.id}/evaluering`} className="nm-btn nm-btn--ghost" aria-label={`Evaluer ${b.name}`} title="Evaluer øvelsen">
                          <Icon icon={ClipboardCheck} />
                        </Link>
                        {ai ? (
                          <Link href={`${base}/${b.id}/ki`} className="nm-btn nm-btn--ghost" aria-label={`Juster ${b.name} med KI`} title="Juster med KI">
                            <Icon icon={Sparkles} />
                          </Link>
                        ) : (
                          <Link href={`${base}/${b.id}`} className="nm-btn nm-btn--ghost" aria-label={`Endre ${b.name}`} title="Endre øvelsen">
                            <Icon icon={Pencil} />
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null,
        )}
      </div>
    </div>
  );
}

/** A thumbnail for an exercise without a drawing: a pitch with the category's icon, and time and players. */
function MadeThumb({ item }: { item: BankItem }) {
  return (
    <span className="nm-thumb__made">
      <svg viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true">
        <rect x="6" y="6" width="148" height="88" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="80" y1="6" x2="80" y2="94" stroke="currentColor" strokeWidth="2" />
        <circle cx="80" cy="50" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="6" y="34" width="14" height="32" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="140" y="34" width="14" height="32" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className="nm-thumb__icon">
        <Icon icon={CATEGORY_ICONS[item.category] ?? Shapes} size={30} />
      </span>
      {item.facts ? <span className="nm-thumb__facts">{item.facts}</span> : null}
    </span>
  );
}

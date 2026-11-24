"use client";

import { Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { addTagAction, removeTagAction, setLevelAction, setPairAction } from "@/app/actions/tags";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { LEVELS } from "@/lib/levels";
import type { PairKind } from "@/lib/store/tags";

export interface TagTarget {
  memberId: string;
  name: string;
  tags: string[];
  suggestions: string[];
  level: number | null;
  /** Ids of the players this one plays well with. */
  pairs: string[];
  /** Ids of the players this one should not be on the same team with. */
  apart: string[];
}

export interface PlayerName {
  id: string;
  name: string;
}

/**
 * Edit a player's level, who they play well with, who they should not be on
 * the same team with (no reason is asked or stored), and their tags in a sheet.
 * `players` are the players that can be paired, and names for those already paired.
 */
export function TagSheet({ groupId, target, players, onClose }: { groupId: string; target: TagTarget; players: PlayerName[]; onClose: () => void }) {
  const toast = useToast();
  const [tags, setTags] = useState(target.tags);
  const [level, setLevel] = useState(target.level);
  const [pairs, setPairs] = useState(target.pairs);
  const [apart, setApart] = useState(target.apart);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const add = (tag: string) =>
    start(async () => {
      setError(null);
      const r = await addTagAction(groupId, target.memberId, tag);
      if (!r.ok) return setError(r.error);
      setTags((t) => (t.includes(r.data) ? t : [...t, r.data].sort((a, b) => a.localeCompare(b, "nb"))));
      setText("");
      toast(`${target.name} fikk taggen «${r.data}»`);
    });
  const remove = (tag: string) =>
    start(async () => {
      setError(null);
      const r = await removeTagAction(groupId, target.memberId, tag);
      if (!r.ok) return setError(r.error);
      setTags((t) => t.filter((x) => x !== tag));
    });

  const changeLevel = (l: number | null) =>
    start(async () => {
      setError(null);
      const r = await setLevelAction(groupId, target.memberId, l);
      if (!r.ok) return setError(r.error);
      setLevel(l);
      toast(l ? `${target.name} har nivå ${l}` : `${target.name} har ikke nivå`);
    });
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "Tidligere medlem";
  /** A pair has one kind: adding it as one kind takes it out of the other. */
  const pair = (id: string, paired: boolean, kind: PairKind) =>
    start(async () => {
      setError(null);
      const r = await setPairAction(groupId, target.memberId, id, paired, kind);
      if (!r.ok) return setError(r.error);
      const [set, other] = kind === "apart" ? [setApart, setPairs] : [setPairs, setApart];
      set((ps) => (paired ? [...ps, id] : ps.filter((x) => x !== id)));
      if (paired) other((ps) => ps.filter((x) => x !== id));
      if (paired) toast(kind === "apart" ? `${target.name} og ${nameOf(id)} settes på hvert sitt lag` : `${target.name} og ${nameOf(id)} spiller godt sammen`);
    });
  const candidates = players.filter((p) => p.id !== target.memberId && !pairs.includes(p.id) && !apart.includes(p.id));

  const suggestions = target.suggestions.filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()));
  return (
    <div className="nm-sheet-wrap">
      <div className="nm-backdrop" onClick={onClose} />
      <div className="nm-sheet" role="dialog" aria-modal="true" aria-labelledby="nm-tag-t" aria-busy={pending}>
        <div className="nm-sheet__handle" />
        <div className="nm-sheet__head">
          <h2 id="nm-tag-t">Tagger for {target.name}</h2>
          <button ref={close} type="button" className="nm-iconbtn nm-iconbtn--outline" aria-label="Lukk" onClick={onClose}>
            <Icon icon={X} />
          </button>
        </div>
        {error ? (
          <div className="nm-alert" role="alert" style={{ marginBottom: "var(--space-3)" }}>
            {error}
          </div>
        ) : null}
        <h3 className="nm-section-label" style={{ marginTop: 0 }} id="nm-level-t">
          Nivå
        </h3>
        <div className="nm-seg" role="group" aria-labelledby="nm-level-t">
          <button type="button" aria-pressed={level === null} disabled={pending} onClick={() => level !== null && changeLevel(null)}>
            Ingen
          </button>
          {LEVELS.map((l) => (
            <button key={l} type="button" aria-pressed={level === l} disabled={pending} onClick={() => level !== l && changeLevel(l)}>
              {l}
            </button>
          ))}
        </div>
        <PairSection
          title="Spiller godt med"
          pickLabel="Legg til spiller som spiller godt med"
          empty="Ingen valgt. Lagfordelingen prøver å sette dem på samme lag."
          chosen={pairs}
          candidates={candidates}
          nameOf={nameOf}
          pending={pending}
          onChange={(id, on) => pair(id, on, "together")}
        />
        <PairSection
          title="Bør ikke være på samme lag"
          pickLabel="Legg til spiller som ikke bør være på samme lag"
          empty="Ingen valgt. Lagfordelingen prøver å sette dem på hvert sitt lag. Ikke skriv hvorfor noe sted."
          chosen={apart}
          candidates={candidates}
          nameOf={nameOf}
          pending={pending}
          onChange={(id, on) => pair(id, on, "apart")}
        />
        <h3 className="nm-section-label">Tagger</h3>
        {tags.length ? (
          <div className="nm-row" style={{ gap: "var(--space-2)" }}>
            {tags.map((t) => (
              <button key={t} type="button" className="nm-chip" style={{ cursor: "pointer" }} onClick={() => remove(t)} aria-label={`Fjern ${t}`}>
                {t}
                <Icon icon={X} size={18} />
              </button>
            ))}
          </div>
        ) : (
          <p className="nm-muted" style={{ margin: 0 }}>
            Ingen tagger.
          </p>
        )}
        {suggestions.length ? (
          <>
            <h3 className="nm-section-label">Legg til</h3>
            <div className="nm-row" style={{ gap: "var(--space-2)" }}>
              {suggestions.slice(0, 12).map((s) => (
                <button key={s} type="button" className="nm-chip" style={{ cursor: "pointer" }} onClick={() => add(s)}>
                  <Icon icon={Plus} size={18} />
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : null}
        <form
          className="nm-row"
          style={{ marginTop: "var(--space-4)", flexWrap: "nowrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) add(text);
          }}
        >
          <label className="nm-sr" htmlFor="nm-new-tag">
            Ny tag
          </label>
          <input id="nm-new-tag" className="nm-input" value={text} maxLength={40} placeholder="Ny tag" onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="nm-btn nm-btn--secondary" disabled={pending || !text.trim()}>
            Legg til
          </button>
        </form>
        <p className="nm-muted" style={{ fontSize: "var(--fs-caption)", lineHeight: "var(--lh-caption)", marginBottom: 0 }}>
          Nivå, par og tagger gjelder hele hovedgruppa og vises bare for trenere med tilgang til tagger. Ikke skriv helseopplysninger eller andre sensitive opplysninger.
        </p>
      </div>
    </div>
  );
}

/** The chosen players of one kind of pair (tap to remove), and players to add, with search when there are many. */
function PairSection({
  title,
  pickLabel,
  empty,
  chosen,
  candidates,
  nameOf,
  pending,
  onChange,
}: {
  title: string;
  /** Name of the group of players to add, for screen readers. */
  pickLabel: string;
  empty: string;
  chosen: string[];
  candidates: PlayerName[];
  nameOf: (id: string) => string;
  pending: boolean;
  onChange: (id: string, on: boolean) => void;
}) {
  const [find, setFind] = useState("");
  const query = find.trim().toLowerCase();
  const found = candidates.filter((p) => !query || p.name.toLowerCase().includes(query));
  return (
    <>
      <h3 className="nm-section-label">{title}</h3>
      {chosen.length ? (
        <div className="nm-row" style={{ gap: "var(--space-2)" }}>
          {chosen.map((id) => (
            <button key={id} type="button" className="nm-chip" style={{ cursor: "pointer" }} disabled={pending} onClick={() => onChange(id, false)} aria-label={`Fjern ${nameOf(id)}`}>
              {nameOf(id)}
              <Icon icon={X} size={18} />
            </button>
          ))}
        </div>
      ) : (
        <p className="nm-muted" style={{ margin: 0 }}>
          {empty}
        </p>
      )}
      {candidates.length ? (
        <>
          {candidates.length > 8 ? (
            <label className="nm-search">
              <span className="nm-sr">Søk etter spiller</span>
              <Icon icon={Search} />
              <input className="nm-input" type="search" placeholder="Søk etter spiller" value={find} onChange={(e) => setFind(e.target.value)} />
            </label>
          ) : null}
          <div className="nm-row nm-pairpick" role="group" aria-label={pickLabel}>
            {found.map((p) => (
              <button
                key={p.id}
                type="button"
                className="nm-chip"
                disabled={pending}
                onClick={() => {
                  onChange(p.id, true);
                  setFind("");
                }}
                aria-label={`Legg til ${p.name}`}
              >
                <Icon icon={Plus} size={18} />
                {p.name}
              </button>
            ))}
            {!found.length ? <p className="nm-muted" style={{ margin: 0 }}>Ingen spillere passer søket.</p> : null}
          </div>
        </>
      ) : null}
    </>
  );
}

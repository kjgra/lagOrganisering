"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { addTagAction, removeTagAction } from "@/app/actions/tags";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

export interface TagTarget {
  memberId: string;
  name: string;
  tags: string[];
  suggestions: string[];
}

/** Edit a player's tags in a sheet: remove, add a suggestion, or write a new one. */
export function TagSheet({ groupId, target, onClose }: { groupId: string; target: TagTarget; onClose: () => void }) {
  const toast = useToast();
  const [tags, setTags] = useState(target.tags);
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
        <h3 className="nm-section-label" style={{ marginTop: 0 }}>
          Har nå
        </h3>
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
          Tagger gjelder hele hovedgruppa. Ikke skriv helseopplysninger eller andre sensitive opplysninger.
        </p>
      </div>
    </div>
  );
}

import { aktivitetLabel, tagLabel } from "@/lib/nff/fagplan";
import { EDIT_FIELDS, exerciseChanges } from "@/lib/plans/exercise-edits";
import { bandLabel } from "@/lib/plans/observations";
import type { ExerciseValues } from "@/lib/plans/exercise-values";
import { CATEGORIES, EXERCISE_STATUSES } from "@/lib/plans/plan";

/** A field as text: lists joined, keys as their names. */
function show(k: keyof ExerciseValues, v: ExerciseValues): string {
  const x = v[k];
  if (k === "nff_tags") return v.nff_tags.map((t) => tagLabel(t) ?? t).join("\n");
  if (k === "bands") return v.bands.map(bandLabel).join(", ");
  if (k === "nff_activity") return aktivitetLabel(v.nff_activity) ?? v.nff_activity;
  if (Array.isArray(x)) return x.join(", ");
  if (k === "category") return CATEGORIES[x] ?? x;
  if (k === "status") return EXERCISE_STATUSES[x] ?? x;
  return x;
}

/** One side, with the lines that are not on the other side struck through (before) or marked (after). */
function Side({ text, other, mark }: { text: string; other: string; mark: "del" | "ins" }) {
  const there = new Set(other.split("\n").map((l) => l.trim()));
  const lines = text.split("\n");
  const Tag = mark;
  return (
    <div className="nm-diff__side">
      <strong className="nm-hint" style={{ display: "block" }}>
        {mark === "del" ? "Før" : "Etter"}
      </strong>
      {text.trim() ? (
        lines.map((l, i) => <span key={i}>{l.trim() && !there.has(l.trim()) ? <Tag>{l}</Tag> : l || " "}</span>)
      ) : (
        <span className="nm-hint">(tomt)</span>
      )}
    </div>
  );
}

/** Before and after for each field the proposal changes; for a new exercise (`fresh`) only what it will be. */
export function ProposalDiff({ before, after, fresh = false }: { before: ExerciseValues; after: ExerciseValues; fresh?: boolean }) {
  const keys = Object.keys(exerciseChanges(before, after)) as (keyof ExerciseValues)[];
  if (!keys.length) return <p className="nm-hint">Forslaget endrer ingenting i øvelsen.</p>;
  if (fresh)
    return (
      <div className="nm-diff">
        {(Object.keys(EDIT_FIELDS) as (keyof ExerciseValues)[])
          .filter((k) => k !== "drawing" && k !== "status" && show(k, after).trim())
          .map((k) => (
            <section key={k} className="nm-diff__field" aria-label={EDIT_FIELDS[k]}>
              <h3 className="nm-h3" style={{ margin: 0 }}>
                {EDIT_FIELDS[k]}
              </h3>
              <div className="nm-diff__side">{show(k, after)}</div>
            </section>
          ))}
        {after.drawing ? (
          <p className="nm-hint" style={{ margin: 0 }}>
            Øvelsen har en tegning. Velg «Endre først» for å se den.
          </p>
        ) : null}
      </div>
    );
  return (
    <div className="nm-diff">
      {keys.map((k) => (
        <section key={k} className="nm-diff__field" aria-label={EDIT_FIELDS[k]}>
          <h3 className="nm-h3" style={{ margin: 0 }}>
            {EDIT_FIELDS[k]}
          </h3>
          {k === "drawing" ? (
            <p className="nm-hint" style={{ margin: 0 }}>
              Tegningen er endret. Velg «Endre først» for å se den nye.
            </p>
          ) : (
            <div className="nm-diff__pair">
              <Side text={show(k, before)} other={show(k, after)} mark="del" />
              <Side text={show(k, after)} other={show(k, before)} mark="ins" />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

import { EDIT_FIELDS, exerciseChanges } from "@/lib/plans/exercise-edits";
import type { ExerciseValues } from "@/lib/plans/exercise-values";
import { CATEGORIES, EXERCISE_STATUSES } from "@/lib/plans/plan";

/** A field as text: lists joined, keys as their names. */
function show(k: keyof ExerciseValues, v: ExerciseValues): string {
  const x = v[k];
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

/** Before and after for each field the proposal changes. */
export function ProposalDiff({ before, after }: { before: ExerciseValues; after: ExerciseValues }) {
  const keys = Object.keys(exerciseChanges(before, after)) as (keyof ExerciseValues)[];
  if (!keys.length) return <p className="nm-hint">Forslaget endrer ingenting i øvelsen.</p>;
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

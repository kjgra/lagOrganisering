import { CircleAlert, ThumbsUp, TrendingDown } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { shortDate } from "@/lib/format";
import { meanText } from "@/lib/plans/feedback";
import { OBSERVATION_KINDS, patternText, TREND_TEXT, type Pattern } from "@/lib/plans/observations";
import type { StoredPattern } from "@/lib/store/observations";

/**
 * «Dette sier trenerne»: what the evaluations of an exercise add up to, from
 * the latest analysis. Patterns (said often enough) first, with the trainers'
 * own suggestions; what only a few have said is listed briefly below.
 */
export function TrainersSay({ p, minSessions, minTrainers }: { p: StoredPattern; minSessions: number; minTrainers: number }) {
  const strong = p.patterns.filter((x) => x.pattern);
  const weak = p.patterns.filter((x) => !x.pattern);
  if (!p.ratings && !p.patterns.length && !p.trend) return null;
  const item = (x: Pattern) => (
    <li key={x.kind} style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-start" }}>
      <Icon icon={x.positive ? ThumbsUp : CircleAlert} size={20} />
      <span>
        <strong>{x.positive ? "Styrke" : "Problem"}:</strong> {patternText(x)}
        {x.suggestions.length ? (
          <span className="nm-hint" style={{ display: "block" }}>
            Forslag fra trenerne: {x.suggestions.map((s) => `«${s}»`).join(", ")}
          </span>
        ) : null}
      </span>
    </li>
  );
  return (
    <section className="nm-card nm-proposal" aria-labelledby="say-h" style={{ maxWidth: 760, marginBottom: "var(--space-4)" }}>
      <h2 id="say-h" className="nm-h3" style={{ margin: 0 }}>
        Dette sier trenerne
      </h2>
      {p.score !== null ? (
        <p style={{ margin: 0 }}>
          Vektet snitt {meanText(p.score)} av 3 fra {p.ratings} {p.ratings === 1 ? "vurdering" : "vurderinger"}
        </p>
      ) : null}
      {p.trend ? (
        <p style={{ margin: 0, display: "flex", gap: "var(--space-2)", alignItems: "flex-start" }}>
          <Icon icon={TrendingDown} size={20} />
          <span>
            <strong>Synker:</strong> {TREND_TEXT[p.trend]}
          </span>
        </p>
      ) : null}
      {strong.length ? <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "var(--space-2)" }}>{strong.map(item)}</ul> : null}
      {weak.length ? (
        <p className="nm-hint" style={{ margin: 0 }}>
          Nevnt av færre: {weak.map((x) => `${OBSERVATION_KINDS[x.kind]?.label ?? x.kind} (${x.count})`).join(", ")}
        </p>
      ) : null}
      <p className="nm-hint" style={{ margin: 0 }}>
        Oppdatert {shortDate(p.computed_at)}. Et innspill blir et mønster når det kommer fra minst {minSessions} økter eller {minTrainers} trenere.
      </p>
    </section>
  );
}

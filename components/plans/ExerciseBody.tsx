import { DrawingPlayer } from "@/components/plans/DrawingPlayer";
import type { PlanExercise } from "@/lib/plans/plan";

function Lines({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="nm-h3" style={{ margin: "var(--space-3) 0 var(--space-1)", fontSize: "var(--fs-body)" }}>{title}</h4>
      <ul className="nm-plan-list">
        {items.map((t, i) => (
          <li key={i}>{t.replaceAll("**", "")}</li>
        ))}
      </ul>
    </div>
  );
}

/** The content of an exercise: drawing, organisation, execution and so on. */
export function ExerciseBody({ e }: { e: PlanExercise }) {
  return (
    <>
      {e.fokus ? <p style={{ margin: "0 0 var(--space-2)" }}>Fokus: {e.fokus.replaceAll("**", "")}</p> : null}
      {e.tegning ? <DrawingPlayer drawing={e.tegning} title={`Tegning av ${e.navn}`} /> : null}
      <Lines title="Organisering" items={e.organisering} />
      <Lines title="Gjennomføring" items={e.gjennomforing} />
      <Lines title="Tilpasning" items={e.tilpasning} />
      <Lines title="Læringsmomenter" items={e.laeringsmomenter} />
      <Lines title="Spørsmål til spillerne" items={e.sporsmal} />
      <Lines title="Variasjoner" items={[e.enklere && `Enklere: ${e.enklere}`, e.vanskeligere && `Vanskeligere: ${e.vanskeligere}`].filter(Boolean)} />
      {e.nff_url ? (
        <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--fs-caption)" }}>
          Kilde:{" "}
          <a href={e.nff_url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            {e.nff_url}
          </a>
        </p>
      ) : null}
    </>
  );
}

/** One exercise, folded. `n` is its number, or null for the common warm-up. */
export function ExerciseDetails({ e, n, open }: { e: PlanExercise; n: number | null; open?: boolean }) {
  return (
    <details className="nm-exercise" open={open}>
      <summary style={{ cursor: "pointer", fontSize: "var(--fs-body-lg)", fontWeight: 700, minHeight: 32 }}>
        {n === null ? `Felles oppvarming: ${e.navn}` : `${n}. ${e.navn}`}
        <span className="nm-muted" style={{ fontWeight: 400 }}>
          {e.kategori && n !== null ? ` · ${e.kategori}` : ""}
          {e.kilde === "ny" ? " · ny" : e.kilde === "justert" ? " · justert" : ""}
        </span>
      </summary>
      <div style={{ paddingTop: "var(--space-2)" }}>
        <ExerciseBody e={e} />
      </div>
    </details>
  );
}

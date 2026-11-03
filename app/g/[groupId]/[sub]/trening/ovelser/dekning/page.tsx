import { AlertTriangle, Check, Download, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/icon";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { AKTIVITET_SHORT, CELL_GOAL, DELF_GOAL, TEMA_SHORT, coverage, coverageGaps } from "@/lib/nff/coverage";
import { AKTIVITETER, BAND_KEYS, HOVEDTEMA, aktivitetLabel } from "@/lib/nff/fagplan";
import { EXERCISE_STATUSES } from "@/lib/plans/plan";
import { listExercises } from "@/lib/store/training";

type Level = "ok" | "lite" | "tom";
const LEVEL: Record<Level, { word: string; badge: string; icon: LucideIcon }> = {
  ok: { word: "Nok", badge: "nm-badge--kommer", icon: Check },
  lite: { word: "For få", badge: "nm-badge--ikke-svart", icon: AlertTriangle },
  tom: { word: "Ingen", badge: "nm-badge--kommer-ikke", icon: X },
};
// «Ingen» only when the cell has nothing at all: candidates are on their way.
const level = (good: number, all: number, goal: number): Level => (good >= goal ? "ok" : all > 0 ? "lite" : "tom");
const band = (b: string) => `${b.replace("-", "–")} år`;
const n = (x: number, one: string, many: string) => `${x} ${x === 1 ? one : many}`;

/** «Dekning»: how well the exercise bank covers NFF's fagplan, for every trainer. */
export default async function CoveragePage(props: PageProps<"/g/[groupId]/[sub]/trening/ovelser/dekning">) {
  const ctx = await contextFromParams(props.params);
  const picked = String((await props.searchParams).celle ?? "");
  const bank = await listExercises(await db(), ctx.user.access, ctx.group.id);
  const c = coverage(bank);
  const base = ctx.path("/trening/ovelser");
  const here = `${base}/dekning`;
  const full = c.cells.filter((x) => x.good >= CELL_GOAL).length;
  const empty = c.cells.filter((x) => !x.exercises.length).length;
  const cell = c.cells.find((x) => x.key === picked);
  const gaps = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(coverageGaps(c), null, 2))}`;
  return (
    <AppShell ctx={ctx} title="Dekning av fagplanen" section="training" back={base}>
      <p style={{ marginTop: 0 }}>
        {full} av {c.cells.length} celler har minst {CELL_GOAL} gode øvelser, og {empty} har ingen. En celle er aldersbånd, hovedtema og aktivitet fra NFFs fagplan. <em>Gode</em> er aktive øvelser som KI ikke unngår. Kandidater vises, men teller ikke før de er prøvd.
      </p>
      <p className="nm-hint nm-row" style={{ gap: "var(--space-3)" }}>
        {(["ok", "lite", "tom"] as Level[]).map((l) => (
          <span key={l} className={`nm-badge ${LEVEL[l].badge}`}>
            <Icon icon={LEVEL[l].icon} />
            {LEVEL[l].word}
          </span>
        ))}
        <span>Trykk på en celle for å se øvelsene.</span>
      </p>
      {c.untagged ? (
        <p className="nm-hint">
          {n(c.untagged, "øvelse", "øvelser")} mangler aldersbånd, hovedtema eller aktivitet, og er ikke med her.
        </p>
      ) : null}
      {cell ? (
        <section className="nm-card" id="celle" aria-labelledby="celle-tittel" style={{ margin: "var(--space-4) 0", padding: "var(--space-3) var(--space-4)" }}>
          <h2 id="celle-tittel" className="nm-section-label" style={{ marginTop: 0 }}>
            {band(cell.band)} · {HOVEDTEMA.find((t) => t.key === cell.tema)?.label} · {aktivitetLabel(cell.aktivitet)}
          </h2>
          {cell.exercises.length ? (
            <ul style={{ margin: 0, paddingLeft: "var(--space-5)" }}>
              {cell.exercises.map((e) => (
                <li key={e.id}>
                  <Link href={`${base}/${e.id}/vis`} style={{ textDecoration: "underline" }}>
                    {e.name}
                  </Link>{" "}
                  <span className="nm-hint">({e.good ? "god" : (EXERCISE_STATUSES[e.status] ?? e.status).toLowerCase()})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0 }}>Ingen øvelser ennå.</p>
          )}
        </section>
      ) : null}
      {BAND_KEYS.map((b) => (
        <section key={b} className="nm-section">
          <h3 className="nm-section-label">{band(b)}</h3>
          <div className="nm-scroll-x">
            <table className="nm-table nm-coverage">
              <thead>
                <tr>
                  <th scope="col">Hovedtema</th>
                  {AKTIVITETER.map((a) => (
                    <th key={a.key} scope="col" title={a.label}>
                      {AKTIVITET_SHORT[a.key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOVEDTEMA.filter((t) => t.bands.includes(b)).map((t) => (
                  <tr key={t.key}>
                    <th scope="row">{TEMA_SHORT[t.key] ?? t.label}</th>
                    {AKTIVITETER.map((a) => {
                      const x = c.cells.find((y) => y.key === `${b}.${t.key}.${a.key}`)!;
                      const l = LEVEL[level(x.good, x.exercises.length, CELL_GOAL)];
                      return (
                        <td key={a.key}>
                          <Link
                            href={`${here}?celle=${x.key}#celle`}
                            className={`nm-badge ${l.badge}`}
                            aria-current={x.key === picked ? "true" : undefined}
                            aria-label={`${band(b)}, ${t.label}, ${a.label}: ${l.word}, ${n(x.good, "god", "gode")}, ${n(x.candidates, "kandidat", "kandidater")}`}
                          >
                            <Icon icon={l.icon} size={16} />
                            {x.good}
                            {x.candidates ? <span className="nm-coverage__cand">+{x.candidates}</span> : null}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="nm-hint">Tallet er gode øvelser, +tallet er kandidater. Målet er minst {CELL_GOAL} gode i hver celle.</p>
      <section className="nm-section">
        <h3 className="nm-section-label">Delferdigheter</h3>
        <p className="nm-hint" style={{ marginTop: 0 }}>
          Gode øvelser med delferdigheten som fokus, per aldersbånd. Målet er minst {DELF_GOAL}.
        </p>
        <div className="nm-scroll-x">
          <table className="nm-table nm-coverage">
            <thead>
              <tr>
                <th scope="col">Delferdighet</th>
                {BAND_KEYS.map((b) => (
                  <th key={b} scope="col">
                    {band(b)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...new Set(c.delf.map((d) => d.key))].map((key) => (
                <tr key={key}>
                  <th scope="row">{c.delf.find((d) => d.key === key)!.label}</th>
                  {BAND_KEYS.map((b) => {
                    const d = c.delf.find((x) => x.key === key && x.band === b);
                    if (!d) return <td key={b} className="nm-hint">–</td>;
                    const l = LEVEL[level(d.good, d.good + d.candidates, DELF_GOAL)];
                    return (
                      <td key={b}>
                        <span className={`nm-badge ${l.badge}`} aria-label={`${d.label}, ${band(b)}: ${l.word}, ${n(d.good, "god", "gode")}, ${n(d.candidates, "kandidat", "kandidater")}`}>
                          <Icon icon={l.icon} size={16} />
                          {d.good}
                          {d.candidates ? <span className="nm-coverage__cand">+{d.candidates}</span> : null}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p>
        <a href={gaps} download="dekning-hull.json" className="nm-btn nm-btn--secondary">
          <Icon icon={Download} />
          Last ned hullene
        </a>
      </p>
      <p className="nm-hint">Lista over celler og delferdigheter som mangler øvelser, som bestilling på neste serie.</p>
    </AppShell>
  );
}

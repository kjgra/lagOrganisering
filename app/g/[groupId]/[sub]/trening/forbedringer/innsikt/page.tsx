import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { ImprovementTabs } from "@/components/training/ImprovementTabs";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { osloMonthStart, osloParts } from "@/lib/format";
import { meanText } from "@/lib/plans/feedback";
import { bestCombinations, improvementEffects, lastMonths, MEASURED_AFTER, monthName, monthRows, percent, totals } from "@/lib/plans/learning-stats";
import { bandLabel } from "@/lib/plans/observations";
import { improvedVersions, planRows, sessionRatings, sharedCombinations } from "@/lib/store/learning-stats";
import { listExercises } from "@/lib/store/training";

/** Months shown. */
const MONTHS = 6;

const meanOr = (m: number | null, n: number) => (m === null ? "–" : `${meanText(m)} (${n})`);

/** «Innsikt»: whether KI gets better, from what trainers kept, changed and rated. Counts only, for every team together. */
export default async function InsightPage(props: PageProps<"/g/[groupId]/[sub]/trening/forbedringer/innsikt">) {
  const ctx = await contextFromParams(props.params);
  const d = await db();
  const now = new Date();
  const since = osloMonthStart(now, MONTHS - 1);
  const { access } = ctx.user;
  const [plans, ratings, versions, combos, bank] = await Promise.all([
    planRows(d, access, ctx.group.id, since),
    sessionRatings(d, access, ctx.group.id, since),
    improvedVersions(d, access, ctx.group.id),
    sharedCombinations(d, access, ctx.group.id),
    listExercises(d, access, ctx.group.id),
  ]);
  const t = osloParts(now);
  const rows = monthRows(plans, ratings, lastMonths(t.year, t.month, MONTHS));
  const sum = totals(rows);
  const live = bank.filter((b) => b.status !== "archived");
  const name = new Map(bank.map((b) => [b.code, b.name]));
  const best = bestCombinations(combos, new Set(live.map((b) => b.code)));
  const effects = improvementEffects(versions);
  const measured = effects.filter((e) => e.measured);
  const better = measured.filter((e) => (e.after.mean ?? 0) > (e.before.mean ?? 0));
  const base = ctx.path("/trening/forbedringer");
  const used = rows.some((r) => r.kiSessions || r.kiRatings || r.ownRatings);

  return (
    <AppShell ctx={ctx} title="Forbedringer" section="training" back={ctx.path("/trening/ovelser")}>
      <ImprovementTabs ctx={ctx} current="innsikt" />
      <p style={{ marginTop: 0, maxWidth: 760 }}>
        Blir KI bedre? Tallene er fra alle lagene sammen, de siste {MONTHS} månedene: hva trenerne beholdt av KI-oppleggene, og hvordan de vurderte øktene. Bare tall, ingen navn
        eller tekst.
      </p>

      <div className="nm-figures" style={{ maxWidth: 1040 }}>
        <section className="nm-card nm-figure nm-figure--main" aria-labelledby="quick-h">
          <h2 id="quick-h" className="nm-h3">
            Hurtigopplegg brukt uendret
          </h2>
          <span className="nm-figure__value">{percent(sum.quickUnchanged, sum.quick)}</span>
          <span className="nm-hint">
            {sum.quick
              ? `${sum.quickUnchanged} av ${sum.quick} godkjente hurtigopplegg uten at øvelser ble byttet. Jo høyere, jo bedre treffer KI uten ønsker.`
              : "Ingen hurtigopplegg er godkjent ennå."}
          </span>
        </section>
        <section className="nm-card nm-figure" aria-labelledby="kept-h">
          <h2 id="kept-h" className="nm-h3">
            KI-øvelser beholdt
          </h2>
          <span className="nm-figure__value">{percent(sum.kept, sum.kiExercises)}</span>
          <span className="nm-hint">{sum.kiExercises ? `${sum.kept} av ${sum.kiExercises} øvelser i KI-opplegg var med i det godkjente opplegget.` : "Ingen KI-opplegg er godkjent ennå."}</span>
        </section>
        <section className="nm-card nm-figure" aria-labelledby="mean-h">
          <h2 id="mean-h" className="nm-h3">
            Snitt for KI-økter
          </h2>
          <span className="nm-figure__value">{sum.kiMean === null ? "–" : meanText(sum.kiMean)}</span>
          <span className="nm-hint">
            {sum.kiMean === null
              ? "Ingen KI-økter er vurdert ennå."
              : `Av 3, fra ${sum.kiRatings} vurderinger av hele økta.${sum.ownMean === null ? "" : ` Økter uten KI: ${meanText(sum.ownMean)} fra ${sum.ownRatings}.`}`}
          </span>
        </section>
      </div>

      <section className="nm-section" aria-labelledby="month-h" style={{ maxWidth: 760 }}>
        <h2 id="month-h" className="nm-section-label">
          Per måned
        </h2>
        {used ? (
          <div className="nm-scroll-x">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>Måned</th>
                  <th className="num">KI-økter, snitt</th>
                  <th className="num">Uten KI, snitt</th>
                  <th className="num">Beholdt</th>
                  <th className="num">Hurtig uendret</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.month}>
                    <td>{monthName(r.month)}</td>
                    <td className="num">{meanOr(r.kiMean, r.kiRatings)}</td>
                    <td className="num">{meanOr(r.ownMean, r.ownRatings)}</td>
                    <td className="num">{percent(r.kept, r.kiExercises)}</td>
                    <td className="num">{r.quick ? `${r.quickUnchanged} av ${r.quick}` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="nm-hint">Snitt av 3 for hele økta, med antall vurderinger i parentes. Beholdt: andelen av KI-øvelsene som var med i det godkjente opplegget.</p>
          </div>
        ) : (
          <p className="nm-hint" style={{ marginTop: 0 }}>
            Ingen økter er godkjent eller vurdert de siste {MONTHS} månedene.
          </p>
        )}
      </section>

      <section className="nm-section" aria-labelledby="best-h" style={{ maxWidth: 760 }}>
        <h2 id="best-h" className="nm-section-label">
          Øvelser som fungerer godt sammen
        </h2>
        {best.size ? (
          [...best].map(([band, list]) => (
            <div key={band}>
              <h3 style={{ fontSize: "var(--fs-body)", margin: "var(--space-2) 0 var(--space-1)" }}>{bandLabel(band)}</h3>
              <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
                {list.map((i) => (
                  <li key={i.key}>
                    {i.codes.map((c) => name.get(c) ?? c).join(" + ")}{" "}
                    <span className="nm-hint">
                      · snitt {meanText(i.mean)} fra {i.sessions} økter, {i.groups} lag
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="nm-hint" style={{ marginTop: 0 }}>
            Ingen ennå. Når øvelser i samme økt får snitt 2,5 eller mer fra flere lag, vises de her per aldersgruppe.
          </p>
        )}
      </section>

      <section className="nm-section" aria-labelledby="effect-h" style={{ maxWidth: 760 }}>
        <h2 id="effect-h" className="nm-section-label">
          Virker forbedringene?
        </h2>
        {effects.length ? (
          <>
            <p style={{ marginTop: 0 }}>
              {measured.length
                ? `${better.length} av ${measured.length} målte forbedringer fikk høyere snitt enn versjonen før.`
                : `Ingen forbedringer er målt ennå. Det skjer når både versjonen før og etter har minst ${MEASURED_AFTER} vurderinger.`}
            </p>
            <div className="nm-scroll-x">
              <table className="nm-table">
                <thead>
                  <tr>
                    <th>Øvelse</th>
                    <th className="num">Før</th>
                    <th className="num">Etter</th>
                  </tr>
                </thead>
                <tbody>
                  {effects.slice(0, 20).map((e) => (
                    <tr key={`${e.code}-${e.version}`}>
                      <td>
                        {name.get(e.code) ?? e.code} <span className="nm-hint">v{e.version}</span>
                      </td>
                      <td className="num">{meanOr(e.before.mean, e.before.n)}</td>
                      <td className="num">{e.measured || e.after.n ? meanOr(e.after.mean, e.after.n) : "venter"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="nm-hint" style={{ marginTop: 0 }}>
            Ingen forslag fra{" "}
            <Link href={base} style={{ textDecoration: "underline" }}>
              Forbedringer
            </Link>{" "}
            er tatt i bruk ennå.
          </p>
        )}
      </section>
    </AppShell>
  );
}

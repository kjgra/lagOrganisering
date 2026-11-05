import { AlertTriangle, Check, Download, Minus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/icon";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { MONTH_NAMES, osloParts } from "@/lib/format";
import { teamBand } from "@/lib/nff/bands";
import { seasonCheck, seasonGaps, type MonthStatus } from "@/lib/nff/season-check";
import { linkName } from "@/lib/nff/theme-link";
import { getTeamSettings, listExercises, listSeason } from "@/lib/store/training";

const STATUS: Record<MonthStatus, { word: string; badge: string; icon: LucideIcon }> = {
  koblet: { word: "Koblet", badge: "nm-badge--kommer", icon: Check },
  "ikke-koblet": { word: "Ikke koblet", badge: "nm-badge--ikke-svart", icon: AlertTriangle },
  "telles-ikke": { word: "Telles ikke", badge: "nm-badge--kommer-ikke", icon: Minus },
};
const short = (m: number) => MONTH_NAMES[m - 1].slice(0, 3);

/** «Sjekk mot NFF»: what the season plan covers of NFF's fagplan, and whether the bank has exercises for it. */
export default async function SeasonCheckPage(props: PageProps<"/g/[groupId]/[sub]/trening/arshjul/nff">) {
  const ctx = await contextFromParams(props.params);
  const sp = await props.searchParams;
  const now = osloParts(new Date());
  const year = Number(typeof sp.ar === "string" ? sp.ar : "") || now.year;
  const sub = ctx.subgroup?.id ?? "";
  const d = await db();
  const [{ rows }, team, bank] = await Promise.all([
    listSeason(d, ctx.user.access, ctx.group.id, sub, year),
    getTeamSettings(d, ctx.user.access, ctx.group.id, sub),
    listExercises(d, ctx.user.access, ctx.group.id),
  ]);
  const back = ctx.path(`/trening/arshjul?ar=${year}`);
  const band = teamBand(team.birth_year, year);
  if (!band) {
    return (
      <AppShell ctx={ctx} title="Sjekk mot NFF" section="training" back={back}>
        <p>
          Sett lagets fødselsår under <Link href={ctx.path("/trening/laget")}>Laget</Link>, så vet appen hvilket aldersbånd i NFFs fagplan årshjulet skal sjekkes mot.
        </p>
      </AppShell>
    );
  }
  const c = seasonCheck(rows, band, bank);
  const gaps = seasonGaps(c);
  const missing = [...gaps.hovedtema_uten_maaned, ...gaps.delferdigheter_uten_maaned];
  const unlinked = c.months.filter((m) => m.status === "ikke-koblet");
  const thin = c.months.filter((m) => m.status === "koblet" && m.good < c.goal);
  const nGaps = missing.length + unlinked.length;
  const covered = (xs: { months: number[] }[]) => `${xs.filter((x) => x.months.length).length}/${xs.length}`;
  const download = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ ar: year, ...gaps }, null, 2))}`;
  return (
    <AppShell ctx={ctx} title="Sjekk mot NFF" section="training" back={back}>
      <p style={{ marginTop: 0 }}>
        Årshjulet for {year} sammenlignet med NFFs fagplan for {band.replace("-", "–")} år. Egne ord i årshjulet kobles til NFFs begreper, og den samme koblingen bruker KI.
      </p>
      {!rows.length ? (
        <p>Årshjulet for {year} er tomt.</p>
      ) : (
        <>
          <div className="nm-season-check__tiles">
            <div className="nm-card nm-season-check__tile">
              <strong>{covered(c.hovedtema)}</strong>
              <span className="nm-hint">hovedtema</span>
            </div>
            <div className="nm-card nm-season-check__tile">
              <strong>{covered(c.delferdigheter)}</strong>
              <span className="nm-hint">delferdigheter</span>
            </div>
            <div className="nm-card nm-season-check__tile">
              <strong>
                {c.sides.angrep} : {c.sides.forsvar}
              </strong>
              <span className="nm-hint">mnd angrep : forsvar</span>
            </div>
          </div>

          <section className="nm-section" aria-labelledby="hull">
            <h2 id="hull" className="nm-section-label">
              {nGaps ? `${nGaps} hull` : "Ingen hull"}
            </h2>
            {nGaps ? (
              <ul className="nm-season-check__gaps">
                {missing.map((label) => (
                  <li key={label}>
                    <span className="nm-badge nm-badge--ikke-svart">
                      <Icon icon={AlertTriangle} />
                      Mangler
                    </span>{" "}
                    <strong>{label}</strong> har ingen måned.
                  </li>
                ))}
                {unlinked.map((m) => (
                  <li key={m.month}>
                    <span className="nm-badge nm-badge--ikke-svart">
                      <Icon icon={AlertTriangle} />
                      Ikke koblet
                    </span>{" "}
                    <strong>{MONTH_NAMES[m.month - 1]}</strong>: «{m.theme}» kan ikke kobles til NFF. Bruk et mer konkret tema, for eksempel et hovedtema eller en delferdighet.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="nm-hint">Alle NFFs hovedtema og delferdigheter for aldersbåndet har minst én måned.</p>
            )}
          </section>

          <section className="nm-section" aria-labelledby="maaneder">
            <h2 id="maaneder" className="nm-section-label">Månedene</h2>
            <div className="nm-scroll-x">
              <table className="nm-table">
                <thead>
                  <tr>
                    <th scope="col">Måned</th>
                    <th scope="col">NFF</th>
                    <th scope="col">Øvelser</th>
                  </tr>
                </thead>
                <tbody>
                  {c.months.map((m) => {
                    const s = STATUS[m.status];
                    const terms = [...(m.link?.hovedtema ?? []), ...(m.link?.delferdigheter ?? [])].map((t) => linkName(m.link, t));
                    if (m.link?.learningPoints.length) terms.push(`${m.link.learningPoints.length} ${m.link.learningPoints.length === 1 ? "læringsmoment" : "læringsmomenter"}`);
                    return (
                      <tr key={m.month}>
                        <th scope="row">
                          {short(m.month)}
                          <div className="nm-hint" style={{ fontWeight: 400 }}>
                            {m.theme}
                          </div>
                        </th>
                        <td>
                          {terms.length ? (
                            terms.join(", ")
                          ) : (
                            <span className={`nm-badge ${s.badge}`}>
                              <Icon icon={s.icon} />
                              {s.word}
                            </span>
                          )}
                        </td>
                        <td>
                          {m.status === "koblet" ? (
                            <span className={`nm-badge ${m.good >= c.goal ? "nm-badge--kommer" : "nm-badge--ikke-svart"}`} aria-label={`${m.good} gode øvelser, ${m.good >= c.goal ? "nok" : "for få"}`}>
                              <Icon icon={m.good >= c.goal ? Check : AlertTriangle} size={16} />
                              {m.good}
                            </span>
                          ) : (
                            <span className="nm-hint">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="nm-hint">Øvelser er gode øvelser i banken for aldersbåndet med minst én av månedens NFF-tagger. Målet er minst {c.goal}.</p>
          </section>

          <section className="nm-section" aria-labelledby="hvor">
            <h2 id="hvor" className="nm-section-label">Hvor finnes hva</h2>
            <table className="nm-table">
              <tbody>
                {[...c.hovedtema, ...c.delferdigheter].map((t) => (
                  <tr key={t.tag}>
                    <th scope="row" style={{ fontWeight: t.tag.startsWith("tema.") ? 700 : 400 }}>
                      {t.label}
                    </th>
                    <td>
                      {t.months.length ? (
                        t.months.map(short).join(", ")
                      ) : (
                        <span className="nm-badge nm-badge--ikke-svart">
                          <Icon icon={AlertTriangle} />
                          Ingen
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {nGaps || thin.length ? (
            <>
              <p>
                <a href={download} download={`arshjul-${year}-hull.json`} className="nm-btn nm-btn--secondary">
                  <Icon icon={Download} />
                  Last ned hullene
                </a>
              </p>
              <p className="nm-hint">Hullene og månedene med for få øvelser, som bestilling på nye øvelser.</p>
            </>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

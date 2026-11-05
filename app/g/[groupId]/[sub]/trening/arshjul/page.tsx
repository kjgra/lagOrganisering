import { ListChecks } from "lucide-react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { AppShell } from "@/components/shell/AppShell";
import { ScopeNote, SeasonForm } from "@/components/training/forms";
import { SeasonNffForm, SeasonSetupForm, SeasonSetupLine, type NffMonth } from "@/components/training/SeasonNff";
import { TrainingTabs } from "@/components/training/TrainingTabs";
import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { MONTH_NAMES, osloParts } from "@/lib/format";
import { teamBand } from "@/lib/nff/bands";
import { ROLES } from "@/lib/nff/fagplan";
import { themeLink } from "@/lib/nff/theme-link";
import { listCatalog } from "@/lib/store/nff-catalog";
import { getTeamSettings, listSeason, listThemeWords } from "@/lib/store/training";

/** The season plan: a theme per month, for every trainer. A new year is set up first: NFF's terms or the team's own. */
export default async function SeasonPage(props: PageProps<"/g/[groupId]/[sub]/trening/arshjul">) {
  const ctx = await contextFromParams(props.params);
  const sp = await props.searchParams;
  const now = osloParts(new Date());
  const year = Number(typeof sp.ar === "string" ? sp.ar : "") || now.year;
  const sub = ctx.subgroup?.id ?? "";
  const d = await db();
  const [{ rows, inherited, setup }, previous, team] = await Promise.all([
    listSeason(d, ctx.user.access, ctx.group.id, sub, year),
    listSeason(d, ctx.user.access, ctx.group.id, sub, year - 1),
    getTeamSettings(d, ctx.user.access, ctx.group.id, sub),
  ]);
  const band = teamBand(team.birth_year, year);
  const here = ctx.path(`/trening/arshjul?ar=${year}`);
  const showSetup = sp.oppsett === "1" || (!setup && !rows.length);
  const nff = !showSetup && setup?.mode === "nff" && band ? setup : null;
  // The NFF catalog for the dropdowns (NFF's terms) or for choosing a word's link (the team's own words).
  const catalog = !showSetup && band ? await listCatalog(d, ctx.user.access, ctx.group.id, { band }) : null;
  const toTopics = (c: NonNullable<typeof catalog>) => c.topics.map((t) => ({ id: t.id, kind: t.kind, label: t.label }));
  const toPoints = (c: NonNullable<typeof catalog>) => c.learningPoints.map((p) => ({ id: p.id, topic_id: p.topic_id, text: p.text, role: p.role ? (ROLES[p.role] ?? "") : "" }));

  let body;
  if (showSetup) {
    body = (
      <SeasonSetupForm
        groupId={ctx.group.id}
        sub={sub}
        year={year}
        initial={setup}
        copyYear={!rows.length && previous.rows.length ? { year: year - 1, months: previous.rows.length } : null}
        bandText={band ? `${band.replace("-", "–")} år` : null}
        back={here}
      />
    );
  } else if (nff && catalog && band) {
    const level = nff.primary_level;
    const initial: NffMonth[] = Array.from({ length: 12 }, (_, i) => {
      const r = rows.find((x) => x.month === i + 1);
      if (!r) return { theme: "", description: "", hovedtema: "", delferdighet: "", points: [], suggested: false };
      const picked = { theme: r.theme, description: r.description, hovedtema: r.hovedtema_id ?? "", delferdighet: r.delferdighet_id ?? "", points: r.learning_point_ids, suggested: false };
      if (r.hovedtema_id || r.delferdighet_id || r.learning_point_ids.length) return picked;
      // Written with the team's own words before: suggest the NFF terms the words link to.
      const l = themeLink(r.theme, band);
      if (!l || level === "laeringsmoment") return picked;
      const h = l.hovedtema[0] ?? "";
      const df = l.delferdigheter[0] ?? "";
      const label = (id: string) => catalog.topics.find((t) => t.id === id)?.label ?? "";
      if (level === "hovedtema" && h) return { ...picked, hovedtema: h, delferdighet: df, theme: label(h), suggested: true };
      if (level === "delferdighet" && df) return { ...picked, hovedtema: h, delferdighet: df, theme: label(df), suggested: true };
      return picked;
    });
    body = (
      <SeasonNffForm
        key={`${year}-${inherited}-${level}`}
        groupId={ctx.group.id}
        sub={sub}
        year={year}
        months={MONTH_NAMES}
        level={level}
        topics={toTopics(catalog)}
        points={toPoints(catalog)}
        initial={initial}
        current={year === now.year ? now.month : undefined}
      />
    );
  } else {
    const themes = Array.from({ length: 12 }, (_, i) => rows.find((r) => r.month === i + 1)?.theme ?? "");
    const descriptions = Array.from({ length: 12 }, (_, i) => rows.find((r) => r.month === i + 1)?.description ?? "");
    const words = catalog ? await listThemeWords(d, ctx.user.access, ctx.group.id) : [];
    const linkData =
      catalog && band
        ? {
            band,
            topics: toTopics(catalog),
            points: toPoints(catalog),
            words: Object.fromEntries(words.map((w) => [w.term, { hovedtema_ids: w.hovedtema_ids, delferdighet_ids: w.delferdighet_ids, learning_point_ids: w.learning_point_ids }])),
          }
        : undefined;
    body = (
      <>
        {setup?.mode === "nff" && !band ? (
          <div className="nm-alert" role="status">
            Året bruker NFFs begreper, men laget mangler fødselsår. Sett det under <Link href={ctx.path("/trening/laget")}>Laget</Link>, så kommer nedtrekkene tilbake.
          </div>
        ) : null}
        <SeasonForm key={`${year}-${inherited}`} groupId={ctx.group.id} sub={sub} year={year} months={MONTH_NAMES} themes={themes} descriptions={descriptions} current={year === now.year ? now.month : undefined} nff={linkData} />
      </>
    );
  }

  return (
    <AppShell ctx={ctx} title="Trening" section="training">
      <TrainingTabs ctx={ctx} current="arshjul" />
      <p style={{ marginTop: 0 }}>Månedens tema foreslås når trenerne lager opplegg, og KI bruker det.</p>
      <div className="nm-versions" style={{ marginBottom: "var(--space-4)" }}>
        {[now.year - 1, now.year, now.year + 1].map((y) => (
          <Link key={y} href={ctx.path(`/trening/arshjul?ar=${y}`)} aria-current={y === year}>
            {y}
          </Link>
        ))}
      </div>
      {showSetup ? (
        <>
          <h2 className="nm-section-label">{setup ? `Oppsett for ${year}` : `Sett opp årshjulet for ${year}`}</h2>
          <p>
            {setup
              ? "Velg hvordan dere vil beskrive månedene. Valget gjelder hele året."
              : `Dere har ikke laget årshjul for ${year} ennå. Velg hvordan dere vil beskrive månedene. Valget gjelder hele året og kan endres senere.`}
          </p>
          {setup ? (
            <p>
              <Link href={here}>Avbryt</Link>
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p>
            <Link href={ctx.path(`/trening/arshjul/nff?ar=${year}`)} className="nm-btn nm-btn--secondary">
              <Icon icon={ListChecks} />
              Sjekk mot NFF
            </Link>
          </p>
          <SeasonSetupLine mode={setup?.mode ?? "egne"} level={setup?.primary_level ?? "hovedtema"} href={`${here}&oppsett=1`} />
          <ScopeNote groupId={ctx.group.id} sub={sub} subName={ctx.label} mainName={ctx.group.name} inherited={inherited} part="season" year={year} />
        </>
      )}
      {body}
    </AppShell>
  );
}

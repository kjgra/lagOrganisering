import type { BankExercise } from "@/lib/plans/plan";
import { CELL_GOAL, isGood } from "./coverage";
import { DELFERDIGHETER, HOVEDTEMA, delfTag, temaTag, type BandKey, type Side } from "./fagplan";
import { linkTags, normTheme, themeLink, type ThemeLink } from "./theme-link";

/**
 * «Sjekk mot NFF» for et år i årshjulet: hvilke av NFFs hovedtema og delferdigheter
 * månedene dekker (via koblingen i theme-link.ts), hva som mangler, og om
 * øvelsesbanken har nok gode øvelser for hver måned.
 */

/** Months that are not training content (holiday, summing up), so they are not gaps. */
const NOT_CONTENT = /^(ferie|fri|pause|sommerferie|juleferie|vinterferie|h(o|ø)stferie|p(a|å)skeferie)$|oppsummering|sesongavslutning|juleavslutning|sommeravslutning/;

export type MonthStatus = "koblet" | "ikke-koblet" | "telles-ikke";

export interface MonthCheck {
  month: number;
  theme: string;
  status: MonthStatus;
  link: ThemeLink | null;
  /** Good exercises in the bank for the band with one of the month's NFF tags. */
  good: number;
}

export interface TermCheck {
  /** `tema.<key>` or `delf.<key>`. */
  tag: string;
  label: string;
  side: Side;
  months: number[];
}

export interface SeasonCheck {
  band: BandKey;
  months: MonthCheck[];
  hovedtema: TermCheck[];
  delferdigheter: TermCheck[];
  /** Months with a hovedtema for attack / defence (a month can count for both). */
  sides: Record<Side, number>;
  goal: number;
}

/** `link` on a row: the NFF terms the trainers picked (NFFs begreper); else the theme's words are linked. */
export function seasonCheck(rows: { month: number; theme: string; link?: ThemeLink | null }[], band: BandKey, bank: BankExercise[]): SeasonCheck {
  const good = bank.filter((b) => b.status !== "archived" && b.bands.includes(band) && isGood(b));
  const months = [...rows]
    .sort((a, b) => a.month - b.month)
    .map((r): MonthCheck => {
      const link = r.link ?? themeLink(r.theme, band);
      const tags = new Set(linkTags(link));
      const status: MonthStatus = link ? "koblet" : NOT_CONTENT.test(normTheme(r.theme)) ? "telles-ikke" : "ikke-koblet";
      return { month: r.month, theme: r.theme, status, link, good: link ? good.filter((b) => b.nff_tags.some((t) => tags.has(t))).length : 0 };
    });
  const monthsWith = (tag: string) => months.filter((m) => linkTags(m.link).includes(tag)).map((m) => m.month);
  const hovedtema = HOVEDTEMA.filter((h) => h.bands.includes(band)).map((h) => ({ tag: temaTag(h.key), label: h.label, side: h.side, months: monthsWith(temaTag(h.key)) }));
  const delferdigheter = DELFERDIGHETER.filter((d) => d.bands.includes(band)).map((d) => ({ tag: delfTag(d.key), label: d.label, side: d.side, months: monthsWith(delfTag(d.key)) }));
  const sideOf = new Map(hovedtema.map((h) => [h.tag, h.side]));
  const sides: Record<Side, number> = { angrep: 0, forsvar: 0 };
  for (const m of months) {
    const s = new Set((m.link?.hovedtema ?? []).map((t) => sideOf.get(t)));
    if (s.has("angrep")) sides.angrep++;
    if (s.has("forsvar")) sides.forsvar++;
  }
  return { band, months, hovedtema, delferdigheter, sides, goal: CELL_GOAL };
}

/** What is missing, as an order for new exercises (download) and for the trainers. */
export function seasonGaps(c: SeasonCheck) {
  return {
    aldersband: c.band,
    hovedtema_uten_maaned: c.hovedtema.filter((h) => !h.months.length).map((h) => h.label),
    delferdigheter_uten_maaned: c.delferdigheter.filter((d) => !d.months.length).map((d) => d.label),
    maaneder_uten_kobling: c.months.filter((m) => m.status === "ikke-koblet").map((m) => ({ maaned: m.month, tema: m.theme })),
    maaneder_med_for_faa_ovelser: c.months
      .filter((m) => m.status === "koblet" && m.good < c.goal)
      .map((m) => ({ maaned: m.month, tema: m.theme, gode: m.good, mangler: c.goal - m.good, nff: linkTags(m.link) })),
  };
}

import { DELFERDIGHETER, HOVEDTEMA, LEARNING_POINTS, delfTag, matchHovedtema, tagLabel, temaTag, type BandKey } from "./fagplan";

/**
 * Kobler et tema med egne ord («Pasning og mottak») til NFFs begreper for laget:
 * hovedtema, delferdigheter og eventuelt læringsmomenter. Brukes når KI bestilles
 * og når øvelsesbanken sorteres, så trenerne kan beholde sine egne ord i årshjulet.
 *
 * Koblingen er en fast ordliste. Ord den ikke kjenner («Spilleforståelse», «Ferie»),
 * får ingen kobling.
 */

export interface ThemeLink {
  /** Tags: `tema.<key>`. */
  hovedtema: string[];
  /** Tags: `delf.<key>`. */
  delferdigheter: string[];
  /** Learning point ids, for a theme NFF has no topic for (e.g. omstilling). */
  learningPoints: string[];
  /**
   * Set when the trainers picked the NFF terms in the årshjul («NFFs begreper»):
   * the names of the picked terms (the team's own too) and the picked learning points.
   */
  picked?: { names: Record<string, string>; points: { id: string; text: string }[] };
}

/** A month's picks in the årshjul with NFFs begreper. */
export interface MonthFocus {
  hovedtema_id: string | null;
  delferdighet_id: string | null;
  learning_point_ids: string[];
}

/** The link for a month where the trainers picked the NFF terms themselves, or null when nothing is picked. */
export function pickedLink(f: MonthFocus, names: Record<string, string> = {}): ThemeLink | null {
  return chosenLink({ hovedtema: f.hovedtema_id ? [f.hovedtema_id] : [], delferdigheter: f.delferdighet_id ? [f.delferdighet_id] : [], learningPoints: f.learning_point_ids }, names);
}

/** NFF terms the trainers chose (in a month or in the team's word list), with names; null when none. */
export function chosenLink(c: { hovedtema: string[]; delferdigheter: string[]; learningPoints: string[] }, names: Record<string, string> = {}): ThemeLink | null {
  if (!c.hovedtema.length && !c.delferdigheter.length && !c.learningPoints.length) return null;
  const name = (id: string) => names[id] ?? tagLabel(id) ?? id;
  const ids = [...c.hovedtema, ...c.delferdigheter, ...c.learningPoints];
  return {
    hovedtema: [...c.hovedtema],
    delferdigheter: [...c.delferdigheter],
    learningPoints: [...c.learningPoints],
    picked: { names: Object.fromEntries(ids.map((id) => [id, name(id)])), points: c.learningPoints.map((id) => ({ id, text: name(id) })) },
  };
}

/** A term's name in a link: the picked name (the team's own terms too), else NFF's. */
export function linkName(link: ThemeLink | null, tag: string): string {
  return link?.picked?.names[tag] ?? tagLabel(tag) ?? tag;
}

type Side = "angrep" | "avslutning" | "forsvar" | "hindre";

/** The hovedtema for a side of the game in the band (6–7 år has only two). */
const SIDE_TEMA: Record<Side, Record<BandKey, string>> = {
  angrep: { "6-7": "score-mal", "8-9": "spille-framover", "10-12": "spille-framover" },
  avslutning: { "6-7": "score-mal", "8-9": "komme-til-avslutning", "10-12": "komme-til-avslutning" },
  forsvar: { "6-7": "hindre-mal", "8-9": "vinne-ball", "10-12": "vinne-ball" },
  hindre: { "6-7": "hindre-mal", "8-9": "hindre-avslutning", "10-12": "hindre-avslutning" },
};

interface Rule {
  re: RegExp;
  sides?: Side[];
  delf?: string[];
}

/** The word list. Every rule that matches adds its NFF terms. */
const RULES: Rule[] = [
  { re: /ballkontroll|ballbehandling|ballf(o|ø)lelse|teknikk/, sides: ["angrep"], delf: ["foring", "mottak", "vending"] },
  { re: /pasning|samspill|veggspill|kombinasjonsspill/, sides: ["angrep"], delf: ["pasning"] },
  { re: /sentring|innlegg|crosse|cross/, sides: ["angrep", "avslutning"], delf: ["pasning"] },
  { re: /mottak|medtak|f(o|ø)rstetouch/, sides: ["angrep"], delf: ["mottak"] },
  { re: /f(o|ø)ring/, sides: ["angrep"], delf: ["foring"] },
  { re: /vending/, sides: ["angrep"], delf: ["vending"] },
  { re: /dribl|finte|1 ?(mot|v) ?1|en mot en/, sides: ["angrep"], delf: ["dribling", "foring"] },
  { re: /skudd|skyt|(^|[^e] )avslutning|avslutte|scor|m(a|å)lscor/, sides: ["avslutning"], delf: ["skudd"] },
  { re: /heading|header|hodespill/, delf: ["heading"] },
  { re: /angrep/, sides: ["angrep", "avslutning"] },
  { re: /spille (oss )?fr(a|e)m|oppbygging|orientering|bevegelse uten ball|spillbar/, sides: ["angrep"] },
  { re: /orientering|bevegelse uten ball|spillbar/, delf: ["mottak"] },
  { re: /forsvar/, sides: ["forsvar", "hindre"], delf: ["press", "kampen-om-ballen", "klarering"] },
  { re: /press|takling|vinne ball|ballvinning|tackl|1f|f(o|ø)rsteforsvar/, sides: ["forsvar"], delf: ["press"] },
  { re: /hindre (avslutning|m(a|å)l)/, sides: ["hindre"] },
  { re: /klarering|klarere/, sides: ["hindre"], delf: ["klarering"] },
  { re: /kampen om ballen|duell|n(æ|ae)rkamp/, sides: ["forsvar"], delf: ["kampen-om-ballen"] },
];

const OMSTILLING = /omstill|stille om|balltap/i;
/** Words that mean omstilling: switching between attack and defence. */
const OMSTILLING_WORD = /omstill|kontring|kontre|gjenvinn|stille om/;

/** Lower case, «fremover» as «framover», only letters, digits and single spaces. */
export function normTheme(theme: string): string {
  return theme
    .toLowerCase()
    .replace(/fremover/g, "framover")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Small words that do not change what a theme is about. «mot» is kept («1 mot 1»). */
const STOP = new Set(["oss", "og", "i", "banen", "på", "pa", "med", "til", "en", "et", "ei", "vi", "å", "av", "for", "som", "den", "det"]);

/** Spellings of the same word. */
const VARIANTS: [RegExp, string][] = [
  [/^(fremover|framover|fremmover|frem|fram)$/, "fram"],
  [/^(medtak|medtaket|medtakene)$/, "mottak"],
  [/^(1v1|1mot1|enmoten)$/, "1 mot 1"],
];

/**
 * A theme as a key that is the same for the same idea written differently:
 * «Spille oss frem», «spille fremover» and «Spille oss framover i banen» give
 * the same key. Small words are dropped, spellings joined, simple endings cut
 * («pasninger» as «pasning») and the words sorted.
 */
export function themeKey(theme: string): string {
  const words = normTheme(theme)
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .map((w) => VARIANTS.find(([re]) => re.test(w))?.[1] ?? (w.length > 4 ? w.replace(/(ene|ane|er|en|et|e|a)$/, "") : w));
  return [...new Set(words)].sort().join(" ");
}

/** The NFF terms a theme stands for in the band, or null when it has none. */
export function themeLink(theme: string, band: BandKey | null): ThemeLink | null {
  if (!band) return null;
  const exact = matchHovedtema(theme, band);
  if (exact) return { hovedtema: [temaTag(exact.key)], delferdigheter: [], learningPoints: [] };
  const t = normTheme(theme);
  if (!t) return null;
  const tema = new Set<string>();
  const delf = new Set<string>();
  for (const r of RULES) {
    if (!r.re.test(t)) continue;
    for (const s of r.sides ?? []) tema.add(SIDE_TEMA[s][band]);
    for (const k of r.delf ?? []) delf.add(k);
  }
  const learningPoints = OMSTILLING_WORD.test(t) ? LEARNING_POINTS.filter((p) => p.band === band && OMSTILLING.test(p.text)).map((p) => p.id) : [];
  const link: ThemeLink = {
    hovedtema: HOVEDTEMA.filter((h) => tema.has(h.key) && h.bands.includes(band)).map((h) => temaTag(h.key)),
    delferdigheter: DELFERDIGHETER.filter((d) => delf.has(d.key) && d.bands.includes(band)).map((d) => delfTag(d.key)),
    learningPoints,
  };
  return link.hovedtema.length || link.delferdigheter.length || link.learningPoints.length ? link : null;
}

/** Months that are not training content (holiday, summing up), so they are not gaps. */
const NOT_CONTENT = /^(ferie|fri|pause|sommerferie|juleferie|vinterferie|h(o|ø)stferie|p(a|å)skeferie)$|oppsummering|sesongavslutning|juleavslutning|sommeravslutning/;

/** A theme that is not training content («Ferie», «Oppsummering»): it needs no NFF link. */
export function notContent(theme: string): boolean {
  return NOT_CONTENT.test(normTheme(theme));
}

/** Every tag in a link, to match against an exercise's NFF tags. */
export function linkTags(link: ThemeLink | null): string[] {
  return link ? [...link.hovedtema, ...link.delferdigheter, ...link.learningPoints] : [];
}

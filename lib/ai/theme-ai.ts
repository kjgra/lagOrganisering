import { DELFERDIGHETER, HOVEDTEMA, LEARNING_POINTS, delfTag, temaTag, type BandKey } from "@/lib/nff/fagplan";
import { notContent, themeKey, themeLink } from "@/lib/nff/theme-link";

/**
 * KI links the team's own words in the årshjul to NFF's terms when the app's word
 * list does not know them («Spilleforståelse», «Bredde i angrep»). One short call
 * for all the new words of a band; the answer is saved per word and band
 * (theme_suggestions) and shared by all teams, so each word is asked about once.
 */

export const THEME_AI_INSTRUCTIONS = `Du kobler trenernes egne ord for månedens tema i barnefotball til NFFs fagplan for aldersbåndet.

For hvert ord velger du det i fagplanen som ordet handler om: hovedtema, delferdigheter og høyst to læringsmomenter. Bruk bare id-ene i fagplanen. Velg få og treffende begreper. Hører ordet til begge sider av spillet, kan du velge hovedtema fra begge. Er ordet ikke fotballinnhold (ferie, oppsummering, sosialt), eller du er usikker, svarer du med tomme lister.`;

export const THEME_AI_SCHEMA = {
  type: "object",
  properties: {
    koblinger: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nr: { type: "integer" },
          hovedtema: { type: "array", items: { type: "string" } },
          delferdigheter: { type: "array", items: { type: "string" } },
          laeringsmomenter: { type: "array", items: { type: "string" } },
        },
        required: ["nr", "hovedtema", "delferdigheter", "laeringsmomenter"],
        additionalProperties: false,
      },
    },
  },
  required: ["koblinger"],
  additionalProperties: false,
} as const;

/** NFF's fagplan for the band, with ids, for KI. */
export function fagplanCatalog(band: BandKey): string {
  const out = [`# NFFs fagplan for ${band.replace("-", "–")} år`, "", "## Hovedtema"];
  for (const h of HOVEDTEMA.filter((x) => x.bands.includes(band))) out.push(`- ${temaTag(h.key)}: ${h.label} (${h.side})`);
  out.push("", "## Delferdigheter");
  for (const d of DELFERDIGHETER.filter((x) => x.bands.includes(band))) out.push(`- ${delfTag(d.key)}: ${d.label} (${d.side})`);
  out.push("", "## Læringsmomenter");
  for (const p of LEARNING_POINTS.filter((x) => x.band === band)) out.push(`- ${p.id}: ${p.group}: ${p.text}`);
  return out.join("\n");
}

/** The words KI should link: content words the word list does not know, one per key. */
export function wordsToAsk(themes: string[], band: BandKey, known: Set<string>): { term: string; theme: string }[] {
  const out = new Map<string, string>();
  for (const theme of themes) {
    const term = themeKey(theme);
    if (!term || term.length > 80 || known.has(term) || out.has(term) || notContent(theme) || themeLink(theme, band)) continue;
    out.set(term, theme.trim().slice(0, 80));
  }
  return [...out].map(([term, theme]) => ({ term, theme }));
}

export function themeAiOrder(words: { theme: string }[]): string {
  return `# Ord fra årshjulet\n\n${words.map((w, i) => `${i + 1}. ${w.theme}`).join("\n")}\n\nKoble hvert ord til fagplanen.`;
}

export interface KiLinkRow {
  term: string;
  hovedtema_ids: string[];
  delferdighet_ids: string[];
  learning_point_ids: string[];
}

/** KI's answer, checked against the band's fagplan: unknown ids are dropped. Throws when it is not JSON. */
export function themeAiAnswer(text: string, words: { term: string }[], band: BandKey): KiLinkRow[] {
  const data = JSON.parse(text) as { koblinger?: { nr?: number; hovedtema?: unknown; delferdigheter?: unknown; laeringsmomenter?: unknown }[] };
  const tema = new Set(HOVEDTEMA.filter((x) => x.bands.includes(band)).map((x) => temaTag(x.key)));
  const delf = new Set(DELFERDIGHETER.filter((x) => x.bands.includes(band)).map((x) => delfTag(x.key)));
  const points = new Set(LEARNING_POINTS.filter((x) => x.band === band).map((x) => x.id));
  const pick = (v: unknown, ok: Set<string>, max: number) => [...new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && ok.has(x)) : [])].slice(0, max);
  const byNr = new Map((data.koblinger ?? []).map((k) => [k.nr, k]));
  return words.map((w, i) => {
    const k = byNr.get(i + 1);
    return { term: w.term, hovedtema_ids: pick(k?.hovedtema, tema, 4), delferdighet_ids: pick(k?.delferdigheter, delf, 6), learning_point_ids: pick(k?.laeringsmomenter, points, 2) };
  });
}

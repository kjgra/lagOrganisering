import type { BandKey } from "@/lib/nff/fagplan";
import { linkTags, themeKey, autoLink, type KiLinks } from "@/lib/nff/theme-link";
import type { BankExercise } from "@/lib/plans/plan";
import { meanText } from "@/lib/plans/feedback";

/**
 * «Brukt med temaet»: which exercises the teams use in approved plans with the
 * same theme («spille oss frem»), also when the exercise is not tagged with the
 * NFF terms the word links to. The same theme is the same key (themeKey:
 * «spille fremover» = «Spille oss frem»); a theme that links to exactly the same
 * NFF terms counts as similar («Sentring» and «Innlegg»). Counted across teams for the age band,
 * and used only when enough teams and sessions are behind it, like the other
 * patterns (lessons.ts). Only counts are used, never which team.
 */

/** An exercise is used with a theme when this many sessions from this many teams are behind it. */
export const USAGE_MIN = { sessions: 3, groups: 2 };
/** Exercises the trainers rated this low for the theme are left out. */
const POOR = 1.7;
const MAX = 6;

/** One approved plan: its team, theme word, age band, the exercises and their ratings. */
export interface UsageRow {
  group: string;
  theme: string;
  band: BandKey | null;
  codes: string[];
  /** Ratings (1–3) per exercise code for this plan. */
  ratings: Record<string, number[]>;
}

export interface ThemeUse {
  code: string;
  sessions: number;
  /** Of the sessions, those with a similar theme (same NFF terms, other words). */
  similar: number;
  groups: number;
  /** Mean rating for the theme, or null when nobody rated it. */
  mean: number | null;
  ratings: number;
}

/** Exercises used with the theme in the band, most used first; those rated poorly with it are left out. */
/** `ki`: KI's links of words the word list does not know, so they can be similar too. */
export function themeUsage(rows: UsageRow[], theme: string, band: BandKey | null, min = USAGE_MIN, ki: KiLinks = {}): ThemeUse[] {
  const key = themeKey(theme);
  if (!key || !band) return [];
  const tags = (t: string) => linkTags(autoLink(t, band, ki)).sort().join(" ");
  const own = tags(theme);
  const by = new Map<string, { sessions: number; similar: number; groups: Set<string>; ratings: number[] }>();
  const linked = new Map<string, string>();
  for (const r of rows) {
    if (r.band !== band) continue;
    const same = themeKey(r.theme) === key;
    if (!same) {
      if (!own) continue;
      if (!linked.has(r.theme)) linked.set(r.theme, tags(r.theme));
      if (linked.get(r.theme) !== own) continue;
    }
    for (const code of new Set(r.codes)) {
      const u = by.get(code) ?? { sessions: 0, similar: 0, groups: new Set<string>(), ratings: [] };
      u.sessions++;
      if (!same) u.similar++;
      u.groups.add(r.group);
      u.ratings.push(...(r.ratings[code] ?? []));
      by.set(code, u);
    }
  }
  return [...by]
    .map(([code, u]) => ({
      code,
      sessions: u.sessions,
      similar: u.similar,
      groups: u.groups.size,
      ratings: u.ratings.length,
      mean: u.ratings.length ? u.ratings.reduce((a, b) => a + b, 0) / u.ratings.length : null,
    }))
    .filter((u) => u.sessions >= min.sessions && u.groups >= min.groups && (u.mean === null || u.mean > POOR))
    .sort((a, b) => b.sessions - b.similar / 2 - (a.sessions - a.similar / 2) || b.groups - a.groups || (b.mean ?? 0) - (a.mean ?? 0) || a.code.localeCompare(b.code));
}

/** The usage for the KI order, or empty when nothing passes the thresholds. */
export function themeUsageText(uses: ThemeUse[], theme: string, bank: BankExercise[]): string {
  const live = new Map(bank.filter((b) => b.status !== "archived").map((b) => [b.code, b]));
  const lines = uses
    .filter((u) => live.has(u.code))
    .slice(0, MAX)
    .map((u) => `- ${u.code} (${live.get(u.code)!.name}): brukt i ${u.sessions} økter av ${u.groups} lag${u.similar ? ` (${u.similar} med lignende tema)` : ""}${u.mean === null ? "" : `, snitt ${meanText(u.mean)}/3 (${u.ratings} vurderinger)`}`);
  if (!lines.length) return "";
  return `## Brukt med temaet «${theme.trim()}»\n\nLag på samme alder bruker disse øvelsene i økter med dette temaet (også skrevet litt annerledes, eller med et tema som betyr det samme hos NFF), selv om øvelsene ikke er tagget med det. Vurder dem gjerne.\n\n${lines.join("\n")}`;
}

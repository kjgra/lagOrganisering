import type { BandKey } from "@/lib/nff/fagplan";
import { normTheme } from "@/lib/nff/theme-link";
import type { BankExercise } from "@/lib/plans/plan";
import { meanText } from "@/lib/plans/feedback";

/**
 * «Brukt med temaet»: which exercises the teams use in approved plans with the
 * same theme word («spille oss frem»), also when the exercise is not tagged
 * with the NFF terms the word links to. Counted across teams for the age band,
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
  groups: number;
  /** Mean rating for the theme, or null when nobody rated it. */
  mean: number | null;
  ratings: number;
}

/** Exercises used with the theme in the band, most used first; those rated poorly with it are left out. */
export function themeUsage(rows: UsageRow[], theme: string, band: BandKey | null, min = USAGE_MIN): ThemeUse[] {
  const term = normTheme(theme);
  if (!term || !band) return [];
  const by = new Map<string, { sessions: number; groups: Set<string>; ratings: number[] }>();
  for (const r of rows) {
    if (r.band !== band || normTheme(r.theme) !== term) continue;
    for (const code of new Set(r.codes)) {
      const u = by.get(code) ?? { sessions: 0, groups: new Set<string>(), ratings: [] };
      u.sessions++;
      u.groups.add(r.group);
      u.ratings.push(...(r.ratings[code] ?? []));
      by.set(code, u);
    }
  }
  return [...by]
    .map(([code, u]) => ({
      code,
      sessions: u.sessions,
      groups: u.groups.size,
      ratings: u.ratings.length,
      mean: u.ratings.length ? u.ratings.reduce((a, b) => a + b, 0) / u.ratings.length : null,
    }))
    .filter((u) => u.sessions >= min.sessions && u.groups >= min.groups && (u.mean === null || u.mean > POOR))
    .sort((a, b) => b.sessions - a.sessions || b.groups - a.groups || (b.mean ?? 0) - (a.mean ?? 0) || a.code.localeCompare(b.code));
}

/** The usage for the KI order, or empty when nothing passes the thresholds. */
export function themeUsageText(uses: ThemeUse[], theme: string, bank: BankExercise[]): string {
  const live = new Map(bank.filter((b) => b.status !== "archived").map((b) => [b.code, b]));
  const lines = uses
    .filter((u) => live.has(u.code))
    .slice(0, MAX)
    .map((u) => `- ${u.code} (${live.get(u.code)!.name}): brukt i ${u.sessions} økter av ${u.groups} lag${u.mean === null ? "" : `, snitt ${meanText(u.mean)}/3 (${u.ratings} vurderinger)`}`);
  if (!lines.length) return "";
  return `## Brukt med temaet «${theme.trim()}»\n\nLag på samme alder bruker disse øvelsene i økter med dette temaet, også om øvelsene ikke er tagget med det. Vurder dem gjerne.\n\n${lines.join("\n")}`;
}

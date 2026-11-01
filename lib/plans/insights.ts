import { NFF_BANDS, type NffBand } from "@/lib/nff/bands";

type BandKey = NffBand["key"];

/**
 * Patterns for whole sessions, not one exercise: which exercises work well
 * together (kombinasjon), which order works (progresjon, only for sessions
 * without rotation, since the groups take the stations in different order
 * then), and how the session is built (struktur: number of exercises and
 * rotation). Counted per age band from the trainers' rating of the whole
 * session, with the same thresholds as the exercise patterns.
 */

export type InsightKind = "kombinasjon" | "progresjon" | "struktur";
export const INSIGHT_KINDS: InsightKind[] = ["kombinasjon", "progresjon", "struktur"];

/** One trainer's rating of one session (the «Hele økta» row), with the plan it rated. */
export interface SessionRow {
  planId: number;
  groupId: string;
  author: string;
  /** 1–3. */
  rating: number;
  tags: string[];
  band: BandKey | null;
  /** The exercise codes in the plan, in order. */
  codes: string[];
  rotation: boolean;
}

export interface Insight {
  kind: InsightKind;
  band: BandKey;
  /** «a+b» (pair, sorted), «a>b» (a right before b) or «4:rotasjon» / «4:samlet». */
  key: string;
  /** The exercises it is about (none for struktur). */
  codes: string[];
  sessions: number;
  trainers: number;
  /** Groups (clubs or main groups in Spond) behind it. Shared with other groups only from 2. */
  groups: number;
  /** Mean session rating, 1–3, two decimals. */
  mean: number;
  /** Session tags used at least twice, most used first. */
  tags: string[];
}

/** «4 øvelser på stasjoner med rotasjon». */
export function structureLabel(key: string): string {
  const [n, how] = key.split(":");
  return `${n} ${n === "1" ? "øvelse" : "øvelser"} ${how === "rotasjon" ? "på stasjoner med rotasjon" : "med alle samlet"}`;
}

function keysOf(r: SessionRow): { kind: InsightKind; key: string; codes: string[] }[] {
  const codes = [...new Set(r.codes.filter(Boolean))];
  const out: { kind: InsightKind; key: string; codes: string[] }[] = [];
  for (let i = 0; i < codes.length; i++)
    for (let j = i + 1; j < codes.length; j++) {
      const pair = [codes[i], codes[j]].sort();
      out.push({ kind: "kombinasjon", key: pair.join("+"), codes: pair });
    }
  if (!r.rotation)
    for (let i = 0; i + 1 < codes.length; i++) out.push({ kind: "progresjon", key: `${codes[i]}>${codes[i + 1]}`, codes: [codes[i], codes[i + 1]] });
  if (codes.length) out.push({ kind: "struktur", key: `${codes.length}:${r.rotation ? "rotasjon" : "samlet"}`, codes: [] });
  return out;
}

/**
 * What passes the thresholds: at least `minSessions` sessions and `minTrainers`
 * trainers behind it. A session is one plan; several trainers rating it count
 * once as a session. Ratings without a band are left out.
 */
export function sessionInsights(rows: SessionRow[], t: { minSessions: number; minTrainers: number }): Insight[] {
  const by = new Map<
    string,
    {
      kind: InsightKind;
      band: BandKey;
      key: string;
      codes: string[];
      plans: Set<number>;
      trainers: Set<string>;
      groups: Set<string>;
      ratings: number[];
      tags: Map<string, number>;
    }
  >();
  for (const r of rows) {
    if (!r.band || r.rating < 1 || r.rating > 3) continue;
    for (const k of keysOf(r)) {
      const id = `${r.band}\n${k.kind}\n${k.key}`;
      const x = by.get(id) ?? {
        ...k,
        band: r.band,
        plans: new Set<number>(),
        trainers: new Set<string>(),
        groups: new Set<string>(),
        ratings: [] as number[],
        tags: new Map<string, number>(),
      };
      x.plans.add(r.planId);
      x.trainers.add(r.author);
      x.groups.add(r.groupId);
      x.ratings.push(r.rating);
      for (const tag of new Set(r.tags)) x.tags.set(tag, (x.tags.get(tag) ?? 0) + 1);
      by.set(id, x);
    }
  }
  const bands = NFF_BANDS.map((b) => b.key);
  return [...by.values()]
    .filter((x) => x.plans.size >= t.minSessions && x.trainers.size >= t.minTrainers)
    .map((x) => ({
      kind: x.kind,
      band: x.band,
      key: x.key,
      codes: x.codes,
      sessions: x.plans.size,
      trainers: x.trainers.size,
      groups: x.groups.size,
      mean: Math.round((x.ratings.reduce((a, b) => a + b, 0) / x.ratings.length) * 100) / 100,
      tags: [...x.tags.entries()]
        .filter(([, n]) => n >= 2)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([tag]) => tag),
    }))
    .sort(
      (a, b) =>
        bands.indexOf(a.band) - bands.indexOf(b.band) ||
        INSIGHT_KINDS.indexOf(a.kind) - INSIGHT_KINDS.indexOf(b.kind) ||
        b.sessions - a.sessions ||
        a.key.localeCompare(b.key),
    );
}

/**
 * The insights a team's KI order may use: those from several groups (at least
 * two behind them, so no group can be recognised), and the team's own group's,
 * counted on their own. Only for the team's age band.
 */
export function insightsFor(shared: Insight[], own: Insight[], band: BandKey | null): Insight[] {
  if (!band) return [];
  const wide = shared.filter((x) => x.band === band && x.groups >= 2);
  const seen = new Set(wide.map((x) => `${x.kind}\n${x.key}`));
  return [...wide, ...own.filter((x) => x.band === band && !seen.has(`${x.kind}\n${x.key}`))];
}

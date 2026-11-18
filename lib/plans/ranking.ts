import { teamBand, type NffBand } from "@/lib/nff/bands";
import { recencyWeight, type EvaluationRow, type ExercisePattern } from "./observations";

type BandKey = NffBand["key"];

/**
 * Which exercises KI sees first: a score per exercise and age band from what
 * the trainers rated and what they kept or took out of KI's plans.
 *
 * Each exercise has a Beta distribution of «how often it works». A rating
 * 1–3 is 0, ½ or 1 success with full weight; an exercise kept in an approved
 * plan KI made is a small success, one taken out a bigger failure (keeping is
 * easy, taking out is a choice). Newer counts more (the same half-life as the
 * patterns). Every exercise starts with two «ratings» of the bank's mean, so
 * one rating moves it little. Evidence from another or an unknown age band
 * counts a quarter.
 *
 * The order is Thompson sampling: a draw from each distribution. Well-rated
 * exercises come first most of the time, and the untried ones, with wide
 * distributions, sometimes too, so they get tried and the bank does not
 * lock on to the first ones rated. The draw is seeded (team, theme, day), so
 * a new try the same day gets the same order.
 */

export const WEIGHT = { rating: 1, kept: 0.3, removed: 0.6, otherBand: 0.25 };
/** How many ratings of the bank's mean an exercise starts with. */
export const PRIOR = 2;

/** Weighted successes and failures for an age band ("" when the band is unknown). */
export interface Evidence {
  band: BandKey | "";
  s: number;
  f: number;
}

/** One exercise in a plan KI made, and whether the approved plan for the session kept it. */
export interface KiOutcome {
  code: string;
  kept: boolean;
  band: BandKey | null;
  at: Date;
}

/** A plan version of a session, as the outcomes need it. */
export interface OutcomePlanRow {
  session: string;
  version: number;
  status: string;
  source: "manual" | "ai";
  codes: string[];
  /** Stored band of the plan, or null. */
  band: string | null;
  birthYear: number | null;
  /** When the session's plan was approved (approved row) or made. */
  at: Date;
}

/** What happened to each exercise of KI's last plan before the approved one, per session. */
export function kiExerciseOutcomes(rows: OutcomePlanRow[]): KiOutcome[] {
  const by = new Map<string, OutcomePlanRow[]>();
  for (const r of rows) by.set(r.session, [...(by.get(r.session) ?? []), r]);
  const out: KiOutcome[] = [];
  for (const list of by.values()) {
    const approved = list.find((p) => p.status === "approved");
    if (!approved) continue;
    const ki = list.filter((p) => p.source === "ai" && p.version <= approved.version).sort((a, b) => b.version - a.version)[0];
    if (!ki) continue;
    const kept = new Set(approved.codes);
    const band = (approved.band as BandKey | null) ?? teamBand(approved.birthYear, approved.at.getFullYear());
    for (const code of new Set(ki.codes.filter(Boolean))) out.push({ code, kept: kept.has(code), band, at: approved.at });
  }
  return out;
}

const round = (x: number) => Math.round(x * 1000) / 1000;

/** The evidence per exercise code, per age band. */
export function exerciseEvidence(evaluations: EvaluationRow[], outcomes: KiOutcome[], now = new Date()): Map<string, Evidence[]> {
  const sums = new Map<string, Map<BandKey | "", { s: number; f: number }>>();
  const add = (code: string, band: BandKey | null, s: number, f: number) => {
    const byBand = sums.get(code) ?? new Map();
    const e = byBand.get(band ?? "") ?? { s: 0, f: 0 };
    e.s += s;
    e.f += f;
    byBand.set(band ?? "", e);
    sums.set(code, byBand);
  };
  for (const r of evaluations) {
    if (r.rating === null) continue;
    const w = WEIGHT.rating * recencyWeight(r.at, now);
    add(r.code, r.band, (w * (r.rating - 1)) / 2, (w * (3 - r.rating)) / 2);
  }
  for (const o of outcomes) {
    const w = recencyWeight(o.at, now);
    if (o.kept) add(o.code, o.band, WEIGHT.kept * w, 0);
    else add(o.code, o.band, 0, WEIGHT.removed * w);
  }
  const out = new Map<string, Evidence[]>();
  for (const [code, byBand] of sums) {
    out.set(
      code,
      [...byBand].sort(([a], [b]) => a.localeCompare(b)).map(([band, e]) => ({ band, s: round(e.s), f: round(e.f) })),
    );
  }
  return out;
}

/** The patterns with their evidence; exercises with evidence but no pattern get an empty one. */
export function withEvidence(patterns: ExercisePattern[], evidence: Map<string, Evidence[]>): ExercisePattern[] {
  const out = patterns.map((p) => ({ ...p, evidence: evidence.get(p.code) ?? [] }));
  const have = new Set(patterns.map((p) => p.code));
  for (const [code, ev] of evidence) {
    if (!have.has(code)) out.push({ code, score: null, ratings: 0, trend: "", patterns: [], bands: [], evidence: ev });
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

/** The bank's mean share of success (0–1), which every exercise starts from. */
export function priorMean(all: (Evidence[] | undefined)[]): number {
  let s = 0;
  let f = 0;
  for (const ev of all) for (const e of ev ?? []) {
    s += e.s;
    f += e.f;
  }
  return (s + 1) / (s + f + 2);
}

/** The Beta distribution for an exercise in the team's age band. */
export function posterior(ev: Evidence[] | undefined, band: BandKey | null, p0: number): { a: number; b: number } {
  let a = PRIOR * p0;
  let b = PRIOR * (1 - p0);
  for (const e of ev ?? []) {
    const w = !band || e.band === band ? 1 : WEIGHT.otherBand;
    a += w * e.s;
    b += w * e.f;
  }
  return { a, b };
}

/** A seeded random number generator (mulberry32 on a hash of the seed). */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let t = h >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number): number {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A Gamma(k, 1) draw (Marsaglia–Tsang). */
function gamma(k: number, rand: () => number): number {
  if (k < 1) return gamma(k + 1, rand) * rand() ** (1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rand);
      v = 1 + c * x;
    } while (v <= 0);
    v = v ** 3;
    const u = 1 - rand();
    if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
  }
}

/** A Beta(a, b) draw. */
export function sampleBeta(a: number, b: number, rand: () => number): number {
  const x = gamma(a, rand);
  const y = gamma(b, rand);
  return x / (x + y);
}

/**
 * The rank of each exercise for the band: a Thompson draw when there is a
 * seed, else the expected share of success. Codes in the order given, so the
 * same seed gives the same draws.
 */
export function rankScores(codes: string[], patterns: ExercisePattern[], band: BandKey | null, seed?: string): Map<string, number> {
  const ev = new Map(patterns.map((p) => [p.code, p.evidence]));
  const p0 = priorMean([...ev.values()]);
  const rand = seed ? seeded(seed) : null;
  const out = new Map<string, number>();
  for (const code of codes) {
    const { a, b } = posterior(ev.get(code), band, p0);
    out.set(code, rand ? sampleBeta(a, b, rand) : a / (a + b));
  }
  return out;
}

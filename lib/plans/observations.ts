import { NFF_BANDS, type NffBand } from "@/lib/nff/bands";
import { FEEDBACK_TAGS } from "./feedback";

type BandKey = NffBand["key"];

/**
 * Observations and patterns per exercise. An observation is one problem or
 * one strength from one evaluation: each keyword is one, and KI turns the
 * free text into more (with which part of the exercise it is about and the
 * trainer's own suggestion). Each night the app counts them per exercise: a
 * kind that comes back from enough sessions or trainers is a pattern, which
 * the next steps turn into proposals for a better exercise.
 */

export const OBSERVATION_KINDS: Record<string, { label: string; positive: boolean }> = {
  ...Object.fromEntries(Object.entries(FEEDBACK_TAGS).map(([k, label]) => [k, { label, positive: ["goy", "hoy_intensitet", "tema_ja"].includes(k) }])),
  tegning: { label: "feil eller uklar tegning", positive: false },
  regler: { label: "uklare regler", positive: false },
  annet: { label: "annet", positive: false },
};

export const OBSERVATION_PARTS: Record<string, string> = {
  organisering: "organisering",
  gjennomforing: "gjennomføring",
  tilpasning: "enklere/vanskeligere",
  tegning: "tegning",
};

/** Which part of the exercise a keyword is about. */
const TAG_PART: Record<string, string> = {
  ko: "organisering",
  bane_liten: "organisering",
  bane_stor: "organisering",
  for_lett: "tilpasning",
  for_vanskelig: "tilpasning",
  uklar: "gjennomforing",
};

export const SUGGESTION_MAX = 200;

export interface Observation {
  kind: string;
  part: string;
  strength: "svak" | "tydelig";
  suggestion: string;
}

/** One evaluation of an exercise, with what the pattern needs. */
export interface EvaluationRow {
  feedbackId: number;
  code: string;
  rating: number | null;
  tags: string[];
  /** The training (event id), or the trainer's evaluation from the bank. */
  session: string;
  author: string;
  /** How many came to the training, when it is known. */
  players: number | null;
  /** The team's NFF age band when it was evaluated, when the team has a birth year. */
  band: BandKey | null;
  at: Date;
}

export interface Settings {
  minSessions: number;
  minTrainers: number;
}

export interface Pattern {
  kind: string;
  positive: boolean;
  /** Evaluations, sessions and trainers that said it. */
  count: number;
  sessions: number;
  trainers: number;
  /** Passes the thresholds: said often enough to act on. */
  pattern: boolean;
  part: string;
  /** «med 12 eller flere spillere» or «for 6–7 år» when it only happens then. */
  context: string;
  /** The age band, when the context is one. */
  band?: BandKey | "";
  suggestions: string[];
}

export interface ExercisePattern {
  code: string;
  /** Weighted mean (1–3), pulled towards the bank's mean when there are few ratings; null without ratings. */
  score: number | null;
  ratings: number;
  trend: "" | "faller" | "byttes_ut";
  patterns: Pattern[];
  /** Mean rating per age band, for the bands with ratings. */
  bands: BandScore[];
}

export interface BandScore {
  band: BandKey;
  /** Plain mean (1–3). */
  mean: number;
  ratings: number;
  trainers: number;
}

export const bandLabel = (b: string) => NFF_BANDS.find((x) => x.key === b)?.label ?? b;

/** Newer evaluations count more: half the weight after this many days. */
const HALF_LIFE_DAYS = 90;
/** How many ratings of the bank's mean a score starts with. */
const PRIOR = 2;
/** A big group: some exercises only fail with this many players or more. */
export const BIG_GROUP = 12;
const TREND_DAYS = 60;
const REMOVED_DAYS = 90;

const DAY = 86_400_000;
const weight = (at: Date, now: Date) => 0.5 ** (Math.max(0, now.getTime() - at.getTime()) / DAY / HALF_LIFE_DAYS);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** The keywords as observations: each is said straight out. */
export function tagObservations(tags: string[]): Observation[] {
  return tags.filter((t) => t in OBSERVATION_KINDS).map((kind) => ({ kind, part: TAG_PART[kind] ?? "", strength: "tydelig", suggestion: "" }));
}

/** The bank's weighted mean, which a score with few ratings is pulled towards. */
export function bankMean(rows: EvaluationRow[], now: Date): number {
  let sw = 0;
  let s = 0;
  for (const r of rows) {
    if (r.rating === null) continue;
    const w = weight(r.at, now);
    sw += w;
    s += w * r.rating;
  }
  return sw ? s / sw : 2.5;
}

function contextOf(obs: EvaluationRow[], all: EvaluationRow[]): { context: string; band: BandKey | "" } {
  const known = obs.map((o) => o.players).filter((p): p is number => p !== null);
  if (known.length >= 2) {
    const usedBig = all.some((r) => r.players !== null && r.players >= BIG_GROUP);
    const usedSmall = all.some((r) => r.players !== null && r.players < BIG_GROUP);
    if (known.every((p) => p >= BIG_GROUP) && usedSmall) return { context: `med ${BIG_GROUP} eller flere spillere`, band: "" };
    if (known.every((p) => p < BIG_GROUP) && usedBig) return { context: `med færre enn ${BIG_GROUP} spillere`, band: "" };
  }
  // Only one age band says it, and the exercise is used in others too.
  const bands = obs.map((o) => o.band);
  const band = bands[0];
  if (bands.length >= 2 && band && bands.every((b) => b === band) && all.some((r) => r.band && r.band !== band)) return { context: `for ${bandLabel(band)}`, band };
  return { context: "", band: "" };
}

function bandScores(rated: EvaluationRow[]): BandScore[] {
  return NFF_BANDS.flatMap(({ key }) => {
    const rs = rated.filter((r) => r.band === key);
    if (!rs.length) return [];
    return [{ band: key, mean: Math.round((rs.reduce((s, r) => s + r.rating!, 0) / rs.length) * 100) / 100, ratings: rs.length, trainers: new Set(rs.map((r) => r.author)).size }];
  });
}

/**
 * The pattern for each exercise from its evaluations, the observations KI
 * found in them, and when trainers took it out of a plan KI made.
 */
export function analysePatterns(
  evaluations: EvaluationRow[],
  observations: (Observation & { feedbackId: number })[],
  removed: { code: string; at: Date }[],
  settings: Settings,
  now = new Date(),
): ExercisePattern[] {
  const m = bankMean(evaluations, now);
  const byFeedback = new Map<number, Observation[]>();
  for (const o of observations) byFeedback.set(o.feedbackId, [...(byFeedback.get(o.feedbackId) ?? []), o]);
  const byCode = new Map<string, EvaluationRow[]>();
  for (const r of evaluations) byCode.set(r.code, [...(byCode.get(r.code) ?? []), r]);
  const codes = new Set([...byCode.keys(), ...removed.map((r) => r.code)]);

  return [...codes].sort().map((code) => {
    const rows = byCode.get(code) ?? [];
    const rated = rows.filter((r) => r.rating !== null);
    let sw = 0;
    let s = 0;
    for (const r of rated) {
      const w = weight(r.at, now);
      sw += w;
      s += w * r.rating!;
    }
    const score = rated.length ? Math.round(((PRIOR * m + s) / (PRIOR + sw)) * 100) / 100 : null;

    // One observation per kind per evaluation: a keyword and KI saying the same is the same thing.
    const seen = new Map<string, { row: EvaluationRow; o: Observation }[]>();
    for (const row of rows) {
      const own = new Map<string, Observation>();
      for (const o of tagObservations(row.tags)) own.set(o.kind, o);
      for (const o of byFeedback.get(row.feedbackId) ?? []) {
        const had = own.get(o.kind);
        own.set(o.kind, had ? { ...had, part: had.part || o.part, suggestion: o.suggestion || had.suggestion } : o);
      }
      for (const o of own.values()) seen.set(o.kind, [...(seen.get(o.kind) ?? []), { row, o }]);
    }
    const patterns: Pattern[] = [...seen.entries()].map(([kind, xs]) => {
      const sessions = new Set(xs.map((x) => x.row.session)).size;
      const trainers = new Set(xs.map((x) => x.row.author)).size;
      const parts = xs.map((x) => x.o.part).filter(Boolean);
      const part = parts.sort((a, b) => parts.filter((p) => p === b).length - parts.filter((p) => p === a).length)[0] ?? "";
      return {
        kind,
        positive: OBSERVATION_KINDS[kind]?.positive ?? false,
        count: xs.length,
        sessions,
        trainers,
        pattern: sessions >= settings.minSessions || trainers >= settings.minTrainers,
        part,
        ...contextOf(
          xs.map((x) => x.row),
          rows,
        ),
        suggestions: [...new Set(xs.map((x) => x.o.suggestion.trim()).filter(Boolean))].slice(0, 3),
      };
    });
    patterns.sort((a, b) => Number(b.pattern) - Number(a.pattern) || Number(a.positive) - Number(b.positive) || b.count - a.count || a.kind.localeCompare(b.kind));

    const recent = rated.filter((r) => now.getTime() - r.at.getTime() <= TREND_DAYS * DAY).map((r) => r.rating!);
    const older = rated.filter((r) => now.getTime() - r.at.getTime() > TREND_DAYS * DAY).map((r) => r.rating!);
    const falling = recent.length >= 2 && older.length >= 2 && mean(recent)! <= mean(older)! - 0.5;
    const out = removed.filter((r) => r.code === code && now.getTime() - r.at.getTime() <= REMOVED_DAYS * DAY).length;
    const trend = out >= 2 ? "byttes_ut" : falling ? "faller" : "";
    return { code, score, ratings: rated.length, trend, patterns, bands: bandScores(rated) };
  });
}

/** «Mye venting/kø: 3 økter, 2 trenere · organisering · med 12 eller flere spillere». */
export function patternText(p: Pattern): string {
  const label = OBSERVATION_KINDS[p.kind]?.label ?? p.kind;
  const who = [`${p.sessions} ${p.sessions === 1 ? "økt" : "økter"}`, `${p.trainers} ${p.trainers === 1 ? "trener" : "trenere"}`].join(", ");
  return [`${label[0].toUpperCase()}${label.slice(1)}: ${who}`, OBSERVATION_PARTS[p.part] ?? "", p.context].filter(Boolean).join(" · ");
}

export const TREND_TEXT: Record<ExercisePattern["trend"], string> = {
  "": "",
  faller: "Vurderingene har falt de siste to månedene.",
  byttes_ut: "Trenerne har byttet ut øvelsen i opplegg fra KI flere ganger.",
};

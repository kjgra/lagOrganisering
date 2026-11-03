import type { BandKey } from "@/lib/nff/fagplan";
import type { Insight } from "./insights";
import type { VersionStat } from "./versions";

/**
 * «Innsikt» in Forbedringer: whether KI gets better, counted from what the
 * trainers did and rated. Counts only, for every team together; no names
 * and no text. Months are Oslo months, «2026-11».
 */

/** A plan version, as far as the numbers need it. */
export interface PlanRow {
  id: number;
  /** Group and event: one session. */
  session: string;
  version: number;
  status: string;
  source: "manual" | "ai";
  /** «hurtig» for «Hurtigopprett». */
  kind: string;
  codes: string[];
  /** Month the approved version was approved (only read for it). */
  month: string | null;
}

export interface MonthRow {
  month: string;
  /** Approved sessions with a KI plan before them. */
  kiSessions: number;
  /** Exercises in those KI plans, and how many of them the approved plan kept. */
  kiExercises: number;
  kept: number;
  /** «Hurtigopprett» plans approved, and how many without any change of exercises. */
  quick: number;
  quickUnchanged: number;
  /** «Hele økta» rated, for sessions with a KI plan and for the others. */
  kiMean: number | null;
  kiRatings: number;
  ownMean: number | null;
  ownRatings: number;
}

export interface SessionRating {
  month: string;
  /** 1–3. */
  rating: number;
  /** The session had a KI plan (any version). */
  ki: boolean;
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) / 100 : null);

/** What happened to KI's plan in each approved session: the last KI version before the approved one. */
export function kiOutcomes(plans: PlanRow[]): { session: string; month: string; codes: number; kept: number; quick: boolean; unchanged: boolean }[] {
  const by = new Map<string, PlanRow[]>();
  for (const p of plans) by.set(p.session, [...(by.get(p.session) ?? []), p]);
  const out = [];
  for (const [session, list] of by) {
    const approved = list.find((p) => p.status === "approved");
    if (!approved?.month) continue;
    const ki = list
      .filter((p) => p.source === "ai" && p.version <= approved.version)
      .sort((a, b) => b.version - a.version)[0];
    if (!ki) continue;
    const kept = new Set(approved.codes);
    out.push({
      session,
      month: approved.month,
      codes: ki.codes.length,
      kept: ki.codes.filter((c) => kept.has(c)).length,
      quick: ki.kind === "hurtig",
      unchanged: same(ki.codes, approved.codes),
    });
  }
  return out;
}

/** The numbers per month, the last `months` (newest first), from the outcomes and the session ratings. */
export function monthRows(plans: PlanRow[], ratings: SessionRating[], months: string[]): MonthRow[] {
  const outcomes = kiOutcomes(plans);
  return months.map((month) => {
    const o = outcomes.filter((x) => x.month === month);
    const q = o.filter((x) => x.quick);
    const r = ratings.filter((x) => x.month === month && x.rating >= 1 && x.rating <= 3);
    const ki = r.filter((x) => x.ki).map((x) => x.rating);
    const own = r.filter((x) => !x.ki).map((x) => x.rating);
    return {
      month,
      kiSessions: o.length,
      kiExercises: o.reduce((s, x) => s + x.codes, 0),
      kept: o.reduce((s, x) => s + x.kept, 0),
      quick: q.length,
      quickUnchanged: q.filter((x) => x.unchanged).length,
      kiMean: mean(ki),
      kiRatings: ki.length,
      ownMean: mean(own),
      ownRatings: own.length,
    };
  });
}

/** The sum over the months: the figures at the top. */
export function totals(rows: MonthRow[]) {
  const sum = (k: keyof Omit<MonthRow, "month" | "kiMean" | "ownMean">) => rows.reduce((s, r) => s + r[k], 0);
  const weighted = (m: "kiMean" | "ownMean", n: "kiRatings" | "ownRatings") => {
    const total = sum(n);
    return total ? Math.round((rows.reduce((s, r) => s + (r[m] ?? 0) * r[n], 0) / total) * 100) / 100 : null;
  };
  return {
    quick: sum("quick"),
    quickUnchanged: sum("quickUnchanged"),
    kiExercises: sum("kiExercises"),
    kept: sum("kept"),
    kiMean: weighted("kiMean", "kiRatings"),
    kiRatings: sum("kiRatings"),
    ownMean: weighted("ownMean", "ownRatings"),
    ownRatings: sum("ownRatings"),
  };
}

/** «2026-11» for the last `n` months up to the one `now` is in, newest first. */
export function lastMonths(year: number, month: number, n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const m = (year * 12 + (month - 1) - i) % 12;
    const y = Math.floor((year * 12 + (month - 1) - i) / 12);
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  });
}

const MONTH_NAMES = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
export const monthName = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

/** «63 %», or «–» when there is nothing to count. */
export const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)} %` : "–");

/** The combinations that work best per band: from several groups, rated 2,5 or more, best first. */
export function bestCombinations(insights: Insight[], live: Set<string>, perBand = 3): Map<BandKey, Insight[]> {
  const out = new Map<BandKey, Insight[]>();
  const good = insights
    .filter((i) => i.kind === "kombinasjon" && i.groups >= 2 && i.mean >= 2.5 && i.codes.every((c) => live.has(c)))
    .sort((a, b) => b.mean - a.mean || b.sessions - a.sessions || a.key.localeCompare(b.key));
  for (const i of good) {
    const list = out.get(i.band) ?? [];
    if (list.length < perBand) out.set(i.band, [...list, i]);
  }
  return out;
}

/** Ratings each side needs before an improvement counts as measured. */
export const MEASURED_AFTER = 3;

export interface ImprovementEffect {
  code: string;
  version: number;
  before: { mean: number | null; n: number };
  after: { mean: number | null; n: number };
  measured: boolean;
}

/** Each version from Forbedringer (by hand or automatic) against the version before it. */
export function improvementEffects(byCode: Map<string, VersionStat[]>): ImprovementEffect[] {
  const out: ImprovementEffect[] = [];
  for (const [code, stats] of byCode)
    for (const v of stats) {
      if (v.source !== "forbedring" && v.source !== "automatisk") continue;
      const prev = stats.find((s) => s.version === v.version - 1);
      if (!prev) continue;
      const before = { mean: prev.mean, n: prev.n };
      const after = { mean: v.mean, n: v.n };
      out.push({ code, version: v.version, before, after, measured: before.n >= MEASURED_AFTER && after.n >= MEASURED_AFTER });
    }
  return out.sort((a, b) => Number(b.measured) - Number(a.measured) || a.code.localeCompare(b.code) || b.version - a.version);
}

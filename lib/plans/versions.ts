import { exerciseChanges } from "./exercise-edits";
import type { ExerciseValues } from "./exercise-values";
import { meanText } from "./feedback";

/**
 * Versions of an exercise: each change is a new version, and each evaluation
 * belongs to the version it was about. That gives the mean before and after
 * a change, and a way back when a new version is clearly worse.
 */

export const VERSION_SOURCES = {
  tidligere: "Før endringene ble lagret som versjoner",
  endret: "Endret av en trener",
  forbedring: "Forslag fra Forbedringer",
  automatisk: "Liten forbedring, brukt automatisk",
  tilbakerulling: "Tilbake til en tidligere versjon",
} as const;
export type VersionSource = keyof typeof VERSION_SOURCES;

export interface VersionStat {
  version: number;
  source: VersionSource;
  /** Ratings of this version, and their mean (null without ratings). */
  n: number;
  mean: number | null;
  created_at: Date | null;
}

/** A new version from Forbedringer is measured against the one before it after this many ratings. */
export const MEASURE_AFTER = 5;
/** … and the one before needs this many ratings to compare with. */
const MIN_BEFORE = 3;
/** Clearly worse: the mean this much lower. */
const WORSE_BY = 0.5;

/** The fields a small change may add lines to, which can be used without a trainer when that is turned on. */
const SMALL_FIELDS = new Set<keyof ExerciseValues>(["easier", "harder", "questions", "learning_points"]);

const lines = (x: string) =>
  x
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean);

/** Only new lines under easier, harder, questions or learning points: nothing removed or rewritten. */
export function isSmallChange(before: ExerciseValues, after: ExerciseValues): boolean {
  const keys = Object.keys(exerciseChanges(before, after)) as (keyof ExerciseValues)[];
  if (!keys.length) return false;
  return keys.every((k) => {
    if (!SMALL_FIELDS.has(k)) return false;
    const now = new Set(lines(after[k] as string));
    return lines(before[k] as string).every((l) => now.has(l));
  });
}

export interface Rollback {
  from: number;
  to: number;
  reason: string;
}

/**
 * Go back when the current version came from Forbedringer (by hand or
 * automatically) and, after enough ratings, is clearly worse than the one
 * before. A trainer's own change is never undone by the app.
 */
export function rollbackDecision(stats: VersionStat[], current: number): Rollback | null {
  const now = stats.find((s) => s.version === current);
  const before = stats.find((s) => s.version === current - 1);
  if (!now || !before || !["forbedring", "automatisk"].includes(now.source)) return null;
  if (now.n < MEASURE_AFTER || before.n < MIN_BEFORE || now.mean === null || before.mean === null) return null;
  if (now.mean > before.mean - WORSE_BY) return null;
  return {
    from: current,
    to: before.version,
    reason: `Versjon ${current} fikk snitt ${meanText(now.mean)} av 3 fra ${now.n} vurderinger, mot ${meanText(before.mean)} fra ${before.n} for versjon ${before.version}. Appen har gått tilbake til innholdet i versjon ${before.version}.`,
  };
}

/** «snitt 2,4 av 3 fra 5 vurderinger», or «ikke vurdert ennå». */
export function versionStatText(s: Pick<VersionStat, "n" | "mean">): string {
  return s.n && s.mean !== null ? `snitt ${meanText(s.mean)} av 3 fra ${s.n} ${s.n === 1 ? "vurdering" : "vurderinger"}` : "ikke vurdert ennå";
}

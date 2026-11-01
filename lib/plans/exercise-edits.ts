import type { ExerciseValues } from "./exercise-values";

/**
 * What a trainer changes in an exercise, and in KI's suggestions, is a signal
 * about what works: each save of an exercise logs the fields that changed
 * (before and after). Kinds:
 * - `ki_forslag`: what «Juster med KI» suggested, compared with the bank.
 * - `retting_av_ki`: what the trainer changed in KI's version before saving
 *   it (also the first change of an exercise KI made).
 * - `manuell`: any other change.
 * - `opplegg_etter_ki`: a trainer's own version of a plan KI made: which
 *   exercises were kept, removed and added.
 */

export const EDIT_KINDS = {
  ki_forslag: "KI foreslo",
  retting_av_ki: "Treneren rettet KI",
  manuell: "Endret",
  opplegg_etter_ki: "Opplegg endret etter KI",
} as const;
export type EditKind = keyof typeof EDIT_KINDS;

export const EDIT_FIELDS: Record<keyof ExerciseValues, string> = {
  name: "Navn",
  category: "Kategori",
  themes: "Temaer",
  min_players: "Min. spillere",
  max_players: "Maks spillere",
  duration_minutes: "Minutter",
  area: "Område",
  organisation: "Organisering",
  execution: "Gjennomføring",
  learning_points: "Læringsmomenter",
  questions: "Spørsmål",
  easier: "Enklere",
  harder: "Vanskeligere",
  nff_url: "Lenke",
  drawing: "Tegning",
  status: "Status",
  bands: "Aldersbånd",
  nff_activity: "Aktivitet",
  nff_tags: "NFF-tagger",
};

/** Text is cut here in the log; enough to see what changed. */
const MAX = 1000;

export type ExerciseChanges = Partial<Record<keyof ExerciseValues, { fra: string; til: string }>>;

type Comparable = Omit<ExerciseValues, "themes"> & { themes: string | string[] };

function norm(k: keyof ExerciseValues, x: unknown): string {
  if (Array.isArray(x)) return (k === "themes" ? x : [...x].sort()).map((s) => String(s).trim()).filter(Boolean).join(", ");
  const t = typeof x === "string" ? x : x === null || x === undefined ? "" : String(x);
  if (k === "drawing") {
    try {
      return t.trim() ? JSON.stringify(JSON.parse(t)) : "";
    } catch {
      return t.trim();
    }
  }
  if (k === "themes") return t.split(",").map((s) => s.trim()).filter(Boolean).join(", ");
  return t
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n");
}

/** The fields that differ; the drawing only says that it changed. */
export function exerciseChanges(before: Comparable, after: Comparable): ExerciseChanges {
  const out: ExerciseChanges = {};
  for (const k of Object.keys(EDIT_FIELDS) as (keyof ExerciseValues)[]) {
    const a = norm(k, before[k]);
    const b = norm(k, after[k]);
    if (a === b) continue;
    out[k] = k === "drawing" ? { fra: a ? "(tegning)" : "", til: b ? "(tegning)" : "" } : { fra: a.slice(0, MAX), til: b.slice(0, MAX) };
  }
  return out;
}

export interface PlanChanges {
  beholdt: string[];
  fjernet: string[];
  lagt_til: string[];
  /** The KI plan was made by «Hurtigopprett» (no wishes from the trainer). */
  hurtig?: boolean;
}

/** Which exercises (by code) a trainer kept, removed and added in a plan KI made. */
export function planChanges(before: string[], after: string[]): PlanChanges {
  return {
    beholdt: after.filter((c) => before.includes(c)),
    fjernet: before.filter((c) => !after.includes(c)),
    lagt_til: after.filter((c) => !before.includes(c)),
  };
}

/** «Gjennomføring, Organisering» for a logged change. */
export function changedFieldsText(changes: Record<string, unknown>): string {
  return Object.keys(changes)
    .map((k) => EDIT_FIELDS[k as keyof ExerciseValues] ?? k)
    .join(", ");
}

import { shouldAvoid } from "@/lib/plans/feedback";
import type { BankExercise } from "@/lib/plans/plan";
import { AKTIVITETER, BAND_KEYS, DELFERDIGHETER, HOVEDTEMA, delfTag, temaTag, type BandKey } from "./fagplan";

/**
 * How well the bank covers NFF's fagplan: a grid of age band × hovedtema × activity
 * (the 40 cells that exist in the fagplan), and the delferdigheter per band as a check.
 * An exercise counts in every cell its tags put it in. «Good» is an active exercise
 * KI does not avoid; candidates are shown, but do not count as good until tried.
 */

/** Good exercises a cell should have. */
export const CELL_GOAL = 2;
/** Good exercises with a delferdighet as focus a band should have. */
export const DELF_GOAL = 3;

/** Short names for the grid, where the fagplan's names are too long for a phone. */
export const TEMA_SHORT: Record<string, string> = {
  "score-mal": "Score mål",
  "hindre-mal": "Hindre mål",
  "spille-framover": "Spille framover",
  "komme-til-avslutning": "Komme til avslutning",
  "vinne-ball": "Vinne ball",
  "hindre-avslutning": "Hindre avslutning",
};

export const AKTIVITET_SHORT: Record<string, string> = {
  "sjef-intro": "Sjef – intro",
  "sjef-repetisjon": "Sjef – rep.",
  "med-og-mot": "Med og mot",
  spill: "Spill",
};

export interface CoverageExercise {
  id: number;
  name: string;
  status: string;
  good: boolean;
}

export interface CoverageCell {
  /** `<band>.<tema>.<aktivitet>`, for links. */
  key: string;
  band: BandKey;
  tema: string;
  aktivitet: string;
  good: number;
  candidates: number;
  exercises: CoverageExercise[];
}

export interface DelfCoverage {
  band: BandKey;
  key: string;
  label: string;
  good: number;
  candidates: number;
}

export interface Coverage {
  cells: CoverageCell[];
  delf: DelfCoverage[];
  /** Exercises in use (not archived) without an age band, hovedtema or activity: they are in no cell. */
  untagged: number;
}

export const isGood = (b: BankExercise) => b.status === "active" && !shouldAvoid(b);

export function coverage(bank: BankExercise[]): Coverage {
  const used = bank.filter((b) => b.status !== "archived");
  const cells: CoverageCell[] = BAND_KEYS.flatMap((band) =>
    HOVEDTEMA.filter((t) => t.bands.includes(band)).flatMap((t) =>
      AKTIVITETER.map((a) => {
        const inCell = used.filter((b) => b.bands.includes(band) && b.nff_tags.includes(temaTag(t.key)) && b.nff_activity === a.key);
        const exercises = inCell.map((b) => ({ id: b.id, name: b.name, status: b.status, good: isGood(b) }));
        return {
          key: `${band}.${t.key}.${a.key}`,
          band,
          tema: t.key,
          aktivitet: a.key,
          good: exercises.filter((e) => e.good).length,
          candidates: exercises.filter((e) => e.status === "candidate").length,
          exercises: exercises.sort((x, y) => Number(y.good) - Number(x.good) || x.name.localeCompare(y.name, "nb")),
        };
      }),
    ),
  );
  const delf = BAND_KEYS.flatMap((band) =>
    DELFERDIGHETER.filter((d) => d.bands.includes(band)).map((d) => {
      const withIt = used.filter((b) => b.bands.includes(band) && b.nff_tags.includes(delfTag(d.key)));
      return { band, key: d.key, label: d.label, good: withIt.filter(isGood).length, candidates: withIt.filter((b) => b.status === "candidate").length };
    }),
  );
  const untagged = used.filter((b) => !b.bands.length || !b.nff_activity || !b.nff_tags.some((t) => t.startsWith("tema."))).length;
  return { cells, delf, untagged };
}

/** The cells with fewer good exercises than the goal, as the order for the next series (download). */
export function coverageGaps(c: Coverage) {
  return {
    mal_per_celle: CELL_GOAL,
    mal_per_delferdighet: DELF_GOAL,
    celler: c.cells
      .filter((x) => x.good < CELL_GOAL)
      .map((x) => ({ aldersband: x.band, hovedtema: x.tema, aktivitet: x.aktivitet, gode: x.good, kandidater: x.candidates, mangler: CELL_GOAL - x.good })),
    delferdigheter: c.delf
      .filter((x) => x.good < DELF_GOAL)
      .map((x) => ({ aldersband: x.band, delferdighet: x.key, gode: x.good, kandidater: x.candidates, mangler: DELF_GOAL - x.good })),
  };
}

import type { BandKey } from "@/lib/nff/fagplan";
import { prettyDrawing } from "./drawing";
import { categoryKey, type BankExercise, type PlanExercise } from "./plan";

/** An exercise in the bank as the form shows it (ExerciseForm). */
export interface ExerciseValues {
  name: string;
  category: string;
  themes: string;
  min_players: string;
  max_players: string;
  duration_minutes: string;
  area: string;
  organisation: string;
  execution: string;
  learning_points: string;
  questions: string;
  easier: string;
  harder: string;
  nff_url: string;
  drawing: string;
  status: string;
  bands: BandKey[];
  nff_activity: string;
  nff_tags: string[];
}

const n = (x: number | null) => (x === null ? "" : String(x));

export function exerciseValues(b: BankExercise): ExerciseValues {
  return {
    name: b.name,
    category: b.category,
    themes: b.themes.join(", "),
    min_players: n(b.min_players),
    max_players: n(b.max_players),
    duration_minutes: n(b.duration_minutes),
    area: b.area,
    organisation: b.organisation,
    execution: b.execution,
    learning_points: b.learning_points,
    questions: b.questions,
    easier: b.easier,
    harder: b.harder,
    nff_url: b.nff_url,
    drawing: prettyDrawing(b.drawing),
    status: b.status,
    bands: b.bands,
    nff_activity: b.nff_activity,
    nff_tags: b.nff_tags,
  };
}

/**
 * The exercise as KI adjusted it, for the form. Status, themes and bands stay
 * as they were; what KI left out (players, area, a drawing it got wrong) is kept.
 */
export function adjustedValues(
  b: BankExercise,
  e: PlanExercise,
  extra: { min_players: number | null; max_players: number | null; duration_minutes: number | null; area: string },
): ExerciseValues {
  const lines = (x: string[]) => x.join("\n");
  return {
    ...exerciseValues(b),
    name: e.navn,
    category: categoryKey(e.kategori),
    min_players: n(extra.min_players ?? b.min_players),
    max_players: n(extra.max_players ?? b.max_players),
    duration_minutes: n(extra.duration_minutes ?? b.duration_minutes),
    area: extra.area || b.area,
    organisation: lines(e.organisering),
    execution: lines(e.gjennomforing),
    learning_points: lines(e.laeringsmomenter),
    questions: lines(e.sporsmal),
    easier: e.enklere,
    harder: e.vanskeligere,
    nff_url: e.nff_url,
    drawing: e.tegning ? prettyDrawing(e.tegning) : prettyDrawing(b.drawing),
    nff_activity: e.aktivitet ?? b.nff_activity,
    nff_tags: e.nff_tags ?? b.nff_tags,
  };
}

import { z } from "zod";
import { PlanError, tooSimilar, validateExercise, type BankExercise, type ExerciseInput } from "./plan";

/**
 * Import of exercises from a JSON file (superadmin). The exercises themselves are
 * not in the repository: they are CC BY-SA content, kept outside the MIT code and
 * uploaded in the app. The file is `{ "ovelser": [ … ] }` (or just the list), each
 * exercise with the same fields as the exercise form, numbers as numbers or text.
 */

export const IMPORT_MAX = 100;

const field = z.union([z.string(), z.number()]).nullish();
const list = z.array(z.string()).nullish();

const fileExercise = z
  .object({
    name: field,
    category: field,
    themes: list,
    min_players: field,
    max_players: field,
    duration_minutes: field,
    area: field,
    organisation: field,
    execution: field,
    learning_points: field,
    questions: field,
    easier: field,
    harder: field,
    nff_url: field,
    drawing: z.unknown().optional(),
    status: field,
    bands: list,
    nff_activity: field,
    nff_tags: list,
  })
  .passthrough();

const fileSchema = z.union([z.object({ ovelser: z.array(z.unknown()) }).passthrough(), z.array(z.unknown())]);

const str = (x: unknown) => (x === null || x === undefined ? "" : String(x));

export type ImportStatus = "ny" | "finnes" | "ligner" | "feil";

export interface ImportRow {
  /** 1-based position in the file. */
  no: number;
  name: string;
  status: ImportStatus;
  /** Why it will not be imported (error, the exercise it is like). */
  note: string;
  /** The input saveExercise takes, when the row can be imported. */
  input: ExerciseInput | null;
}

/** Read the file text into raw exercises. Throws PlanError for text that is not such a file. */
export function parseImportFile(text: string): unknown[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new PlanError("Fila er ikke gyldig JSON.");
  }
  const f = fileSchema.safeParse(json);
  if (!f.success) throw new PlanError("Fila må ha en liste med øvelser under «ovelser».");
  const items = Array.isArray(f.data) ? f.data : f.data.ovelser;
  if (!items.length) throw new PlanError("Fila har ingen øvelser.");
  if (items.length > IMPORT_MAX) throw new PlanError(`Fila kan ha maks ${IMPORT_MAX} øvelser.`);
  return items;
}

function toInput(raw: unknown): ExerciseInput {
  const p = fileExercise.safeParse(raw);
  if (!p.success) throw new PlanError("Feltene har feil type.");
  const e = p.data;
  const drawing = e.drawing === undefined || e.drawing === null ? "" : typeof e.drawing === "string" ? e.drawing : JSON.stringify(e.drawing);
  return {
    name: str(e.name),
    category: str(e.category),
    themes: e.themes ?? [],
    min_players: str(e.min_players),
    max_players: str(e.max_players),
    duration_minutes: str(e.duration_minutes),
    area: str(e.area),
    organisation: str(e.organisation),
    execution: str(e.execution),
    learning_points: str(e.learning_points),
    questions: str(e.questions),
    easier: str(e.easier),
    harder: str(e.harder),
    nff_url: str(e.nff_url),
    drawing,
    // Imported exercises come in as candidates unless the file says otherwise.
    status: str(e.status) || "candidate",
    bands: e.bands ?? [],
    nff_activity: str(e.nff_activity),
    nff_tags: e.nff_tags ?? [],
  };
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * What would happen to each exercise in the file: «ny» is imported; «finnes» (same
 * name in the bank or earlier in the file), «ligner» (too like one in the bank or
 * earlier in the file) and «feil» (does not pass the form's checks) are skipped.
 */
export function previewImport(items: unknown[], bank: BankExercise[]): ImportRow[] {
  const rows: ImportRow[] = [];
  const seen: BankExercise[] = [];
  items.forEach((raw, i) => {
    const no = i + 1;
    const name = raw && typeof raw === "object" && "name" in raw ? str((raw as { name: unknown }).name).trim() : "";
    let input: ExerciseInput;
    let v: ReturnType<typeof validateExercise>;
    try {
      input = toInput(raw);
      v = validateExercise(input);
    } catch (err) {
      if (!(err instanceof PlanError)) throw err;
      rows.push({ no, name: name || `Øvelse ${no}`, status: "feil", note: err.message, input: null });
      return;
    }
    const all = [...bank, ...seen];
    const same = all.find((b) => norm(b.name) === norm(v.name));
    if (same) {
      rows.push({ no, name: v.name, status: "finnes", note: `«${same.name}» finnes allerede.`, input: null });
      return;
    }
    const like = tooSimilar({ ...v, drawing: v.drawing ?? null }, all);
    if (like) {
      rows.push({ no, name: v.name, status: "ligner", note: `${Math.round(like.score * 100)} % lik «${like.name}».`, input: null });
      return;
    }
    rows.push({ no, name: v.name, status: "ny", note: "", input });
    // Later rows are compared with this one too.
    seen.push({ ...(v as unknown as BankExercise), id: -no, code: `import-${no}`, drawing: v.drawing ?? null });
  });
  return rows;
}

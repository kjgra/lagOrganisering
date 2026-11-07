import { z } from "zod";
import { exerciseInputFrom, exerciseValues, type ExerciseValues } from "./exercise-values";
import { PlanError, tooSimilar, validateExercise, type BankExercise, type ExerciseInput } from "./plan";

/**
 * Import of exercises from a JSON file (superadmin). The exercises themselves are
 * not in the repository: they are CC BY-SA content, kept outside the MIT code and
 * uploaded in the app. The file is `{ "ovelser": [ … ] }` (or just the list), each
 * exercise with the same fields as the exercise form, numbers as numbers or text.
 *
 * An entry with `code` (an exercise in the bank) is a change instead: only the
 * fields it has are changed, and it becomes a proposal in «Forbedringer»
 * (kind ny_versjon) with `begrunnelse` as the reason, so a trainer uses or
 * turns it down there and the app keeps versions and measures the effect.
 */

export const IMPORT_MAX = 100;
export const REASON_MAX = 1000;
/** The reason shown in «Forbedringer» when the file gives none. */
export const DEFAULT_REASON = "Forbedring lastet opp fra fil.";

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

export type ImportStatus = "ny" | "endring" | "finnes" | "ligner" | "feil";

/** A change to an exercise in the bank, which becomes a proposal. */
export interface ImportChange {
  code: string;
  reason: string;
  base: ExerciseValues;
  proposed: ExerciseValues;
}

export interface ImportRow {
  /** 1-based position in the file. */
  no: number;
  name: string;
  status: ImportStatus;
  /** Why it will not be imported (error, the exercise it is like). */
  note: string;
  /** The input saveExercise takes, when the row can be imported. */
  input: ExerciseInput | null;
  /** For «endring»: the proposal it becomes. */
  change?: ImportChange | null;
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

const FORM_FIELDS = [
  "name", "category", "themes", "min_players", "max_players", "duration_minutes", "area", "organisation", "execution",
  "learning_points", "questions", "easier", "harder", "nff_url", "drawing", "status", "bands", "nff_activity", "nff_tags",
] as const;

const FIELD_LABELS: Record<(typeof FORM_FIELDS)[number], string> = {
  name: "navn", category: "kategori", themes: "tema", min_players: "min. spillere", max_players: "maks spillere",
  duration_minutes: "minutter", area: "område", organisation: "organisering", execution: "gjennomføring",
  learning_points: "læringsmomenter", questions: "spørsmål", easier: "enklere", harder: "vanskeligere", nff_url: "NFF-lenke",
  drawing: "tegning", status: "status", bands: "aldersbånd", nff_activity: "NFF-aktivitet", nff_tags: "NFF-tagger",
};

/**
 * The exercise with the fields the file changes, as the form shows it, or a
 * PlanError. Fields the file leaves out stay as they are.
 */
function changedValues(raw: Record<string, unknown>, b: BankExercise): ExerciseValues {
  const base = exerciseValues(b);
  const given = Object.fromEntries(FORM_FIELDS.filter((k) => k in raw).map((k) => [k, raw[k]]));
  const merged = toInput({ ...exerciseInputFrom(base), ...given, status: "status" in given ? given.status : base.status });
  const v = validateExercise(merged);
  // As the form would show the saved exercise (drawing pretty-printed, numbers as text).
  return exerciseValues({ ...b, ...v, drawing: v.drawing ?? null, themes: v.themes, bands: v.bands, nff_tags: v.nff_tags } as BankExercise);
}

const same = (a: ExerciseValues, b: ExerciseValues) => JSON.stringify(a) === JSON.stringify(b);

function changeRow(no: number, raw: Record<string, unknown>, bank: BankExercise[], waiting: Set<string>, seen: Set<string>): ImportRow {
  const code = str(raw.code).trim();
  const b = bank.find((x) => x.code === code);
  if (!b) return { no, name: str(raw.name).trim() || code, status: "feil", note: `Fant ingen øvelse med koden «${code}».`, input: null };
  if (seen.has(code)) return { no, name: b.name, status: "finnes", note: "Øvelsen er endret lenger opp i fila.", input: null };
  seen.add(code);
  if (waiting.has(code)) return { no, name: b.name, status: "finnes", note: "Har allerede et forslag som venter i Forbedringer.", input: null };
  let proposed: ExerciseValues;
  try {
    proposed = changedValues(raw, b);
  } catch (err) {
    if (!(err instanceof PlanError)) throw err;
    return { no, name: b.name, status: "feil", note: err.message, input: null };
  }
  const base = exerciseValues(b);
  if (same(base, proposed)) return { no, name: b.name, status: "finnes", note: "Ingen endringer.", input: null };
  const changed = FORM_FIELDS.filter((k) => JSON.stringify(base[k]) !== JSON.stringify(proposed[k])).map((k) => FIELD_LABELS[k]);
  const reason = str(raw.begrunnelse).trim().slice(0, REASON_MAX) || DEFAULT_REASON;
  return { no, name: b.name, status: "endring", note: `Endrer ${changed.join(", ")}.`, input: null, change: { code, reason, base, proposed } };
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * What would happen to each exercise in the file: «ny» is imported, «endring» becomes
 * a proposal (`waiting` are the codes that already have one); «finnes» (same
 * name in the bank or earlier in the file), «ligner» (too like one in the bank or
 * earlier in the file) and «feil» (does not pass the form's checks) are skipped.
 */
export function previewImport(items: unknown[], bank: BankExercise[], waiting: Set<string> = new Set()): ImportRow[] {
  const rows: ImportRow[] = [];
  const seen: BankExercise[] = [];
  const changed = new Set<string>();
  items.forEach((raw, i) => {
    const no = i + 1;
    if (raw && typeof raw === "object" && !Array.isArray(raw) && str((raw as { code?: unknown }).code).trim()) {
      rows.push(changeRow(no, raw as Record<string, unknown>, bank, waiting, changed));
      return;
    }
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

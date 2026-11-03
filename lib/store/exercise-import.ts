import type { Db } from "@/lib/db";
import { parseImportFile, previewImport, type ImportRow } from "@/lib/plans/exercise-import";
import { PlanError } from "@/lib/plans/plan";
import { assertGroup, assertSuperadmin, UserError, type Access, type Rights } from "./access";
import { listExercises, saveExercise, TooSimilarError } from "./training";

function read(text: string): unknown[] {
  try {
    return parseImportFile(text);
  } catch (err) {
    if (err instanceof PlanError) throw new UserError(err.message);
    throw err;
  }
}

/** What an import of the file would do, without saving anything (superadmin). */
export async function previewExerciseImport(d: Db, access: Access, rights: Rights, groupId: string, text: string): Promise<ImportRow[]> {
  assertGroup(access, groupId);
  assertSuperadmin(rights);
  return previewImport(read(text), await listExercises(d, access, groupId));
}

/**
 * Put the exercises in the file into the bank (superadmin). Only the rows the preview
 * calls «ny» are saved, each as its own exercise, so running the same file twice adds nothing.
 */
export async function importExercises(d: Db, access: Access, rights: Rights, groupId: string, text: string): Promise<{ imported: string[]; skipped: ImportRow[] }> {
  const rows = await previewExerciseImport(d, access, rights, groupId, text);
  const imported: string[] = [];
  const skipped = rows.filter((r) => r.status !== "ny");
  for (const r of rows) {
    if (r.status !== "ny" || !r.input) continue;
    try {
      await saveExercise(d, access, groupId, r.input, null);
      imported.push(r.name);
    } catch (err) {
      // Saved by someone else in the meantime.
      if (!(err instanceof TooSimilarError)) throw err;
      skipped.push({ ...r, status: "ligner", note: err.message, input: null });
    }
  }
  return { imported, skipped };
}

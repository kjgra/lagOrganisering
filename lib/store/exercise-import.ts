import type { Db } from "@/lib/db";
import { parseImportFile, previewImport, type ImportRow } from "@/lib/plans/exercise-import";
import { PlanError } from "@/lib/plans/plan";
import { assertGroup, assertSuperadmin, UserError, type Access, type Rights } from "./access";
import { busyProposals, saveProposal } from "./improvements";
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
  const [bank, busy] = await Promise.all([listExercises(d, access, groupId), busyProposals(d)]);
  return previewImport(read(text), bank, busy.open);
}

/**
 * Put the exercises in the file into the bank (superadmin). Only the rows the preview
 * calls «ny» are saved, each as its own exercise, so running the same file twice adds nothing.
 * Rows it calls «endring» become proposals in «Forbedringer»; a second run finds them waiting.
 */
export async function importExercises(
  d: Db,
  access: Access,
  rights: Rights,
  groupId: string,
  text: string,
): Promise<{ imported: string[]; proposed: string[]; skipped: ImportRow[] }> {
  const rows = await previewExerciseImport(d, access, rights, groupId, text);
  const imported: string[] = [];
  const proposed: string[] = [];
  const skipped = rows.filter((r) => r.status !== "ny" && r.status !== "endring");
  for (const r of rows) {
    if (r.status === "endring" && r.change) {
      const c = r.change;
      const id = await saveProposal(d, { code: c.code, kind: "ny_versjon", reason: c.reason, signature: "import", base: c.base, proposed: c.proposed, model: null, costUsd: 0 });
      if (id) proposed.push(r.name);
      else skipped.push({ ...r, status: "finnes", note: "Har allerede et forslag som venter i Forbedringer.", change: null });
      continue;
    }
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
  return { imported, proposed, skipped };
}

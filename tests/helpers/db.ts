import { PGlite } from "@electric-sql/pglite";
import { createPgliteDb } from "@/lib/db/pglite";
import type { Db } from "@/lib/db";

/**
 * A fresh, migrated in-memory database for one test file. It runs as the
 * app's role (nymark_app), as in production. `admin` runs as the owner, for
 * tests of migrations and of the copy scripts, which use the owner too.
 */
export async function testDb(opts: { admin?: boolean } = {}): Promise<Db> {
  void PGlite;
  const d = await createPgliteDb();
  if (opts.admin) await d.query("RESET ROLE");
  return d;
}

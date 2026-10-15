import { PGlite } from "@electric-sql/pglite";
import { createPgliteDb } from "@/lib/db/pglite";
import type { Db } from "@/lib/db";

/** A fresh, migrated in-memory database for one test file. */
export async function testDb(): Promise<Db> {
  void PGlite;
  return createPgliteDb();
}

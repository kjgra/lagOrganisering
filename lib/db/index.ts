import "server-only";
import { env } from "@/lib/env";
import { createPgliteDb } from "./pglite";
import { createPostgresDb } from "./postgres";

/**
 * A minimal database handle over raw, parameterised SQL ($1, $2, ...).
 *
 * The same SQL runs against Supabase (postgres.js over the pooler) and,
 * without DATABASE_URL, against PGlite (Postgres compiled to WebAssembly in
 * the process) so the app can run fully simulated. Rules that keep the two
 * alike: cast counts and sums with ::int or ::float8, and read jsonb as
 * ::text and parse it in code.
 */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Runs `fn` in one transaction. Nested calls reuse the outer transaction. */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const g = globalThis as unknown as { __nymarkDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!g.__nymarkDb) {
    const e = env();
    g.__nymarkDb = e.DATABASE_URL
      ? Promise.resolve(createPostgresDb(e.DATABASE_URL))
      : createPgliteDb(e.PGLITE_DIR || undefined).then(async (d) => {
          if (e.SPOND_MOCK) await (await import("@/lib/demo/seed")).seedDemo(d);
          return d;
        });
    // A failed start is not cached, so the next request tries again.
    g.__nymarkDb.catch(() => {
      g.__nymarkDb = undefined;
    });
  }
  return g.__nymarkDb;
}

/** For tests: use this handle instead of the configured one. */
export function setDbForTests(d: Db | undefined): void {
  g.__nymarkDb = d ? Promise.resolve(d) : undefined;
}

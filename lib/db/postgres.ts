import pg from "pg";
import { isLocalDb } from "@/lib/env";
import type { Db } from "./index";

/**
 * How long one query may take before the page gets an error instead of
 * hanging. The connection is thrown away, so the next query gets a fresh one.
 */
export const QUERY_TIMEOUT_MS = 25_000;

/**
 * Results as the store expects them (as with postgres.js before):
 * `date` as a Date at UTC midnight (not local midnight), `interval` as text.
 * Everything else uses node-postgres' parsers (jsonb → object, timestamptz →
 * Date, arrays → arrays, int8 and numeric → text).
 */
const types = {
  getTypeParser(oid: number, format?: "text" | "binary") {
    if (oid === 1082) return (x: string) => new Date(`${x}T00:00:00Z`);
    if (oid === 1186) return (x: string) => x;
    return pg.types.getTypeParser(oid, format);
  },
} as pg.CustomTypesConfig;

function handle(run: (text: string, params: unknown[]) => Promise<pg.QueryResult>, tx: Db["tx"], close: Db["close"]): Db {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await run(text, params)).rows as T[];
    },
    tx,
    close,
  };
}

/**
 * Supabase through the transaction pooler (port 6543), which serverless
 * functions should use. Always TLS, except for a Postgres on this machine
 * (local development, CI).
 *
 * node-postgres sends each query in one go (parse, bind, execute, sync).
 * postgres.js, used before 1.8.2, asks the database for the parameter types
 * first and sends the values in a second round; through the pooler a query
 * could stop between the two, and the page hung until Vercel stopped it.
 */
export function createPostgresDb(url: string, opts: { queryTimeoutMs?: number } = {}): Db {
  const u = new URL(url);
  // TLS is set below; a `sslmode` in the URL would override it.
  u.searchParams.delete("sslmode");
  const pool = new pg.Pool({
    connectionString: u.toString(),
    ssl: isLocalDb(url) ? false : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
    query_timeout: opts.queryTimeoutMs ?? QUERY_TIMEOUT_MS,
    types,
  });
  // A connection that breaks while idle must not take the server down.
  pool.on("error", (err) => console.error("Databasetilkobling feilet:", err.message));

  const close = async () => {
    await pool.end();
  };

  const tx = async <T>(fn: (d: Db) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    let broken: Error | undefined;
    try {
      await client.query("BEGIN");
      const inner: Db = handle((t, p) => client.query(t, p), (f) => f(inner), close);
      const res = await fn(inner);
      await client.query("COMMIT");
      return res;
    } catch (err) {
      // After a timeout the query may still run; the connection is closed instead.
      if ((err as Error).message === "Query read timeout") broken = err as Error;
      else {
        try {
          await client.query("ROLLBACK");
        } catch (e) {
          broken = e as Error;
        }
      }
      throw err;
    } finally {
      // A broken connection (or one that timed out) is closed, not reused.
      client.release(broken);
    }
  };

  return handle((t, p) => pool.query(t, p), tx, close);
}

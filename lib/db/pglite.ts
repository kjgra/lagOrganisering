import { mkdir } from "node:fs/promises";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import type { Db } from "./index";
import { migrationFiles } from "./migrations";

type Conn = PGlite | Transaction;

function wrap(conn: Conn, root: PGlite): Db {
  const self: Db = {
    async query<T>(text: string, params: unknown[] = []) {
      // Several statements without parameters (migrations) go through exec.
      if (params.length === 0 && /;\s*\S/.test(text)) {
        const res = await conn.exec(text);
        return (res.at(-1)?.rows ?? []) as T[];
      }
      return (await conn.query<T>(text, params)).rows;
    },
    async tx<T>(fn: (d: Db) => Promise<T>) {
      if (conn !== root) return fn(self);
      return root.transaction((t) => fn(wrap(t, root)));
    },
    async close() {
      await root.close();
    },
  };
  return self;
}

/**
 * The simulated database: Postgres in the process, with the same migrations
 * as Supabase. In memory, or in `dir` so data survives a restart of `pnpm dev`.
 */
export async function createPgliteDb(dir?: string): Promise<Db> {
  if (dir) await mkdir(dir, { recursive: true });
  const root = dir ? new PGlite(dir) : new PGlite();
  await root.waitReady;
  const d = wrap(root, root);
  await migrate(d);
  return d;
}

/** Runs the migrations that have not run yet (PGlite only; Supabase uses `supabase db push`). */
export async function migrate(d: Db): Promise<string[]> {
  await d.query(
    "CREATE TABLE IF NOT EXISTS local_migrations (name text PRIMARY KEY, run_at timestamptz NOT NULL DEFAULT now())",
  );
  const done = new Set((await d.query<{ name: string }>("SELECT name FROM local_migrations")).map((r) => r.name));
  const ran: string[] = [];
  for (const m of await migrationFiles()) {
    if (done.has(m.name)) continue;
    await d.tx(async (t) => {
      await t.query(m.sql);
      await t.query("INSERT INTO local_migrations (name) VALUES ($1)", [m.name]);
    });
    ran.push(m.name);
  }
  return ran;
}

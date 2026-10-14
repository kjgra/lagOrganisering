import postgres from "postgres";
import type { Db } from "./index";

type Sql = postgres.Sql | postgres.TransactionSql;

function wrap(sql: Sql, root: postgres.Sql): Db {
  const self: Db = {
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await sql.unsafe(text, params as postgres.ParameterOrJSON<never>[]);
      return rows as unknown as T[];
    },
    async tx<T>(fn: (d: Db) => Promise<T>) {
      if (sql !== root) return fn(self);
      return root.begin((t) => fn(wrap(t, root))) as Promise<T>;
    },
    async close() {
      await root.end({ timeout: 5 });
    },
  };
  return self;
}

/**
 * Supabase through the connection pooler. `prepare: false` is needed for the
 * transaction pooler (port 6543), which serverless functions should use.
 */
export function createPostgresDb(url: string): Db {
  const root = postgres(url, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });
  return wrap(root, root);
}

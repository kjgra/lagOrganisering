import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface MigrationFile {
  name: string;
  sql: string;
}

/** The SQL files in supabase/migrations, in name (timestamp) order. */
export async function migrationFiles(dir = path.join(process.cwd(), "supabase", "migrations")): Promise<MigrationFile[]> {
  const names = (await readdir(dir)).filter((n) => n.endsWith(".sql")).sort();
  return Promise.all(names.map(async (name) => ({ name, sql: await readFile(path.join(dir, name), "utf8") })));
}

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface MigrationFile {
  name: string;
  sql: string;
}

/**
 * The SQL files in supabase/migrations, in name (timestamp) order. The
 * files are added to the server bundle by `outputFileTracingIncludes`.
 */
export async function migrationFiles(dir = path.join(process.cwd(), "supabase", "migrations")): Promise<MigrationFile[]> {
  const names = (await readdir(/* turbopackIgnore: true */ dir)).filter((n) => n.endsWith(".sql")).sort();
  return Promise.all(names.map(async (name) => ({ name, sql: await readFile(path.join(/* turbopackIgnore: true */ dir, name), "utf8") })));
}

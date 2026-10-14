import { describe, expect, it } from "vitest";
import postgres from "postgres";
import { testDb } from "../helpers/db";
import { migrationFiles } from "@/lib/db/migrations";
import { createPostgresDb } from "@/lib/db/postgres";
import { migrate } from "@/lib/db/pglite";

const tables = async (q: (s: string) => Promise<{ relname: string; relrowsecurity: boolean }[]>) =>
  q("SELECT relname, relrowsecurity FROM pg_class WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace");

describe("migrations", () => {
  it("run on PGlite, and every table has row level security", async () => {
    const d = await testDb();
    const rows = await tables((s) => d.query(s));
    const app = rows.filter((r) => r.relname !== "local_migrations");
    expect(app.length).toBeGreaterThan(15);
    expect(app.filter((r) => !r.relrowsecurity).map((r) => r.relname)).toEqual([]);
    await d.close();
  });

  it("file names follow the Supabase CLI format", async () => {
    for (const m of await migrationFiles()) expect(m.name).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  // Runs against a real Postgres when TEST_DATABASE_URL is set (never production).
  it.skipIf(!process.env.TEST_DATABASE_URL)("run on real Postgres", async () => {
    const admin = postgres(process.env.TEST_DATABASE_URL!, { onnotice: () => {} });
    await admin.unsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await admin.end();
    const d = createPostgresDb(process.env.TEST_DATABASE_URL!);
    expect((await migrate(d)).length).toBeGreaterThan(0);
    const rows = await tables((s) => d.query(s));
    expect(rows.filter((r) => r.relname !== "local_migrations").every((r) => r.relrowsecurity)).toBe(true);
    await d.close();
  });
});

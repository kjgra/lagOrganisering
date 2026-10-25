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

describe("tag types migration", () => {
  it("turns number tags into levels, the newest winning, and keeps other tags", async () => {
    const d = await testDb();
    // Re-run the conversion from the migration on fresh tags.
    await d.query(
      `INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by, created_at)
       VALUES ('G1', 'M-1', '1', 'P-1', '2026-05-01'), ('G1', 'M-1', '2', 'P-1', '2026-05-02'),
              ('G1', 'M-2', 'Keeper', 'P-1', '2026-05-01'), ('G1', 'M-2', '7', 'P-1', '2026-05-01')`,
    );
    const sql = (await migrationFiles()).find((m) => m.name.endsWith("_tag_types.sql"))!.sql;
    await d.query(sql.slice(sql.indexOf("INSERT INTO member_levels")));
    expect(await d.query("SELECT spond_member_id, level FROM member_levels")).toEqual([{ spond_member_id: "M-1", level: 2 }]);
    expect(await d.query("SELECT tag FROM member_tags ORDER BY tag")).toEqual([{ tag: "7" }, { tag: "Keeper" }]);
    await d.close();
  });
});

describe("team birth year migration", () => {
  it("reads birth year and gender from the old free text, and keeps what it cannot read", async () => {
    const d = await testDb();
    await d.query(
      `INSERT INTO team_settings (spond_group_id, age_group, updated_by, updated_at)
       VALUES ('G1', 'G10', 'P-1', '2026-05-01'), ('G2', 'Jenter 2015', 'P-1', '2026-05-01'),
              ('G3', 'j9', 'P-1', '2025-12-31T23:30:00Z'), ('G4', 'Lilleputt', 'P-1', '2026-05-01')`,
    );
    const sql = (await migrationFiles()).find((m) => m.name.endsWith("_team_birth_year.sql"))!.sql;
    await d.query(sql.slice(sql.indexOf("UPDATE team_settings")));
    expect(await d.query("SELECT spond_group_id, age_group, birth_year, gender FROM team_settings ORDER BY spond_group_id")).toEqual([
      { spond_group_id: "G1", age_group: null, birth_year: 2016, gender: "gutter" },
      { spond_group_id: "G2", age_group: null, birth_year: 2015, gender: "jenter" },
      { spond_group_id: "G3", age_group: null, birth_year: 2017, gender: "jenter" },
      { spond_group_id: "G4", age_group: "Lilleputt", birth_year: null, gender: null },
    ]);
    await d.close();
  });
});

describe("training per subgroup migration", () => {
  it("moves the principles to their own table, for the main group", async () => {
    const d = await testDb();
    // Put the old column back, and re-run the move from the migration.
    await d.query("ALTER TABLE team_settings ADD COLUMN principles text");
    await d.query(
      `INSERT INTO team_settings (spond_group_id, principles, updated_by, updated_at)
       VALUES ('G1', '  Alle har ball ', 'P-1', '2026-05-01'), ('G2', '', 'P-1', '2026-05-01'), ('G3', NULL, 'P-1', '2026-05-01')`,
    );
    const sql = (await migrationFiles()).find((m) => m.name.endsWith("_training_per_subgroup.sql"))!.sql;
    const from = sql.indexOf("INSERT INTO team_principles");
    await d.query(sql.slice(from, sql.indexOf("\n", sql.indexOf("DROP COLUMN principles", from))));
    expect(await d.query("SELECT spond_group_id, spond_subgroup_id, body, created_by FROM team_principles")).toEqual([
      { spond_group_id: "G1", spond_subgroup_id: "", body: "Alle har ball", created_by: "P-1" },
    ]);
    expect(await d.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'team_settings' AND column_name = 'principles'")).toEqual([]);
    await d.close();
  });
});

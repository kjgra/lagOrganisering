import { describe, expect, it } from "vitest";
import postgres from "postgres";
import { testDb } from "../helpers/db";
import { migrationFiles } from "@/lib/db/migrations";
import { createPostgresDb } from "@/lib/db/postgres";
import { migrate } from "@/lib/db/pglite";
import type { ExercisePattern } from "@/lib/plans/observations";
import { allPatterns, savePatterns } from "@/lib/store/observations";

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

  it("every table has a policy and rights for the app's role, which cannot change the schema", async () => {
    const d = await testDb({ admin: true });
    const missing = await d.query<{ relname: string }>(
      `SELECT c.relname FROM pg_class c
        WHERE c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace AND c.relname <> 'local_migrations'
          AND (NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname AND 'nymark_app' = ANY (p.roles))
               OR NOT has_table_privilege('nymark_app', c.oid, 'SELECT, INSERT, UPDATE, DELETE'))`,
    );
    expect(missing.map((r) => r.relname)).toEqual([]);
    const [role] = await d.query<{ rolsuper: boolean; rolbypassrls: boolean; rolcreaterole: boolean; rolcreatedb: boolean }>(
      "SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = 'nymark_app'",
    );
    expect(role).toEqual({ rolsuper: false, rolbypassrls: false, rolcreaterole: false, rolcreatedb: false });
    await d.close();
  });

  it("the app's role reads and writes rows, but cannot change the schema", async () => {
    const d = await testDb();
    expect(await d.query<{ r: string }>("SELECT current_user AS r")).toEqual([{ r: "nymark_app" }]);
    await d.query("INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by) VALUES ('G1', 'M-1', 'Keeper', 'P-1')");
    expect(await d.query("SELECT tag FROM member_tags")).toEqual([{ tag: "Keeper" }]);
    await d.query("DELETE FROM member_tags");
    await expect(d.query("CREATE TABLE public.x (id int)")).rejects.toThrow(/permission denied/);
    await expect(d.query("DROP TABLE member_tags")).rejects.toThrow(/must be owner/);
    await expect(d.query("ALTER TABLE member_tags DISABLE ROW LEVEL SECURITY")).rejects.toThrow(/must be owner/);
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
    // JSON sent as text is stored as JSON, not as a JSON string (as PGlite does).
    await savePatterns(d, [{ code: "pasning", score: 2.5, ratings: 3, trend: "", patterns: [], bands: [{ band: "8-9", mean: 2.5, ratings: 3, trainers: 2 }] } as unknown as ExercisePattern]);
    expect(await d.query("SELECT jsonb_typeof(bands) AS t FROM exercise_patterns")).toEqual([{ t: "array" }]);
    const [p] = await allPatterns(d);
    expect(Array.isArray(p.bands)).toBe(true);
    expect(p.bands[0].band).toBe("8-9");
    // Values come back as the store expects them.
    const [v] = await d.query<Record<string, unknown>>(
      `SELECT '2026-11-02'::date AS day, '2026-11-02T10:00:00Z'::timestamptz AS at, count(*) AS n, 1.5::numeric AS num,
              ARRAY['a','b']::text[] AS tags, '{"a":1}'::jsonb AS j, interval '2 hours' AS iv, $1::text[] AS sent`,
      [["x", "y,z"]],
    );
    expect(v).toEqual({ day: new Date("2026-11-02T00:00:00Z"), at: new Date("2026-11-02T10:00:00Z"), n: "1", num: "1.5", tags: ["a", "b"], j: { a: 1 }, iv: "02:00:00", sent: ["x", "y,z"] });
    // A transaction rolls back on an error.
    await expect(d.tx(async (t) => {
      await t.query("DELETE FROM exercise_patterns");
      throw new Error("stopp");
    })).rejects.toThrow("stopp");
    expect(await d.query("SELECT count(*)::int AS n FROM exercise_patterns")).toEqual([{ n: 1 }]);
    await d.close();
    // A query that takes too long fails instead of hanging, and the next one works.
    const slow = createPostgresDb(process.env.TEST_DATABASE_URL!, { queryTimeoutMs: 300 });
    await expect(slow.query("SELECT pg_sleep(2)")).rejects.toThrow(/timeout/i);
    await expect(slow.tx((t) => t.query("SELECT pg_sleep(2)"))).rejects.toThrow(/timeout/i);
    expect(await slow.query("SELECT 1 AS one")).toEqual([{ one: 1 }]);
    await slow.close();
  });
});

describe("unwrap jsonb migration", () => {
  it("turns JSON strings that hold an object or a list back into JSON, and keeps other strings", async () => {
    const d = await testDb({ admin: true });
    await d.query(
      `INSERT INTO exercise_patterns (spond_group_id, exercise_code, score, ratings, trend, patterns, bands)
       VALUES ('B', 'a', 2, 1, '', to_jsonb('[]'::text), to_jsonb('[{"band":"8-9"}]'::text)),
              ('B', 'b', 2, 1, '', '[]', '[{"band":"6-7"}]'),
              ('B', 'c', 2, 1, '', '[]', to_jsonb('ikke json'::text))`,
    );
    const sql = (await migrationFiles()).find((m) => m.name.endsWith("_unwrap_jsonb.sql"))!.sql;
    await d.query(sql);
    expect(await d.query("SELECT exercise_code AS code, jsonb_typeof(patterns) AS p, bands FROM exercise_patterns ORDER BY 1")).toEqual([
      { code: "a", p: "array", bands: [{ band: "8-9" }] },
      { code: "b", p: "array", bands: [{ band: "6-7" }] },
      { code: "c", p: "array", bands: "ikke json" },
    ]);
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
    const d = await testDb({ admin: true });
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

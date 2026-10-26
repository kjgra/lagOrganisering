import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { seedDemo } from "@/lib/demo/seed";
import { cloneDatabase } from "../../scripts/clone-prod-to-preview.mjs";
import { testDb } from "../helpers/db";

let src: Db;
let dst: Db;

const count = async (d: Db, table: string) => (await d.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`))[0].n;

beforeAll(async () => {
  [src, dst] = await Promise.all([testDb(), testDb()]);
  await seedDemo(src);
  await src.query(
    `INSERT INTO edit_locks (spond_group_id, editor, session_key) VALUES ('G1', 'P-1', 'k1')`,
  );
  await src.query(
    `INSERT INTO app_role_log (spond_profile_id, role, granted, actor, created_at)
     VALUES ('P-9', 'app', true, 'P-0', '2026-05-01 10:00:00.123456+00')`,
  );
  // Something in the target that must disappear.
  await dst.query(`INSERT INTO app_roles (spond_profile_id, can_use_app, updated_by) VALUES ('BARE-I-PREVIEW', true, 'x')`);
});
afterAll(async () => Promise.all([src.close(), dst.close()]));

describe("clone prod to preview", () => {
  it("writes nothing without --apply", async () => {
    const rs = await cloneDatabase(src, dst, { apply: false });
    expect(rs.find((r) => r.table === "exercises")!.rows).toBe(await count(src, "exercises"));
    expect(await count(dst, "exercises")).toBe(0);
    expect(await count(dst, "app_roles")).toBe(1);
  });

  it("replaces every table with the source rows, ids and exact timestamps", async () => {
    const rs = await cloneDatabase(src, dst, { apply: true });
    const tables = rs.filter((r) => !r.skipped).map((r) => r.table);
    expect(tables).toContain("exercises");
    for (const t of tables) expect([t, await count(dst, t)]).toEqual([t, await count(src, t)]);
    expect(await count(src, "exercises")).toBeGreaterThan(0);
    expect(await dst.query("SELECT 1 FROM app_roles WHERE spond_profile_id = 'BARE-I-PREVIEW'")).toHaveLength(0);
    expect(await count(dst, "edit_locks")).toBe(0);

    const ids = "SELECT id, code FROM exercises ORDER BY id";
    expect(await dst.query(ids)).toEqual(await src.query(ids));
    const ts = "SELECT created_at::text AS t FROM app_role_log WHERE spond_profile_id = 'P-9'";
    expect(await dst.query(ts)).toEqual([{ t: "2026-05-01 10:00:00.123456+00" }]);
    const plans = "SELECT id, plan::text AS plan FROM training_plans ORDER BY id";
    expect(await dst.query(plans)).toEqual(await src.query(plans));
  });

  it("continues identity columns after the copied ids, and can run again", async () => {
    await cloneDatabase(src, dst, { apply: true });
    const [max] = await dst.query<{ m: number }>("SELECT max(id)::int AS m FROM exercises");
    expect(max.m).toBeGreaterThan(0);
    const [row] = await dst.query<{ id: number }>(
      `INSERT INTO exercises (spond_group_id, code, name, category, status, created_by, updated_by)
       VALUES ('G-NY', 'ny', 'Ny øvelse', 'Pasning', 'active', 'P-1', 'P-1') RETURNING id`,
    );
    expect(row.id).toBe(max.m + 1);
  });
});

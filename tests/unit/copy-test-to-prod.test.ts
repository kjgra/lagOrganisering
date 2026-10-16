import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { copyTestToProd } from "../../scripts/copy-test-to-prod.mjs";
import { testDb } from "../helpers/db";

let src: Db;
let dst: Db;

const counts = (rs: { table: string; inserted: number; updated: number; unchanged: number }[]) =>
  Object.fromEntries(rs.map((r) => [r.table, [r.inserted, r.updated, r.unchanged]]));

beforeAll(async () => {
  [src, dst] = await Promise.all([testDb(), testDb()]);
  await src.query(
    `INSERT INTO exercises (spond_group_id, code, name, category, themes, drawing, status, created_by, updated_by, updated_at)
     VALUES ('G1', 'rondo-4v1', 'Rondo 4 mot 1', 'Pasning', '{pasning,"første touch"}', '{"spillere":[{"x":1.5,"y":2}]}', 'active', 'P-1', 'P-1', '2026-05-01 10:00:00.123456+00'),
            ('G1', 'arkivert', 'Gammel øvelse', 'Avslutning', '{}', NULL, 'archived', 'P-1', 'P-1', '2026-05-01'),
            ('G2', 'rondo-4v1', 'Rondo i G2', 'Pasning', '{}', NULL, 'candidate', 'P-2', 'P-2', '2026-05-01')`,
  );
  await src.query(
    `INSERT INTO app_roles (spond_profile_id, can_use_ai, is_admin, can_use_app, updated_by)
     VALUES ('P-1', true, true, true, 'P-0'), ('P-2', false, false, true, 'P-1')`,
  );
  await src.query(
    `INSERT INTO season_themes (spond_group_id, year, month, theme, description, updated_by)
     VALUES ('G1', 2026, 4, 'Pasning', 'Korte pasninger', 'P-1'), ('G2', 2026, 4, 'Vending', NULL, 'P-2')`,
  );
});
afterAll(async () => Promise.all([src.close(), dst.close()]));

describe("copy test to prod", () => {
  it("writes nothing without --apply", async () => {
    const rs = await copyTestToProd(src, dst, { apply: false });
    expect(counts(rs)).toEqual({ exercises: [3, 0, 0], app_roles: [2, 0, 0], season_themes: [2, 0, 0] });
    expect(await dst.query("SELECT 1 FROM exercises")).toHaveLength(0);
  });

  it("copies one group, with arrays, drawings and exact timestamps", async () => {
    const rs = await copyTestToProd(src, dst, { apply: true, group: "G1" });
    expect(counts(rs)).toEqual({ exercises: [2, 0, 0], app_roles: [2, 0, 0], season_themes: [1, 0, 0] });
    const [ex] = await dst.query<{ themes: string[]; drawing: string; updated_at: string }>(
      "SELECT themes, drawing::text AS drawing, (updated_at AT TIME ZONE 'UTC')::text AS updated_at FROM exercises WHERE code = 'rondo-4v1'",
    );
    expect(ex.themes).toEqual(["pasning", "første touch"]);
    expect(JSON.parse(ex.drawing)).toEqual({ spillere: [{ x: 1.5, y: 2 }] });
    expect(ex.updated_at).toBe("2026-05-01 10:00:00.123456");
  });

  it("is idempotent and keeps newer changes in prod", async () => {
    await dst.query("UPDATE app_roles SET can_use_ai = false, updated_at = now() + interval '1 day' WHERE spond_profile_id = 'P-1'");
    await src.query("UPDATE season_themes SET theme = 'Pasning og mottak', updated_at = now() + interval '1 day' WHERE spond_group_id = 'G1'");
    const rs = await copyTestToProd(src, dst, { apply: true });
    expect(counts(rs)).toEqual({ exercises: [1, 0, 2], app_roles: [0, 0, 2], season_themes: [1, 1, 0] });
    const [role] = await dst.query<{ can_use_ai: boolean }>("SELECT can_use_ai FROM app_roles WHERE spond_profile_id = 'P-1'");
    expect(role.can_use_ai).toBe(false);
    const again = await copyTestToProd(src, dst, { apply: true });
    expect(counts(again)).toEqual({ exercises: [0, 0, 3], app_roles: [0, 0, 2], season_themes: [0, 0, 2] });
  });
});

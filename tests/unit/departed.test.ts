import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testDb } from "../helpers/db";
import type { Db } from "@/lib/db";
import { DEPARTED_DAYS, syncDeparted } from "@/lib/store/departed";

let d: Db;
const day = 24 * 3600 * 1000;
const t0 = new Date("2026-11-01T12:00:00Z");
const later = (days: number) => new Date(t0.getTime() + days * day);

const data = async () => ({
  levels: (await d.query<{ m: string }>("SELECT spond_member_id AS m FROM member_levels ORDER BY 1")).map((r) => r.m),
  tags: (await d.query<{ m: string }>("SELECT spond_member_id AS m FROM member_tags ORDER BY 1")).map((r) => r.m),
  pairs: (await d.query<{ a: string; b: string }>("SELECT member_a AS a, member_b AS b FROM member_pairs ORDER BY 1, 2")),
});

beforeAll(async () => {
  d = await testDb();
  await d.query(
    `INSERT INTO member_levels (spond_group_id, spond_member_id, level, updated_by) VALUES
       ('G1', 'M-1', 3, 'P-1'), ('G1', 'M-2', 2, 'P-1'), ('G1', 'M-3', 4, 'P-1'), ('G2', 'M-2', 5, 'P-1')`,
  );
  await d.query("INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by) VALUES ('G1', 'M-2', 'Keeper', 'P-1')");
  await d.query("INSERT INTO member_pairs (spond_group_id, member_a, member_b, created_by) VALUES ('G1', 'M-1', 'M-2', 'P-1')");
});
afterAll(() => d.close());

describe("players who have left", () => {
  it("only marks players missing from the group, and keeps their data for now", async () => {
    expect(await syncDeparted(d, [{ id: "G1", memberIds: ["M-1", "M-3"] }], t0)).toEqual({ missing: 1, deleted: 0 });
    expect(await d.query("SELECT spond_group_id, spond_member_id FROM departed_members")).toEqual([{ spond_group_id: "G1", spond_member_id: "M-2" }]);
    expect((await data()).levels).toEqual(["M-1", "M-2", "M-2", "M-3"]);
  });

  it("skips a group whose member list is empty", async () => {
    expect(await syncDeparted(d, [{ id: "G2", memberIds: [] }], later(DEPARTED_DAYS + 1))).toEqual({ missing: 0, deleted: 0 });
  });

  it("forgets the mark when the player comes back", async () => {
    await syncDeparted(d, [{ id: "G1", memberIds: ["M-1", "M-2", "M-3"] }], later(10));
    expect(await d.query("SELECT * FROM departed_members")).toEqual([]);
  });

  it("deletes levels, tags and pairs after the time, only in that group", async () => {
    await syncDeparted(d, [{ id: "G1", memberIds: ["M-1", "M-3"] }], later(20));
    expect(await syncDeparted(d, [{ id: "G1", memberIds: ["M-1", "M-3"] }], later(20 + DEPARTED_DAYS - 1))).toEqual({ missing: 0, deleted: 0 });
    expect(await syncDeparted(d, [{ id: "G1", memberIds: ["M-1", "M-3"] }], later(21 + DEPARTED_DAYS))).toEqual({ missing: 0, deleted: 1 });
    expect(await data()).toEqual({ levels: ["M-1", "M-2", "M-3"], tags: [], pairs: [] });
    expect(await d.query("SELECT spond_group_id FROM member_levels WHERE spond_member_id = 'M-2'")).toEqual([{ spond_group_id: "G2" }]);
    expect(await d.query("SELECT * FROM departed_members")).toEqual([]);
  });
});

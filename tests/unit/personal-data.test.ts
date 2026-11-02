import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testDb } from "../helpers/db";
import type { Db } from "@/lib/db";
import { NO_RIGHTS } from "@/lib/store/access";
import { PERSON_COLUMNS, PLAYER_REFS, TRAINER_REFS, erasePlayer, eraseTrainer, playerData, trainerData } from "@/lib/store/personal-data";

let d: Db;
const sa = { ...NO_RIGHTS, superadmin: true, admin: true, app: true };
const access = { profileId: "P-SA", groupIds: new Set(["G1", "G2"]) };

beforeAll(async () => {
  d = await testDb();
  await d.query(
    `INSERT INTO member_levels (spond_group_id, spond_member_id, level, updated_by) VALUES ('G1', 'M-1', 3, 'P-1'), ('G2', 'M-1', 4, 'P-1'), ('G1', 'M-2', 2, 'P-1')`,
  );
  await d.query("INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by) VALUES ('G1', 'M-1', 'Keeper', 'P-1')");
  await d.query("INSERT INTO member_pairs (spond_group_id, member_a, member_b, created_by) VALUES ('G1', 'M-1', 'M-2', 'P-2')");
  const [p] = await d.query<{ id: number }>("INSERT INTO group_proposals (spond_group_id, name, created_by) VALUES ('G1', 'Lag', 'P-1') RETURNING id");
  await d.query("INSERT INTO group_proposal_labels (proposal_id, label, sort_order) VALUES ($1, 'Lag 1', 0)", [p.id]);
  await d.query("INSERT INTO group_proposal_members (proposal_id, spond_member_id, label) VALUES ($1, 'M-1', 'Lag 1'), ($1, 'M-2', 'Lag 1')", [p.id]);
  await d.query("INSERT INTO proposal_comments (proposal_id, author, body) VALUES ($1, 'P-1', 'Bra lag')", [p.id]);
  await d.query("INSERT INTO app_roles (spond_profile_id, can_use_app, updated_by) VALUES ('P-1', true, 'P-SA')");
  await d.query("INSERT INTO user_preferences (spond_profile_id) VALUES ('P-1')");
});
afterAll(() => d.close());

describe("personal data", () => {
  it("lists every column in the schema that holds a person's id", async () => {
    const cols = await d.query<{ t: string; c: string }>(
      `SELECT table_name AS t, column_name AS c FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = ANY($1::text[]) ORDER BY 1, 2`,
      [PERSON_COLUMNS],
    );
    const known = new Set([...PLAYER_REFS, ...TRAINER_REFS].map((r) => `${r.table}.${r.column}`));
    expect(cols.map((r) => `${r.t}.${r.c}`).filter((k) => !known.has(k))).toEqual([]);
  });

  it("shows a player's data in one group only, for the superadmin only", async () => {
    const p = await playerData(d, access, sa, "G1", "M-1");
    expect(Object.keys(p.rows).sort()).toEqual(["group_proposal_members.spond_member_id", "member_levels.spond_member_id", "member_pairs.member_a", "member_tags.spond_member_id"]);
    expect(p.count).toBe(4);
    await expect(playerData(d, access, { ...sa, superadmin: false }, "G1", "M-1")).rejects.toThrow();
  });

  it("erases a player in one group and keeps the other group", async () => {
    expect(await erasePlayer(d, access, sa, "G1", "M-1")).toBe(4);
    expect((await playerData(d, access, sa, "G1", "M-1")).count).toBe(0);
    expect((await playerData(d, access, sa, "G2", "M-1")).count).toBe(1);
    expect((await playerData(d, access, sa, "G1", "M-2")).count).toBe(2);
  });

  it("erases a trainer's settings and access, and anonymises what they wrote", async () => {
    expect((await trainerData(d, sa, "P-1")).count).toBeGreaterThan(3);
    await eraseTrainer(d, sa, "P-1", "P-SA");
    expect((await trainerData(d, sa, "P-1")).count).toBe(0);
    expect(await d.query("SELECT * FROM app_roles WHERE spond_profile_id = 'P-1'")).toEqual([]);
    const [c] = await d.query<{ author: string; body: string }>("SELECT author, body FROM proposal_comments");
    expect(c.body).toBe("Bra lag");
    expect(c.author).toMatch(/^slettet:[0-9a-f]{8}$/);
    await expect(eraseTrainer(d, sa, "P-SA", "P-SA")).rejects.toThrow(/deg selv/);
  });
});

describe("names in free text", () => {
  it("stops names of the group's members, and lets other text through", async () => {
    const { memberNames, storedNamesProblem } = await import("@/lib/sensitive");
    const names = memberNames([{ firstName: "Emma", lastName: "Haugen" }, { firstName: "Per", lastName: "Olsen" }]);
    expect(storedNamesProblem(["Lag 1", "Keeper"], names)).toBeNull();
    expect(storedNamesProblem(["Lag 1", "Emma og laget"], names)).toMatch(/«Emma».*Navn lagres ikke i appen/);
    expect(storedNamesProblem(["Per Olsen spiller godt"], names)).toMatch(/Per Olsen/);
    expect(storedNamesProblem(["per økt"], names)).toBeNull();
  });
});

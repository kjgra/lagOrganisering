import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { copyTestToProd } from "../../scripts/copy-test-to-prod.mjs";
import { testDb } from "../helpers/db";

let src: Db;
let dst: Db;

const OLD = ["exercises", "app_roles", "app_role_log", "season_themes", "team_settings"];
const counts = (rs: { table: string; inserted: number; updated: number; unchanged: number }[], tables = OLD) =>
  Object.fromEntries(rs.filter((r) => tables.includes(r.table)).map((r) => [r.table, [r.inserted, r.updated, r.unchanged]]));

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
  await src.query(
    `INSERT INTO app_role_log (spond_profile_id, role, granted, actor, created_at)
     VALUES ('P-1', 'app', true, 'P-0', '2026-05-01 10:00:00.123456+00'), ('P-1', 'ai', true, 'P-0', '2026-05-02')`,
  );
  await src.query(
    `INSERT INTO team_settings (spond_group_id, age_group, session_minutes, updated_by)
     VALUES ('G1', 'G12', 90, 'P-1'), ('G2', 'J10', 60, 'P-2')`,
  );
});
afterAll(async () => Promise.all([src.close(), dst.close()]));

describe("copy test to prod", () => {
  it("writes nothing without --apply", async () => {
    const rs = await copyTestToProd(src, dst, { apply: false });
    expect(counts(rs)).toEqual({
      exercises: [3, 0, 0],
      app_roles: [2, 0, 0],
      app_role_log: [2, 0, 0],
      season_themes: [2, 0, 0],
      team_settings: [2, 0, 0],
    });
    expect(await dst.query("SELECT 1 FROM exercises")).toHaveLength(0);
  });

  it("copies one group, with arrays, drawings and exact timestamps", async () => {
    const rs = await copyTestToProd(src, dst, { apply: true, group: "G1" });
    expect(counts(rs)).toEqual({
      exercises: [2, 0, 0],
      app_roles: [2, 0, 0],
      app_role_log: [2, 0, 0],
      season_themes: [1, 0, 0],
      team_settings: [1, 0, 0],
    });
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
    expect(counts(rs)).toEqual({
      exercises: [1, 0, 2],
      app_roles: [0, 0, 2],
      app_role_log: [0, 0, 2],
      season_themes: [1, 1, 0],
      team_settings: [1, 0, 1],
    });
    const [role] = await dst.query<{ can_use_ai: boolean }>("SELECT can_use_ai FROM app_roles WHERE spond_profile_id = 'P-1'");
    expect(role.can_use_ai).toBe(false);
    const again = await copyTestToProd(src, dst, { apply: true });
    expect(counts(again)).toEqual({
      exercises: [0, 0, 3],
      app_roles: [0, 0, 2],
      app_role_log: [0, 0, 2],
      season_themes: [0, 0, 2],
      team_settings: [0, 0, 2],
    });
  });

  it("keeps a newer level in prod over an older number tag", async () => {
    const [x, y] = await Promise.all([testDb(), testDb()]);
    await x.query("INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by, created_at) VALUES ('G1', 'M-1', '1', 'P-1', '2026-05-01'), ('G1', 'M-1', '3', 'P-1', '2026-05-02')");
    await y.query("INSERT INTO member_levels (spond_group_id, spond_member_id, level, updated_by, updated_at) VALUES ('G1', 'M-1', 5, 'P-2', '2026-06-01')");
    await x.query("INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by, created_at) VALUES ('G1', 'M-2', '1', 'P-1', '2026-05-01'), ('G1', 'M-2', '3', 'P-1', '2026-05-02')");
    await copyTestToProd(x, y, { apply: true });
    expect(await y.query("SELECT spond_member_id, level FROM member_levels ORDER BY spond_member_id")).toEqual([
      { spond_member_id: "M-1", level: 5 },
      { spond_member_id: "M-2", level: 3 },
    ]);
    await Promise.all([x.close(), y.close()]);
  });

  it("leaves out tables and columns the source does not have", async () => {
    const [old, target] = await Promise.all([testDb(), testDb()]);
    await old.query("DROP TABLE user_preferences");
    await old.query("ALTER TABLE group_proposals DROP COLUMN spond_subgroup_id");
    await old.query(
      "INSERT INTO group_proposals (spond_group_id, name, created_by) VALUES ('G1', 'Forslag 1', 'P-1')",
    );
    const rs = await copyTestToProd(old, target, { apply: true });
    expect(rs.find((r) => r.table === "user_preferences")).toMatchObject({ missing: true, read: 0 });
    expect(rs.find((r) => r.table === "group_proposals")).toMatchObject({ inserted: 1, missingColumns: ["spond_subgroup_id"] });
    await Promise.all([old.close(), target.close()]);
  });
});

describe("copy tags, proposals and plans", () => {
  let a: Db;
  let b: Db;
  const all = ["member_tags", "group_proposals", "group_proposal_labels", "group_proposal_members", "proposal_history",
    "proposal_comments", "training_plans", "training_plan_comments", "exercise_feedback", "team_learnings", "ai_usage"];

  beforeAll(async () => {
    [a, b] = await Promise.all([testDb(), testDb()]);
    await a.query(
      `INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by)
       VALUES ('G1', 'M-1', '2', 'P-1'), ('G1', 'M-1', 'Keeper', 'P-1'), ('G2', 'M-9', '1', 'P-2')`,
    );
    // Prod already has a proposal and a plan of its own, so ids differ between the databases.
    await b.query("INSERT INTO group_proposals (spond_group_id, name, created_by) VALUES ('G1', 'Laget i prod', 'P-3')");
    await b.query(
      `INSERT INTO training_plans (spond_group_id, spond_event_id, version, status, plan, created_by)
       VALUES ('G1', 'E-0', 1, 'draft', '{}', 'P-3'), ('G1', 'E-2', 1, 'draft', '{"tittel":"prod"}', 'P-3')`,
    );
    const [p] = await a.query<{ id: number }>(
      `INSERT INTO group_proposals (spond_group_id, spond_event_id, name, status, created_by, created_at, updated_at)
       VALUES ('G1', 'E-1', 'Forslag 1', 'approved', 'P-1', '2026-05-01 10:00:00.123456+00', '2026-05-01 11:00:00+00') RETURNING id`,
    );
    await a.query("INSERT INTO group_proposal_labels (proposal_id, label, sort_order) VALUES ($1, 'Lag 1', 0), ($1, 'Lag 2', 1)", [p.id]);
    await a.query(
      "INSERT INTO group_proposal_members (proposal_id, spond_member_id, label) VALUES ($1, 'M-1', 'Lag 1'), ($1, 'M-2', 'Lag 2')",
      [p.id],
    );
    await a.query("INSERT INTO proposal_history (proposal_id, actor, decision) VALUES ($1, 'P-1', 'created'), ($1, 'P-1', 'approved')", [p.id]);
    await a.query("INSERT INTO proposal_comments (proposal_id, author, body) VALUES ($1, 'P-2', 'Ser bra ut')", [p.id]);
    const [pl] = await a.query<{ id: number }>(
      `INSERT INTO training_plans (spond_group_id, spond_event_id, version, status, plan, created_by, approved_by, approved_at)
       VALUES ('G1', 'E-1', 1, 'approved', '{"tittel":"Pasning"}', 'P-1', 'P-1', now()) RETURNING id`,
    );
    // Same event and version as a different plan in prod: skipped with its comments.
    const [clash] = await a.query<{ id: number }>(
      `INSERT INTO training_plans (spond_group_id, spond_event_id, version, status, plan, created_by)
       VALUES ('G1', 'E-2', 1, 'draft', '{"tittel":"test"}', 'P-1') RETURNING id`,
    );
    await a.query(
      `INSERT INTO training_plan_comments (spond_group_id, spond_event_id, plan_id, exercise_no, author, body)
       VALUES ('G1', 'E-1', $1, 1, 'P-2', 'Kortere'), ('G1', 'E-2', $2, NULL, 'P-2', 'Hoppes over')`,
      [pl.id, clash.id],
    );
    await a.query(
      `INSERT INTO exercise_feedback (spond_group_id, spond_event_id, plan_id, exercise_no, rating, tags, author)
       VALUES ('G1', 'E-1', $1, NULL, 3, '{}', 'P-1'), ('G1', 'E-1', $1, 1, 2, '{"for lang"}', 'P-1')`,
      [pl.id],
    );
    await a.query("INSERT INTO team_learnings (spond_group_id, body, source, created_by) VALUES ('G1', 'Små lag fungerer', 'manual', 'P-1')");
    await a.query(
      `INSERT INTO ai_usage (spond_profile_id, spond_group_id, spond_event_id, plan_id, kind, model, cost_usd, status)
       VALUES ('P-1', 'G1', 'E-1', $1, 'draft', 'haiku', 0.01234, 'ok')`,
      [pl.id],
    );
  });
  afterAll(async () => Promise.all([a.close(), b.close()]));

  it("maps new ids and skips a plan that clashes with prod", async () => {
    const rs = await copyTestToProd(a, b, { apply: true });
    expect(counts(rs, [...all, "member_levels (fra tagger)"])).toEqual({
      member_tags: [1, 0, 0],
      "member_levels (fra tagger)": [2, 0, 0],
      group_proposals: [1, 0, 0],
      group_proposal_labels: [2, 0, 0],
      group_proposal_members: [2, 0, 0],
      proposal_history: [2, 0, 0],
      proposal_comments: [1, 0, 0],
      training_plans: [1, 0, 0],
      training_plan_comments: [1, 0, 0],
      exercise_feedback: [2, 0, 0],
      team_learnings: [1, 0, 0],
      ai_usage: [1, 0, 0],
    });
    expect(await b.query("SELECT spond_member_id, level FROM member_levels ORDER BY spond_member_id")).toEqual([
      { spond_member_id: "M-1", level: 2 },
      { spond_member_id: "M-9", level: 1 },
    ]);
    expect(await b.query("SELECT tag FROM member_tags")).toEqual([{ tag: "Keeper" }]);
    expect(rs.find((r) => r.table === "training_plans")?.skipped).toBe(1);
    expect(rs.find((r) => r.table === "training_plan_comments")?.skipped).toBe(1);
    const members = await b.query<{ name: string; spond_member_id: string; label: string }>(
      `SELECT p.name, m.spond_member_id, m.label FROM group_proposal_members m JOIN group_proposals p ON p.id = m.proposal_id
        ORDER BY m.spond_member_id`,
    );
    expect(members).toEqual([
      { name: "Forslag 1", spond_member_id: "M-1", label: "Lag 1" },
      { name: "Forslag 1", spond_member_id: "M-2", label: "Lag 2" },
    ]);
    const [fb] = await b.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM exercise_feedback f JOIN training_plans p ON p.id = f.plan_id
        WHERE p.spond_event_id = 'E-1' AND p.plan->>'tittel' = 'Pasning'`,
    );
    expect(fb.n).toBe(2);
    const [usage] = await b.query<{ plan: string; cost: string }>(
      "SELECT p.plan->>'tittel' AS plan, u.cost_usd::text AS cost FROM ai_usage u JOIN training_plans p ON p.id = u.plan_id",
    );
    expect(usage).toEqual({ plan: "Pasning", cost: "0.01234" });
    const [prodPlan] = await b.query<{ t: string }>("SELECT plan->>'tittel' AS t FROM training_plans WHERE spond_event_id = 'E-2'");
    expect(prodPlan.t).toBe("prod");
  });

  it("replaces the teams of a proposal that is newer in test, and is idempotent", async () => {
    const [p] = await a.query<{ id: number }>("SELECT id FROM group_proposals WHERE name = 'Forslag 1'");
    await a.query("UPDATE group_proposal_members SET label = 'Lag 1' WHERE proposal_id = $1 AND spond_member_id = 'M-2'", [p.id]);
    await a.query("DELETE FROM group_proposal_labels WHERE proposal_id = $1 AND label = 'Lag 2'", [p.id]);
    await a.query("UPDATE group_proposals SET updated_at = now() WHERE id = $1", [p.id]);
    const rs = await copyTestToProd(a, b, { apply: true });
    expect(counts(rs, ["group_proposals", "group_proposal_labels", "group_proposal_members", "proposal_history", "member_tags"])).toEqual({
      member_tags: [0, 0, 1],
      group_proposals: [0, 1, 0],
      group_proposal_labels: [1, 0, 0],
      group_proposal_members: [2, 0, 0],
      proposal_history: [0, 0, 2],
    });
    const labels = await b.query<{ label: string }>("SELECT DISTINCT label FROM group_proposal_members ORDER BY label");
    expect(labels).toEqual([{ label: "Lag 1" }]);
    const again = await copyTestToProd(a, b, { apply: true });
    for (const r of again.filter((r) => [...all, "member_levels (fra tagger)"].includes(r.table))) expect([r.table, r.inserted, r.updated]).toEqual([r.table, 0, 0]);
  });

  it("copies the tags of one group", async () => {
    const [x, y] = await Promise.all([testDb(), testDb()]);
    await x.query("INSERT INTO member_tags (spond_group_id, spond_member_id, tag, created_by) VALUES ('G1', 'M-1', '2', 'P-1'), ('G2', 'M-9', '1', 'P-2')");
    const [p] = await x.query<{ id: number }>("INSERT INTO group_proposals (spond_group_id, name, created_by) VALUES ('G2', 'Annet lag', 'P-2') RETURNING id");
    await x.query("INSERT INTO group_proposal_labels (proposal_id, label, sort_order) VALUES ($1, 'Lag 1', 0)", [p.id]);
    const rs = await copyTestToProd(x, y, { apply: true, group: "G1" });
    expect(counts(rs, ["member_tags", "member_levels (fra tagger)", "group_proposals", "group_proposal_labels"])).toEqual({
      member_tags: [0, 0, 0],
      "member_levels (fra tagger)": [1, 0, 0],
      group_proposals: [0, 0, 0],
      group_proposal_labels: [0, 0, 0],
    });
    expect(rs.find((r) => r.table === "group_proposal_labels")?.skipped).toBe(0);
    await Promise.all([x.close(), y.close()]);
  });
});

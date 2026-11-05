import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { catalogue } from "@/lib/ai/plan-ai";
import { themeUsage, themeUsageText, type UsageRow } from "@/lib/ai/theme-usage";
import type { Db } from "@/lib/db";
import type { BankExercise } from "@/lib/plans/plan";
import { themeUsageRows } from "@/lib/store/insights";
import { testDb } from "../helpers/db";

const row = (group: string, codes: string[], x: Partial<UsageRow> = {}): UsageRow => ({ group, theme: "Spille oss frem", band: "10-12", codes, ratings: {}, ...x });

describe("exercises used with a theme word", () => {
  it("counts sessions and teams per age band, and needs enough of both", () => {
    const rows = [
      row("G1", ["rondo", "kaos"]),
      row("G1", ["rondo"]),
      row("G2", ["rondo", "kaos"], { theme: "spille oss frem!" }),
      row("G2", ["kaos"]),
      // Another band or another word says nothing.
      row("G3", ["rondo"], { band: "8-9" }),
      row("G3", ["rondo"], { theme: "Pasning" }),
    ];
    expect(themeUsage(rows, "Spille oss FREM", "10-12")).toEqual([
      { code: "kaos", sessions: 3, groups: 2, ratings: 0, mean: null },
      { code: "rondo", sessions: 3, groups: 2, ratings: 0, mean: null },
    ]);
    // One team alone is never enough.
    expect(themeUsage(rows.filter((r) => r.group === "G1"), "Spille oss frem", "10-12", { sessions: 1, groups: 2 })).toEqual([]);
    expect(themeUsage(rows, "Spille oss frem", null)).toEqual([]);
  });

  it("leaves out exercises rated poorly with the theme, and names the rest for KI", () => {
    const rows = [row("G1", ["rondo", "kaos"], { ratings: { kaos: [1, 1] } }), row("G2", ["rondo", "kaos"], { ratings: { rondo: [3, 2] } }), row("G2", ["rondo", "kaos"])];
    const uses = themeUsage(rows, "Spille oss frem", "10-12");
    expect(uses.map((u) => u.code)).toEqual(["rondo"]);
    const bank = [{ code: "rondo", name: "Rondo 4 mot 1", status: "active" }] as BankExercise[];
    expect(themeUsageText(uses, "Spille oss frem", bank)).toContain("- rondo (Rondo 4 mot 1): brukt i 3 økter av 2 lag, snitt 2,5/3 (2 vurderinger)");
    expect(themeUsageText(uses, "Spille oss frem", [])).toBe("");
  });

  it("puts the used exercises first in the catalogue", () => {
    const ex = (code: string): BankExercise => ({ code, name: code, category: "annet", themes: [], status: "active", bands: ["10-12"], nff_tags: [], execution: "", organisation: "", min_players: null, max_players: null }) as unknown as BankExercise;
    const text = catalogue([ex("a-forst"), ex("b-brukt")], "Spille oss frem", 30, { band: "10-12", used: ["b-brukt"] });
    expect(text.indexOf("b-brukt")).toBeLessThan(text.indexOf("a-forst"));
  });
});

describe("rows from approved plans", () => {
  let d: Db;
  beforeAll(async () => {
    d = await testDb();
  });
  afterAll(async () => d.close());

  it("reads theme, exercises, band (stored or from the team's birth year) and ratings", async () => {
    await d.query("INSERT INTO team_settings (spond_group_id, birth_year, updated_by) VALUES ('U1', 2015, 'P-1')");
    const plan = (tema: string) => JSON.stringify({ tema, ovelser: [{ kode: "rondo" }, { kode: "kaos" }] });
    const [p] = await d.query<{ id: number }>(
      `INSERT INTO training_plans (spond_group_id, spond_event_id, version, plan, status, created_by, event_start)
       VALUES ('U1', 'E1', 1, $1::jsonb, 'approved', 'P-1', '2026-03-01') RETURNING id`,
      [plan("Spille oss frem")],
    );
    await d.query(
      `INSERT INTO training_plans (spond_group_id, spond_event_id, version, plan, status, created_by, event_start, context)
       VALUES ('U2', 'E2', 1, $1::jsonb, 'approved', 'P-1', '2026-03-01', '{"band":"8-9"}'), ('U2', 'E3', 1, $1::jsonb, 'draft', 'P-1', '2026-03-01', NULL)`,
      [plan("Pasning")],
    );
    await d.query("INSERT INTO exercise_feedback (spond_group_id, spond_event_id, plan_id, exercise_no, exercise_code, rating, author) VALUES ('U1', 'E1', $1, 1, 'rondo', 3, 'P-1')", [p!.id]);
    const rows = await themeUsageRows(d, new Date("2026-11-05"));
    expect(rows).toEqual([
      { group: "U1", theme: "Spille oss frem", band: "10-12", codes: ["rondo", "kaos"], ratings: { rondo: [3] } },
      { group: "U2", theme: "Pasning", band: "8-9", codes: ["rondo", "kaos"], ratings: {} },
    ]);
  });
});

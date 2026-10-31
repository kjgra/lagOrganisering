import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { exerciseInputFrom, exerciseValues } from "@/lib/plans/exercise-values";
import { bankCandidates, tooSimilar, validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import type { Access } from "@/lib/store/access";
import { BANK } from "@/lib/store/bank";
import { exerciseEdits } from "@/lib/store/edits";
import { patternInputs } from "@/lib/store/observations";
import { getExercise, listExercises, saveBankFeedback, saveExercise, savePlanExercise, TooSimilarError } from "@/lib/store/training";
import { exerciseVersions } from "@/lib/store/versions";
import { testDb } from "../helpers/db";

const plan = validatePlan(reference);
// Kjetil trains a children's team, Ann a youth team, in two main groups in Spond.
const kjetil: Access = { profileId: "P-1", groupIds: new Set(["BARN"]) };
const ann: Access = { profileId: "P-2", groupIds: new Set(["UNGDOM"]) };
const rate = (code: string, rating: number) => ({ exercise_no: null, exercise_code: code, rating, tags: ["ko"], actual_minutes: null, actual_players: null, body: "", use_again: "" });

describe("the shared exercise bank", () => {
  let d: Db;
  beforeAll(async () => {
    d = await testDb();
  });
  afterAll(async () => d.close());

  it("is the same for every group, with evaluations from all teams, and owned by none", async () => {
    const id = (await savePlanExercise(d, kjetil, "BARN", plan.ovelser[1], ["Samhandling"], "manual"))!;
    const code = (await getExercise(d, kjetil, "BARN", id)).code;
    const [ex] = await listExercises(d, ann, "UNGDOM");
    expect(ex).toMatchObject({ id, code });
    const [{ g }] = await d.query<{ g: string }>("SELECT spond_group_id AS g FROM exercises WHERE id = $1", [id]);
    expect(g).toBe(BANK);

    // Ann evaluates and changes it from her group: it counts, and is versioned, for everyone.
    await saveBankFeedback(d, ann, "UNGDOM", id, rate(code, 1));
    await saveBankFeedback(d, kjetil, "BARN", id, rate(code, 3));
    expect((await listExercises(d, kjetil, "BARN"))[0]).toMatchObject({ fb_n: 2, fb_bank: 2 });
    await saveExercise(d, ann, "UNGDOM", exerciseInputFrom({ ...exerciseValues(ex), area: "30 × 20 m" }), id);
    expect((await exerciseVersions(d, kjetil, "BARN", code)).map((v) => v.version)).toEqual([2, 1]);
    expect((await exerciseEdits(d, kjetil, "BARN", code)).length).toBe(1);
    // An exercise the youth team makes is in the bank for the children's team too.
    const id2 = (await savePlanExercise(d, ann, "UNGDOM", plan.ovelser[2], [], "manual"))!;
    expect((await listExercises(d, kjetil, "BARN")).map((e) => e.id)).toContain(id2);

    // The analysis sees the evaluations from both groups; evaluations still belong to the team.
    expect((await patternInputs(d)).evaluations.map((e) => e.author).sort()).toEqual(["P-1", "P-2"]);
    const fb = await d.query<{ g: string }>("SELECT DISTINCT spond_group_id AS g FROM exercise_feedback ORDER BY 1");
    expect(fb.map((r) => r.g)).toEqual(["BARN", "UNGDOM"]);

    // The bank is reached through the trainer's own group only.
    await expect(listExercises(d, ann, BANK)).rejects.toThrow(/tilgang/);
    await expect(listExercises(d, ann, "BARN")).rejects.toThrow(/tilgang/);
  });

  it("moves each group's own exercises into the shared bank, and keeps codes apart", async () => {
    const m = await testDb();
    const ins = (g: string, code: string, name: string) =>
      m.query("INSERT INTO exercises (spond_group_id, code, name, category, created_by, updated_by) VALUES ($1, $2, $3, 'annet', 'P-1', 'P-1')", [g, code, name]);
    await ins("A", "rondo", "Rondo A");
    await ins("B", "rondo", "Rondo B");
    await ins("B", "rondo-variant", "Rondo B2");
    await m.query("UPDATE exercises SET based_on = 'rondo' WHERE code = 'rondo-variant'");
    await m.query("INSERT INTO exercise_feedback (spond_group_id, exercise_code, rating, author) VALUES ('B', 'rondo', 3, 'P-2')");
    await m.query(await readFile("supabase/migrations/20261101150000_shared_bank.sql", "utf8"));
    const rows = await m.query<{ g: string; code: string; name: string; based_on: string | null }>("SELECT spond_group_id AS g, code, name, based_on FROM exercises ORDER BY id");
    const b = rows[1].code;
    expect(b).toMatch(/^rondo-\d+$/);
    expect(rows).toEqual([
      { g: BANK, code: "rondo", name: "Rondo A", based_on: null },
      { g: BANK, code: b, name: "Rondo B", based_on: null },
      { g: BANK, code: "rondo-variant", name: "Rondo B2", based_on: b },
    ]);
    expect((await m.query<{ c: string }>("SELECT exercise_code AS c FROM exercise_feedback"))[0].c).toBe(b);
    await m.close();
  });

  it("does not let a new exercise be too much like one in the bank, but a variant of it is fine", async () => {
    const e = plan.ovelser[2];
    await savePlanExercise(d, kjetil, "BARN", e, ["Samhandling"], "manual");
    const bank = await listExercises(d, ann, "UNGDOM");
    // A copy under another code, or the same name from the form, is refused for every group.
    const copy = { ...e, kode: "kopi-av-ovelse" };
    await expect(savePlanExercise(d, ann, "UNGDOM", copy, [], "ai")).rejects.toBeInstanceOf(TooSimilarError);
    await expect(saveExercise(d, ann, "UNGDOM", { name: `${e.navn.toUpperCase()}!`, category: "annet", themes: [], status: "active" }, null)).rejects.toThrow(/ligner for mye på/);
    // As a variant of it, it is saved.
    expect(await savePlanExercise(d, ann, "UNGDOM", { ...copy, basert_pa: e.kode }, [], "ai")).not.toBeNull();
    // Something else is saved too.
    expect(await saveExercise(d, ann, "UNGDOM", { name: "Hodespill i par", category: "annet", themes: [], status: "active", execution: "To og to header ballen til hverandre." }, null)).toBeGreaterThan(0);

    expect(tooSimilar({ name: e.navn, category: "annet", themes: [], organisation: "", execution: "", drawing: null }, bank)?.code).toBe(e.kode);
    const approve = bankCandidates({ ...plan, ovelser: [{ ...e, kode: "enda-en-kopi", kilde: "ny" }] }, bank);
    expect(approve[0]).toMatchObject({ blocked: true, default: "skip", match: { code: e.kode } });
  });
});

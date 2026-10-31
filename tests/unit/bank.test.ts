import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { exerciseInputFrom, exerciseValues } from "@/lib/plans/exercise-values";
import { validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import { NO_RIGHTS, type Access, type Rights } from "@/lib/store/access";
import { bankOf, exerciseCounts, getBankSettings, setSharedBank } from "@/lib/store/bank";
import { exerciseEdits } from "@/lib/store/edits";
import { groupsWithFeedback, patternInputs } from "@/lib/store/observations";
import { getExercise, listExercises, saveBankFeedback, saveExercise, savePlanExercise } from "@/lib/store/training";
import { exerciseVersions } from "@/lib/store/versions";
import { testDb } from "../helpers/db";

const plan = validatePlan(reference);
const sa: Rights = { superadmin: true, admin: true, ai: true, app: true, tags: true };
// Kjetil is in both groups; Ann only in the youth group.
const kjetil: Access = { profileId: "P-1", groupIds: new Set(["BARN", "UNGDOM"]) };
const ann: Access = { profileId: "P-2", groupIds: new Set(["UNGDOM"]) };
const rate = (code: string, rating: number) => ({ exercise_no: null, exercise_code: code, rating, tags: ["ko"], actual_minutes: null, actual_players: null, body: "", use_again: "" });

describe("shared exercise bank", () => {
  let d: Db;
  beforeAll(async () => {
    d = await testDb();
  });
  afterAll(async () => d.close());

  it("lets every group use one group's bank, with evaluations from all teams, and back again", async () => {
    const id = (await savePlanExercise(d, kjetil, "BARN", plan.ovelser[1], ["Samhandling"], "manual"))!;
    const code = (await getExercise(d, kjetil, "BARN", id)).code;
    // One bank per group until superadmin chooses a shared one.
    expect(await bankOf(d, "UNGDOM")).toBe("UNGDOM");
    expect(await listExercises(d, ann, "UNGDOM")).toEqual([]);
    await expect(setSharedBank(d, kjetil, NO_RIGHTS, "BARN")).rejects.toThrow(/superadmin/);
    await expect(setSharedBank(d, ann, sa, "BARN")).rejects.toThrow(/tilgang/);

    await setSharedBank(d, kjetil, sa, "BARN");
    expect((await getBankSettings(d)).sharedGroupId).toBe("BARN");
    expect(await bankOf(d, "UNGDOM")).toBe("BARN");
    const [ex] = await listExercises(d, ann, "UNGDOM");
    expect(ex).toMatchObject({ id, code });

    // Ann evaluates and changes the exercise from her own group: it is counted and versioned in the shared bank.
    await saveBankFeedback(d, ann, "UNGDOM", id, rate(code, 1));
    await saveBankFeedback(d, kjetil, "BARN", id, rate(code, 3));
    expect((await listExercises(d, kjetil, "BARN"))[0]).toMatchObject({ fb_n: 2, fb_bank: 2 });
    await saveExercise(d, ann, "UNGDOM", exerciseInputFrom({ ...exerciseValues(ex), area: "30 × 20 m" }), id);
    expect((await exerciseVersions(d, kjetil, "BARN", code)).map((v) => v.version)).toEqual([2, 1]);
    expect((await exerciseEdits(d, kjetil, "BARN", code)).length).toBe(1);
    // A new exercise from the youth group goes into the shared bank.
    const id2 = (await savePlanExercise(d, ann, "UNGDOM", plan.ovelser[2], [], "manual"))!;
    expect((await listExercises(d, kjetil, "BARN")).map((e) => e.id)).toContain(id2);
    expect(await exerciseCounts(d)).toEqual(new Map([["BARN", 2]]));

    // The analysis goes through the shared bank once, with the evaluations from both groups.
    expect(await groupsWithFeedback(d)).toEqual(["BARN"]);
    expect((await patternInputs(d, "BARN")).evaluations.map((e) => e.author).sort()).toEqual(["P-1", "P-2"]);

    // Ann cannot reach the bank's group directly.
    await expect(listExercises(d, ann, "BARN")).rejects.toThrow(/tilgang/);

    await setSharedBank(d, kjetil, sa, null);
    expect(await listExercises(d, ann, "UNGDOM")).toEqual([]);
    expect((await listExercises(d, kjetil, "BARN")).length).toBe(2);
  });
});

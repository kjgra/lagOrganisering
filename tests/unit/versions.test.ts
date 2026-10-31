import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { measureVersions } from "@/lib/improve";
import { exerciseInputFrom, exerciseValues, type ExerciseValues } from "@/lib/plans/exercise-values";
import { validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import { isSmallChange, rollbackDecision, type VersionStat } from "@/lib/plans/versions";
import type { Access } from "@/lib/store/access";
import { listProposals } from "@/lib/store/improvements";
import { getExercise, saveBankFeedback, saveFeedback, savePlan, savePlanExercise, saveExercise } from "@/lib/store/training";
import { exerciseVersions } from "@/lib/store/versions";
import { testDb } from "../helpers/db";

const v = (x: Partial<ExerciseValues>) => ({ name: "Rondo", easier: "Færre forsvarere", harder: "", questions: "", learning_points: "", organisation: "Rute 8 × 8 m", ...x }) as ExerciseValues;
const stat = (version: number, source: VersionStat["source"], n: number, mean: number | null): VersionStat => ({ version, source, n, mean, created_at: null });

describe("small changes and going back", () => {
  it("counts only new lines under easier, harder, questions and learning points as small", () => {
    expect(isSmallChange(v({}), v({ easier: "Færre forsvarere\nStørre rute", questions: "Hvor er rommet?" }))).toBe(true);
    expect(isSmallChange(v({}), v({ easier: "Større rute" }))).toBe(false);
    expect(isSmallChange(v({}), v({ organisation: "Rute 12 × 12 m" }))).toBe(false);
    expect(isSmallChange(v({}), v({}))).toBe(false);
  });

  it("goes back only from a clearly worse version from Forbedringer with enough ratings", () => {
    const worse = [stat(3, "forbedring", 5, 1.6), stat(2, "endret", 4, 2.4)];
    expect(rollbackDecision(worse, 3)).toMatchObject({ from: 3, to: 2 });
    expect(rollbackDecision(worse, 3)!.reason).toBe("Versjon 3 fikk snitt 1,6 av 3 fra 5 vurderinger, mot 2,4 fra 4 for versjon 2. Appen har gått tilbake til innholdet i versjon 2.");
    expect(rollbackDecision([stat(3, "endret", 5, 1.6), stat(2, "endret", 4, 2.4)], 3)).toBeNull();
    expect(rollbackDecision([stat(3, "automatisk", 4, 1.6), stat(2, "endret", 4, 2.4)], 3)).toBeNull();
    expect(rollbackDecision([stat(3, "forbedring", 5, 2.1), stat(2, "endret", 4, 2.4)], 3)).toBeNull();
  });
});

describe("versions in the bank", () => {
  let d: Db;
  const me: Access = { profileId: "P-1", groupIds: new Set(["G1"]) };
  const trainer = (n: number): Access => ({ profileId: `P-${n}`, groupIds: new Set(["G1"]) });
  const plan = validatePlan(reference);
  const rate = (rating: number) => ({ exercise_no: null, exercise_code: "", rating, tags: [], actual_minutes: null, actual_players: null, body: "", use_again: "" });

  beforeAll(async () => {
    d = await testDb();
  });
  afterAll(async () => d.close());

  it("makes a version per change, ties each evaluation to its version, and goes back when a proposal made it worse", async () => {
    const id = (await savePlanExercise(d, me, "G1", plan.ovelser[1], ["Samhandling"], "manual"))!;
    const ex = await getExercise(d, me, "G1", id);
    const v1 = exerciseValues(ex);
    // A plan made with version 1, evaluated after the exercise changed, is about version 1.
    const p = await savePlan(d, me, "G1", "E1", plan);
    for (const n of [2, 3, 4]) await saveBankFeedback(d, trainer(n), "G1", id, { ...rate(3), exercise_code: ex.code });

    await saveExercise(d, me, "G1", exerciseInputFrom(v1), id); // no change, no version
    expect(await exerciseVersions(d, me, "G1", ex.code)).toEqual([]);
    await saveExercise(d, me, "G1", exerciseInputFrom({ ...v1, area: "30 × 20 m" }), id, { source: "forbedring" });
    await saveFeedback(d, me, p.id, [{ ...rate(3), exercise_no: 2, exercise_code: ex.code }], null);
    for (const n of [5, 6, 7, 8, 9]) await saveBankFeedback(d, trainer(n), "G1", id, { ...rate(1), exercise_code: ex.code });

    const versions = await exerciseVersions(d, me, "G1", ex.code);
    expect(versions.map((x) => [x.version, x.source, x.n, x.mean])).toEqual([
      [2, "forbedring", 5, 1],
      [1, "tidligere", 4, 3],
    ]);
    expect(versions[1].vals.area).toBe(v1.area);

    expect(await measureVersions(d, me, "G1")).toBe(1);
    const back = await getExercise(d, me, "G1", id);
    expect([back.version, back.area]).toEqual([3, v1.area]);
    expect((await exerciseVersions(d, me, "G1", ex.code))[0].source).toBe("tilbakerulling");
    const { auto } = await listProposals(d, me, "G1");
    expect(auto.map((x) => [x.kind, x.status])).toEqual([["tilbakerulling", "auto"]]);
    // Only once: the current version is the way back, not a proposal.
    expect(await measureVersions(d, me, "G1")).toBe(0);
  });
});

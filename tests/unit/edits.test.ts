import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { changedFieldsText, exerciseChanges, planChanges } from "@/lib/plans/exercise-edits";
import { exerciseValues, type ExerciseValues } from "@/lib/plans/exercise-values";
import { validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import type { Access } from "@/lib/store/access";
import { exerciseEdits } from "@/lib/store/edits";
import { getExercise, saveExercise, savePlanExercise } from "@/lib/store/training";
import { testDb } from "../helpers/db";

let d: Db;
const me: Access = { profileId: "P-1", groupIds: new Set(["G1"]) };
const plan = validatePlan(reference);
const form = (v: ExerciseValues) => ({ ...v, themes: v.themes.split(",").map((t) => t.trim()).filter(Boolean) });

beforeAll(async () => {
  d = await testDb();
});
afterAll(async () => d.close());

describe("what trainers change", () => {
  it("finds changed fields, ignoring spacing and order, and only says that the drawing changed", () => {
    const a = { name: "Rondo", themes: "A, B", organisation: "Rute 8 × 8 m\nFire på kanten", bands: ["8-9", "10-12"], drawing: '{"a":1}' } as unknown as ExerciseValues;
    const b = { name: "Rondo ", themes: ["A", "B"], organisation: "Rute  8 × 8 m\n\nFire på kanten", bands: ["10-12", "8-9"], drawing: '{ "a": 1 }' } as unknown as ExerciseValues;
    expect(exerciseChanges(a, b)).toEqual({});
    const c = { ...b, organisation: "Rute 12 × 12 m", drawing: '{"a":2}' } as unknown as ExerciseValues;
    expect(exerciseChanges(a, c)).toEqual({
      organisation: { fra: "Rute 8 × 8 m\nFire på kanten", til: "Rute 12 × 12 m" },
      drawing: { fra: "(tegning)", til: "(tegning)" },
    });
    expect(changedFieldsText(exerciseChanges(a, c))).toBe("Organisering, Tegning");
    expect(planChanges(["a", "b", "c"], ["a", "d", "c"])).toEqual({ beholdt: ["a", "c"], fjernet: ["b"], lagt_til: ["d"] });
  });

  it("logs what KI suggested and what the trainer changed in it, and the first change of a KI exercise", async () => {
    const id = (await savePlanExercise(d, me, "G1", plan.ovelser[1], ["Samhandling"], "ai"))!;
    const v = exerciseValues(await getExercise(d, me, "G1", id));
    const code = (await getExercise(d, me, "G1", id)).code;

    // First change of an exercise KI made: a correction of KI.
    await saveExercise(d, me, "G1", form({ ...v, area: "20 × 15 m" }), id);
    // Then «Juster med KI»: KI changes the execution, the trainer changes the name of KI's version.
    const now = exerciseValues(await getExercise(d, me, "G1", id));
    const kiDraft = { ...now, execution: "Spill 3 mot 3 med joker" };
    await saveExercise(d, me, "G1", form({ ...kiDraft, name: "Rondo med joker" }), id, { kiDraft });
    // An ordinary change; no change logs nothing.
    const later = exerciseValues(await getExercise(d, me, "G1", id));
    await saveExercise(d, me, "G1", form({ ...later, easier: "Færre forsvarere" }), id);
    await saveExercise(d, me, "G1", form({ ...later, easier: "Færre forsvarere" }), id);

    const log = await exerciseEdits(d, me, "G1", code);
    expect(log.map((e) => [e.kind, Object.keys(e.changes)])).toEqual([
      ["manuell", ["easier"]],
      ["retting_av_ki", ["name"]],
      ["ki_forslag", ["execution"]],
      ["retting_av_ki", ["area"]],
    ]);
    expect(log[1].changes).toEqual({ name: { fra: plan.ovelser[1].navn, til: "Rondo med joker" } });
    expect(log.every((e) => e.author === "P-1")).toBe(true);
  });
});

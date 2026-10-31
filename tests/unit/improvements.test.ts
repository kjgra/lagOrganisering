import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { analyseBank } from "@/lib/observe";
import { proposalPlan, proposalWish, reasonText } from "@/lib/plans/improvements";
import type { ExercisePattern, Pattern } from "@/lib/plans/observations";
import { validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import type { Access } from "@/lib/store/access";
import { decideProposal, listProposals, openProposalFor, rejectionsFor } from "@/lib/store/improvements";
import { getExercise, listExercises, saveBankFeedback, saveExercise, savePlanExercise } from "@/lib/store/training";
import { exerciseInputFrom } from "@/lib/plans/exercise-values";
import { testDb } from "../helpers/db";

const pat = (x: Partial<Pattern>): Pattern => ({ kind: "ko", positive: false, count: 3, sessions: 3, trainers: 2, pattern: true, part: "organisering", context: "", suggestions: [], ...x });
const ex = (x: Partial<ExercisePattern>): ExercisePattern => ({ code: "A", score: 2.2, ratings: 3, trend: "", patterns: [], bands: [], ...x });

describe("which proposal", () => {
  it("proposes a new version for problems, an adaptation when they only happen in one situation, and archiving when rated low by many", () => {
    expect(proposalPlan(ex({ patterns: [pat({ kind: "goy", positive: true })] }))).toBeNull();
    expect(proposalPlan(ex({ patterns: [pat({ pattern: false })] }))).toBeNull();
    const v = proposalPlan(ex({ patterns: [pat({}), pat({ kind: "uklar" })], trend: "faller" }))!;
    expect(v).toMatchObject({ kind: "ny_versjon", signature: "ny_versjon:ko:uklar:faller" });
    expect(proposalPlan(ex({ patterns: [pat({ context: "med 12 eller flere spillere" })] }))!.kind).toBe("tilpasning");
    expect(proposalPlan(ex({ score: 1.4, ratings: 6 }))!.kind).toBe("arkiver");
    expect(proposalPlan(ex({ score: 1.4, ratings: 2 }))).toBeNull();
  });

  it("proposes a variant when one age band rates it well and another poorly, until that band has one", () => {
    const bands = [
      { band: "10-12" as const, mean: 2.7, ratings: 3, trainers: 3 },
      { band: "6-7" as const, mean: 1.3, ratings: 3, trainers: 2 },
    ];
    const plan = proposalPlan(ex({ bands, patterns: [pat({ context: "for 6–7 år", band: "6-7" }), pat({ kind: "uklar", context: "for 10–12 år", band: "10-12" })] }))!;
    expect(plan).toMatchObject({ kind: "variant", signature: "variant:6-7", band: { band: "6-7" } });
    // Only the problems from that age band go with it.
    expect(plan.problems.map((x) => x.kind)).toEqual(["ko"]);
    expect(reasonText(ex({ bands }), plan)).toMatch(/^Øvelsen fungerer for 10–12 år, snitt 2,7 av 3 \(3 vurderinger\), men ikke for 6–7 år, snitt 1,3 av 3 \(3 vurderinger\)\./);
    expect(proposalWish(plan, [])).toContain("Lag en variant av øvelsen for 6–7 år");
    // Too few ratings, or a variant for the band already: no variant.
    expect(proposalPlan(ex({ bands: [bands[0], { ...bands[1], ratings: 2 }] }))).toBeNull();
    expect(proposalPlan(ex({ bands }), ["6-7"])).toBeNull();
  });

  it("explains it with the numbers, and tells KI what was turned down before", () => {
    const p = ex({ patterns: [pat({ suggestions: ["del i to ruter"], context: "med 12 eller flere spillere" })] });
    const plan = proposalPlan(p)!;
    expect(reasonText(p, plan)).toBe("3 økter og 2 trenere nevnte mye venting/kø (organisering, med 12 eller flere spillere). Forslag fra trenerne: «del i to ruter».");
    const wish = proposalWish(plan, ["Vi har ikke plass til to ruter"]);
    expect(wish).toContain("Legg til en tilpasning");
    expect(wish).toContain("- «Vi har ikke plass til to ruter»");
    expect(proposalWish(plan, ["x".repeat(2000)]).length).toBeLessThanOrEqual(1000);
  });
});

describe("proposals from the analysis", () => {
  let d: Db;
  const ann: Access = { profileId: "P-ANN", groupIds: new Set(["G1"]) };
  const bo: Access = { profileId: "P-BO", groupIds: new Set(["G1"]) };
  const plan = validatePlan(reference);
  const row = (body: string) => ({ exercise_no: null, exercise_code: "", rating: 1, tags: ["ko"], actual_minutes: null, actual_players: null, body, use_again: "changes" });

  beforeAll(async () => {
    process.env.AI_MOCK = "true";
    d = await testDb();
  });
  afterAll(async () => d.close());

  it("makes one proposal when two trainers say the same, waits while it is open, and not again right after it is turned down", async () => {
    const id = (await savePlanExercise(d, ann, "G1", plan.ovelser[1], ["Samhandling"], "manual"))!;
    const code = (await getExercise(d, ann, "G1", id)).code;
    await saveBankFeedback(d, ann, "G1", id, { ...row("Mye kø, del i to ruter"), exercise_code: code });
    expect((await analyseBank(d)).proposed).toBe(0);
    await saveBankFeedback(d, bo, "G1", id, { ...row(""), exercise_code: code });

    const r = await analyseBank(d);
    expect(r.proposed).toBe(1);
    const { open } = await listProposals(d, ann, "G1");
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ kind: "ny_versjon", exercise_id: id, status: "ny" });
    expect(open[0].reason).toContain("2 trenere nevnte mye venting/kø");
    expect(open[0].proposed.execution).toContain("Justert med simulert KI");
    expect(open[0].base_values.name).toBe(plan.ovelser[1].navn);
    expect(await openProposalFor(d, ann, "G1", code)).toBe(open[0].id);
    const usage = await d.query<{ kind: string; spond_profile_id: string }>("SELECT kind, spond_profile_id FROM ai_usage WHERE kind = 'exercise'");
    expect(usage).toEqual([{ kind: "exercise", spond_profile_id: "system" }]);

    expect((await analyseBank(d)).proposed).toBe(0);
    expect(await decideProposal(d, bo, "G1", open[0].id, "avvist", "Vi har ikke plass til to ruter")).toBe(true);
    expect(await decideProposal(d, bo, "G1", open[0].id, "brukt")).toBe(false);
    expect((await analyseBank(d)).proposed).toBe(0);
    expect(await rejectionsFor(d, code)).toEqual(["Vi har ikke plass til to ruter"]);
    expect((await listProposals(d, ann, "G1")).handled.map((p) => [p.status, p.decided_by])).toEqual([["avvist", "P-BO"]]);
  });

  it("makes a variant for the age band that rates it poorly, saved as a new exercise based on it", async () => {
    const year = new Date().getFullYear();
    await d.query(
      `INSERT INTO team_settings (spond_group_id, spond_subgroup_id, birth_year, updated_by) VALUES ('G1', 'SMA', $1, 'P-ANN'), ('G1', 'STORE', $2, 'P-ANN')`,
      [year - 6, year - 11],
    );
    const id = (await savePlanExercise(d, ann, "G1", plan.ovelser[2], [], "manual"))!;
    const code = (await getExercise(d, ann, "G1", id)).code;
    const rate = (rating: number) => ({ ...row(""), tags: [], rating, use_again: "", exercise_code: code });
    for (const [who, sub, rating] of [["P-A", "SMA", 1], ["P-B", "SMA", 1], ["P-C", "SMA", 2], ["P-D", "STORE", 3], ["P-E", "STORE", 3], ["P-F", "STORE", 3]] as const) {
      await saveBankFeedback(d, { profileId: who, groupIds: new Set(["G1"]) }, "G1", id, rate(rating), [sub]);
    }
    expect((await analyseBank(d)).proposed).toBe(1);
    const p = (await listProposals(d, ann, "G1")).open.find((x) => x.exercise_code === code)!;
    expect(p).toMatchObject({ kind: "variant", proposed: { name: `${plan.ovelser[2].navn} (6–7 år)`, bands: ["6-7"] } });
    expect(p.reason).toContain("men ikke for 6–7 år");

    // «Bruk»: a new exercise based on it, for 6–7 år; the one it is based on is as it was.
    const vid = await saveExercise(d, ann, "G1", exerciseInputFrom(p.proposed), null, { basedOn: code });
    await decideProposal(d, ann, "G1", p.id, "brukt");
    const all = await listExercises(d, ann, "G1");
    expect(all.find((e) => e.id === vid)).toMatchObject({ based_on: code, bands: ["6-7"] });
    expect(all.find((e) => e.id === id)!.version).toBe(1);
    // That band has its variant now: none is proposed again.
    await d.query("UPDATE improvement_proposals SET decided_at = now() - interval '100 days' WHERE id = $1", [p.id]);
    expect((await analyseBank(d)).proposed).toBe(0);
  });
});

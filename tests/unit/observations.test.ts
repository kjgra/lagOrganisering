import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { observationsFromAnswer, observeText } from "@/lib/ai/observe-ai";
import type { Db } from "@/lib/db";
import { analyseGroup } from "@/lib/observe";
import { analysePatterns, patternText, type EvaluationRow } from "@/lib/plans/observations";
import { validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import type { Access } from "@/lib/store/access";
import { logEdit } from "@/lib/store/edits";
import { exercisePattern } from "@/lib/store/observations";
import { saveFeedback, savePlan } from "@/lib/store/training";
import { testDb } from "../helpers/db";

const now = new Date("2026-10-31T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const settings = { minSessions: 3, minTrainers: 2 };
let id = 0;
const ev = (x: Partial<EvaluationRow>): EvaluationRow => ({ feedbackId: ++id, code: "A", rating: 2, tags: [], session: `E${id}`, author: "P-1", players: null, at: daysAgo(1), ...x });

describe("patterns per exercise", () => {
  it("counts a kind once per evaluation, and makes it a pattern from enough sessions or trainers", () => {
    const rows = [
      ev({ tags: ["ko"], players: 14 }),
      ev({ tags: ["ko"], players: 13 }),
      ev({ tags: [], players: 8 }),
      ev({ code: "B", tags: ["goy"], author: "P-1" }),
      ev({ code: "B", tags: ["goy"], author: "P-2" }),
    ];
    // KI found kø in the first comment too (with a suggestion), and kø in the third.
    const obs = [
      { feedbackId: rows[0].feedbackId, kind: "ko", part: "", strength: "tydelig" as const, suggestion: "Del i to ruter" },
      { feedbackId: rows[2].feedbackId, kind: "uklar", part: "gjennomforing", strength: "svak" as const, suggestion: "" },
    ];
    const [a, b] = analysePatterns(rows, obs, [], settings, now);
    const ko = a.patterns.find((p) => p.kind === "ko")!;
    expect([ko.count, ko.sessions, ko.trainers, ko.pattern, ko.part, ko.suggestions]).toEqual([2, 2, 1, false, "organisering", ["Del i to ruter"]]);
    // Only with big groups: the exercise also ran with 8 players, without kø.
    expect(ko.context).toBe("med 12 eller flere spillere");
    expect(patternText(ko)).toBe("Mye venting/kø: 2 økter, 1 trener · organisering · med 12 eller flere spillere");
    expect(analysePatterns(rows, obs, [], { minSessions: 2, minTrainers: 2 }, now)[0].patterns[0]).toMatchObject({ kind: "ko", pattern: true });
    // Two trainers saying the same is enough.
    expect(b.patterns).toMatchObject([{ kind: "goy", positive: true, trainers: 2, pattern: true }]);
  });

  it("pulls few ratings towards the bank's mean, and flags falling ratings and exercises trainers take out", () => {
    const rows = [
      ev({ code: "A", rating: 3 }),
      ...[1, 2, 3, 3].map((r) => ev({ code: "B", rating: r })),
      ev({ code: "C", rating: 3, at: daysAgo(120) }),
      ev({ code: "C", rating: 3, at: daysAgo(100) }),
      ev({ code: "C", rating: 1, at: daysAgo(10) }),
      ev({ code: "C", rating: 2, at: daysAgo(5) }),
    ];
    const removed = [
      { code: "D", at: daysAgo(10) },
      { code: "D", at: daysAgo(20) },
      { code: "B", at: daysAgo(200) },
    ];
    const out = analysePatterns(rows, [], removed, settings, now);
    const by = Object.fromEntries(out.map((p) => [p.code, p]));
    expect(by.A.score).toBeGreaterThan(2.3);
    expect(by.A.score).toBeLessThan(3);
    expect(by.C.trend).toBe("faller");
    expect(by.B.trend).toBe("");
    expect(by.D).toMatchObject({ score: null, ratings: 0, trend: "byttes_ut" });
  });
});

describe("KI's observations", () => {
  it("keeps known ids and kinds only, and drops sensitive suggestions", () => {
    const text = JSON.stringify({
      innspill: [
        { id: 1, observasjoner: [{ type: "ko", del: "organisering", styrke: "tydelig", forslag: "Del i to ruter" }, { type: "ko", del: "", styrke: "svak", forslag: "" }, { type: "ukjent", del: "", styrke: "svak", forslag: "" }] },
        { id: 2, observasjoner: [{ type: "for_vanskelig", del: "x", styrke: "svak", forslag: "Ta hensyn til en skade" }] },
        { id: 9, observasjoner: [{ type: "goy", del: "", styrke: "svak", forslag: "" }] },
      ],
    });
    const m = observationsFromAnswer(text, [1, 2]);
    expect(m.get(1)).toEqual([{ kind: "ko", part: "organisering", strength: "tydelig", suggestion: "Del i to ruter" }]);
    expect(m.get(2)).toEqual([{ kind: "for_vanskelig", part: "", strength: "svak", suggestion: "" }]);
    expect(m.has(9)).toBe(false);
    expect(observeText([{ id: 1, exercise: "Rondo", rating: 1, tags: ["ko"], body: "Mye  kø" }])).toContain("- id 1 · øvelse «Rondo» · 👎 Dårlig · mye venting/kø\n  Kommentar: Mye kø");
  });
});

describe("the analysis", () => {
  let d: Db;
  const ann: Access = { profileId: "P-ANN", groupIds: new Set(["G1"]) };
  const bo: Access = { profileId: "P-BO", groupIds: new Set(["G1"]) };
  const plan = validatePlan(reference);
  const code = plan.ovelser[1].kode;
  const row = (body: string, tags: string[] = []) => ({ exercise_no: 2, exercise_code: code, rating: 1, tags, actual_minutes: null, actual_players: null, body, use_again: "" });
  const session = (players: number) => ({ exercise_no: null, exercise_code: "", rating: 2, tags: [], actual_minutes: null, actual_players: players, body: "", use_again: "" });

  beforeAll(async () => {
    process.env.AI_MOCK = "true";
    d = await testDb();
  });
  afterAll(async () => d.close());

  it("turns comments into observations once, and stores the pattern per exercise", async () => {
    const p1 = await savePlan(d, ann, "G1", "E1", plan);
    const p2 = await savePlan(d, bo, "G1", "E2", plan);
    await saveFeedback(d, ann, p1.id, [session(14), row("Mye kø, del i to ruter neste gang")], null);
    await saveFeedback(d, bo, p2.id, [session(15), row("", ["ko"])], null);
    await logEdit(d, ann, "G1", { kind: "opplegg_etter_ki", planId: p1.id, changes: { beholdt: [], fjernet: [code], lagt_til: [] } });

    const r = await analyseGroup(d, "G1", { now: new Date() });
    expect(r).toMatchObject({ comments: 1, observations: 1, waiting: "" });
    expect((await analyseGroup(d, "G1")).comments).toBe(0);

    const p = (await exercisePattern(d, ann, "G1", code))!;
    expect(p.ratings).toBe(2);
    expect(p.patterns[0]).toMatchObject({ kind: "ko", sessions: 2, trainers: 2, pattern: true, part: "organisering", suggestions: ["del i to ruter neste gang"] });
    const usage = await d.query<{ kind: string; spond_profile_id: string }>("SELECT kind, spond_profile_id FROM ai_usage");
    expect(usage).toEqual([{ kind: "observations", spond_profile_id: "system" }]);

    // Saving the evaluation again goes through the comment again.
    await saveFeedback(d, ann, p1.id, [session(14), row("Gøy, men kø")], null);
    expect((await analyseGroup(d, "G1")).comments).toBe(1);
    await expect(exercisePattern(d, { profileId: "X", groupIds: new Set(["G2"]) }, "G1", code)).rejects.toThrow();
  });
});

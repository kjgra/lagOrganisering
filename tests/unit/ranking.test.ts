import { describe, expect, it } from "vitest";
import { catalogue } from "@/lib/ai/plan-ai";
import type { EvaluationRow, ExercisePattern } from "@/lib/plans/observations";
import type { BankExercise } from "@/lib/plans/plan";
import {
  exerciseEvidence,
  kiExerciseOutcomes,
  posterior,
  priorMean,
  rankScores,
  sampleBeta,
  seeded,
  withEvidence,
  type OutcomePlanRow,
} from "@/lib/plans/ranking";

const now = new Date("2026-11-18T12:00:00Z");
let id = 0;
const ev = (x: Partial<EvaluationRow>): EvaluationRow => ({ feedbackId: ++id, code: "A", rating: 2, tags: [], session: `E${id}`, author: "P-1", players: null, band: "8-9", at: now, ...x });
const pattern = (code: string, evidence: ExercisePattern["evidence"]): ExercisePattern => ({ code, score: null, ratings: 0, trend: "", patterns: [], bands: [], evidence });
const plan = (x: Partial<OutcomePlanRow>): OutcomePlanRow => ({ session: "G/E1", version: 1, status: "draft", source: "ai", codes: [], band: "8-9", birthYear: null, at: now, ...x });

describe("what trainers kept of KI's plans", () => {
  it("compares KI's last plan before the approved one with the approved plan", () => {
    const out = kiExerciseOutcomes([
      plan({ version: 1, codes: ["A", "B"] }),
      plan({ version: 2, codes: ["A", "C"] }),
      plan({ version: 3, source: "manual", status: "approved", codes: ["A", "D"] }),
      // A session without an approved plan says nothing.
      plan({ session: "G/E2", codes: ["X"] }),
      // A KI plan approved as it is: all kept.
      plan({ session: "G/E3", status: "approved", codes: ["B", "B"] }),
    ]);
    expect(out.map((o) => [o.code, o.kept])).toEqual([
      ["A", true],
      ["C", false],
      ["B", true],
    ]);
  });

  it("takes the band from the team's birth year when the plan has none", () => {
    const [o] = kiExerciseOutcomes([plan({ status: "approved", codes: ["A"], band: null, birthYear: 2017 })]);
    expect(o.band).toBe("8-9");
  });
});

describe("evidence and score", () => {
  it("counts a rating as 0, ½ or 1 success, and taking out weighs more than keeping", () => {
    const e = exerciseEvidence(
      [ev({ rating: 3 }), ev({ rating: 1 }), ev({ rating: 2, band: null })],
      [
        { code: "A", kept: true, band: "8-9", at: now },
        { code: "B", kept: false, band: "8-9", at: now },
      ],
      now,
    );
    expect(e.get("A")).toEqual([
      { band: "", s: 0.5, f: 0.5 },
      { band: "8-9", s: 1.3, f: 1 },
    ]);
    expect(e.get("B")).toEqual([{ band: "8-9", s: 0, f: 0.6 }]);
  });

  it("weighs old ratings less", () => {
    const e = exerciseEvidence([ev({ rating: 3, at: new Date(now.getTime() - 90 * 86_400_000) })], [], now);
    expect(e.get("A")![0].s).toBe(0.5);
  });

  it("pulls few ratings towards the bank's mean, and counts other bands a quarter", () => {
    const p0 = priorMean([[{ band: "8-9", s: 1, f: 1 }]]);
    expect(p0).toBe(0.5);
    // One top rating: from 0.5 to 0.67, not 1.
    const one = posterior([{ band: "8-9", s: 1, f: 0 }], "8-9", p0);
    expect(one.a / (one.a + one.b)).toBeCloseTo(2 / 3);
    const other = posterior([{ band: "6-7", s: 4, f: 0 }], "8-9", p0);
    expect(other.a / (other.a + other.b)).toBeCloseTo(2 / 3);
  });

  it("gives every exercise with evidence a pattern", () => {
    const out = withEvidence([pattern("B", undefined)], new Map([["A", [{ band: "8-9" as const, s: 1, f: 0 }]]]));
    expect(out.map((p) => [p.code, p.evidence])).toEqual([
      ["A", [{ band: "8-9", s: 1, f: 0 }]],
      ["B", []],
    ]);
  });
});

describe("Thompson draw", () => {
  it("is the same for the same seed and mostly picks the better exercise", () => {
    const patterns = [pattern("god", [{ band: "8-9", s: 8, f: 1 }]), pattern("svak", [{ band: "8-9", s: 1, f: 8 }])];
    const a = rankScores(["god", "svak", "ny"], patterns, "8-9", "lag/tema/2026-11-18");
    expect(rankScores(["god", "svak", "ny"], patterns, "8-9", "lag/tema/2026-11-18")).toEqual(a);
    let wins = 0;
    for (let i = 0; i < 200; i++) {
      const r = rankScores(["god", "svak"], patterns, "8-9", `seed-${i}`);
      if (r.get("god")! > r.get("svak")!) wins++;
    }
    expect(wins).toBeGreaterThan(190);
  });

  it("sometimes puts an untried exercise ahead of a good one", () => {
    const patterns = [pattern("god", [{ band: "8-9", s: 3, f: 1 }])];
    let ahead = 0;
    for (let i = 0; i < 200; i++) {
      const r = rankScores(["god", "ny"], patterns, "8-9", `seed-${i}`);
      if (r.get("ny")! > r.get("god")!) ahead++;
    }
    expect(ahead).toBeGreaterThan(20);
    expect(ahead).toBeLessThan(100);
  });

  it("draws Beta values with the right mean", () => {
    const rand = seeded("x");
    let sum = 0;
    for (let i = 0; i < 4000; i++) sum += sampleBeta(2, 6, rand);
    expect(sum / 4000).toBeCloseTo(0.25, 1);
    for (let i = 0; i < 50; i++) {
      const x = sampleBeta(0.3, 0.4, rand);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    }
  });
});

describe("catalogue order", () => {
  const ex = (code: string): BankExercise =>
    ({
      id: 1,
      code,
      name: code,
      category: "spill",
      themes: [],
      nff_tags: [],
      bands: ["8-9"],
      status: "active",
      min_players: null,
      max_players: null,
      duration_minutes: null,
      execution: "",
      organisation: "",
      based_on: null,
      fb_n: 0,
      fb_mean: null,
      fb_tags: {},
      fb_yes: 0,
      fb_changes: 0,
      fb_no: 0,
    }) as unknown as BankExercise;

  it("puts what trainers rated and kept first among those that fit as well", () => {
    const patterns = [pattern("a-svak", [{ band: "8-9", s: 0, f: 6 }]), pattern("b-god", [{ band: "8-9", s: 6, f: 0 }])];
    const c = catalogue([ex("a-svak"), ex("b-god")], "", 1, { band: "8-9", patterns });
    expect(c).toContain("- b-god");
    expect(c).not.toContain("- a-svak");
  });
});

import { describe, expect, it } from "vitest";
import { allStands, buildTimeline, choiceOf, inferSteps, positionsAt } from "@/lib/plans/animation";
import { DrawingError, drawingShapes, validateDrawing, type Sketch } from "@/lib/plans/drawing";

// «Veggspill og avslutning» from the exercise bank, without steps.
const wall = () =>
  validateDrawing({
    skisser: [
      {
        bane: { bredde: 30, lengde: 26, marg: 4 },
        objekter: [
          { type: "maal", x: 15, y: 26, bredde: 5, side: "topp" },
          { type: "spiller", x: 15, y: 25, lag: "joker", tekst: "K" },
          { type: "spiller", x: 15, y: 2, lag: "1", tekst: "A" },
          { type: "ball", x: 15, y: 2.9 },
          { type: "spiller", x: 24, y: 4, lag: "1", tekst: "R" },
          { type: "spiller", x: 11, y: 9, lag: "1", tekst: "V" },
        ],
        piler: [
          { type: "pasning", fra: [15, 2.9], til: [11.6, 8.3] },
          { type: "lop", fra: [15, 2], til: [16.5, 12], bue: 0.15 },
          { type: "pasning", fra: [11.6, 9.7], til: [16.3, 13.4] },
          { type: "pasning", fra: [16.5, 13.6], til: [17, 25.8] },
          { type: "lop", fra: [24, 4], til: [12.5, 22.5], bue: -0.15 },
        ],
      },
    ],
  })!.skisser[0];

// «2 mot 1 mot mål» with a choice: the defender goes to the ball (A) or covers the run (B).
const twoVsOne = (): Sketch =>
  validateDrawing({
    skisser: [
      {
        bane: { bredde: 20, lengde: 30, marg: 4 },
        objekter: [
          { type: "spiller", x: 7, y: 6, lag: "1", tekst: "1" },
          { type: "ball", x: 7.6, y: 6.6 },
          { type: "spiller", x: 14, y: 5, lag: "1", tekst: "2" },
          { type: "spiller", x: 10, y: 17, lag: "2", tekst: "F" },
        ],
        piler: [
          { type: "foring", fra: [7.6, 6.6], til: [8.8, 13], trinn: 1 },
          { type: "lop", fra: [14, 5], til: [15, 18], trinn: 1 },
          { type: "lop", fra: [10, 17], til: [9.6, 15], trinn: 1, skjult: true },
          { type: "pasning", fra: [8.8, 13], til: [14.6, 18.2], trinn: 2, alternativ: 1 },
          { type: "foring", fra: [8.8, 13], til: [5.6, 21], trinn: 2, alternativ: 2 },
        ],
        trinnliste: [
          { tekst: "1 fører mot forsvareren" },
          { tekst: "", valg: { sporsmal: "Hva gjør forsvareren?", alternativer: ["Går mot ballen", "Dekker løpet"] }, tekster: ["1 spiller til 2", "1 fører forbi"] },
        ],
      },
    ],
  })!.skisser[0];

describe("animation", () => {
  it("guesses the order from how the arrows connect", () => {
    // pass, then the passer runs (pass and go) with the return pass, then the shot
    expect(inferSteps(wall())).toEqual([1, 2, 2, 3, 1]);
  });

  it("moves the runner, the ball and times the return pass to the run", () => {
    const s = wall();
    const tl = buildTimeline(s);
    expect(tl.steps).toHaveLength(3);
    const [run, pass] = [tl.steps[1].moves.find((m) => m.obj === 2)!, tl.steps[1].moves.find((m) => m.obj === 3)!];
    expect(pass.t1).toBeCloseTo(run.t1);
    expect(pass.t0).toBeGreaterThan(0);
    // A ends at the end of its run, the ball in the goal
    expect(tl.end[2]).toEqual([16.5, 12]);
    expect(tl.end[3][1]).toBeCloseTo(25.8);
    const mid = positionsAt(tl, 0, tl.steps[0].dur / 2);
    expect(mid[3][1]).toBeGreaterThan(2.9);
    expect(mid[2]).toEqual([15, 2]);
  });

  it("follows the chosen alternative", () => {
    const s = twoVsOne();
    expect(choiceOf(s)).toMatchObject({ step: 1, alternativer: ["Går mot ballen", "Dekker løpet"] });
    const a = buildTimeline(s, 1);
    const b = buildTimeline(s, 2);
    expect(a.steps[1].text).toBe("1 spiller til 2");
    expect(b.steps[1].text).toBe("1 fører forbi");
    expect(a.end[0]).toEqual(b.steps[1].start[0]);
    expect(b.end[0][0]).toBeLessThan(6); // 1 dribbled past on the left
    expect(a.end[1][0]).toBeGreaterThan(14); // the ball went to 2
    expect(a.end[3]).toEqual([9.6, 15]); // the hidden run moved the defender
    expect(a.stepOf).toEqual([0, 0, 0, 1, -1]);
    expect(allStands(s).length).toBeGreaterThan(0);
  });

  it("draws letters on alternatives and hides hidden arrows", () => {
    const { shapes } = drawingShapes({ skisser: [twoVsOne()] }, 1200);
    const texts = shapes.filter((x) => x.k === "text").map((x) => (x as { text: string }).text);
    expect(texts).toEqual(expect.arrayContaining(["A", "B"]));
  });

  it("checks steps and choices", () => {
    const base = { bane: { bredde: 12, lengde: 12 }, piler: [{ type: "lop", fra: [1, 1], til: [5, 5], alternativ: 2 }] };
    expect(() => validateDrawing({ skisser: [base] })).toThrow(/alternativ B/);
    expect(() => validateDrawing({ skisser: [{ ...base, trinnliste: [{ valg: { sporsmal: "Hva?", alternativer: ["Bare én"] } }] }] })).toThrow(DrawingError);
    expect(() => validateDrawing({ skisser: [{ bane: { bredde: 12, lengde: 12 }, piler: [{ type: "lop", fra: [1, 1], til: [5, 5], trinn: 9 }] }] })).toThrow(/Trinn/);
  });
});

describe("demo exercises", () => {
  it("are valid drawings that animate", async () => {
    const { ANIMATED_EXERCISES } = await import("@/lib/demo/animated");
    for (const e of ANIMATED_EXERCISES) {
      const s = validateDrawing(e.drawing)!.skisser[0];
      const alts = choiceOf(s)?.alternativer.length ?? 1;
      for (let a = 1; a <= alts; a++) expect(buildTimeline(s, a).steps.length).toBe(3);
    }
  });
});

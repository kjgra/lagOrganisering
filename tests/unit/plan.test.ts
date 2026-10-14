import { describe, expect, it } from "vitest";
import ref from "@/lib/plans/reference-plan.json";
import { checkDrawing, compactDrawing, drawingShapes, fixDrawing, validateDrawing, DrawingError } from "@/lib/plans/drawing";
import { bankCandidates, buildPlan, defaultSettings, exerciseCode, planJson, schedule, validatePlan, validateSeason, PlanError } from "@/lib/plans/plan";

describe("plan", () => {
  it("reads the reference session", () => {
    const p = validatePlan(ref);
    expect(p.ovelser).toHaveLength(3);
    expect(p.tidsplan.stasjoner.grupper).toBe(3);
    const s = schedule(p);
    expect(s.total).toBe(8 + 3 * 15 + 2 * 2 + 8);
    expect(s.rows[1].celler).toEqual(["Øvelse 1", "Øvelse 2", "Øvelse 3"]);
    expect(s.rows[2].celler).toEqual(["Øvelse 2", "Øvelse 3", "Øvelse 1"]);
    // Survives a round trip through the database format.
    expect(validatePlan(JSON.parse(planJson(p)))).toEqual(p);
  });

  it("requires one exercise per station when groups rotate", () => {
    expect(() => validatePlan({ ...ref, tidsplan: { ...ref.tidsplan, stasjoner: { minutter: 15, bytte: 2, grupper: 2 } } })).toThrow(PlanError);
  });

  it("builds a plan from settings, and refuses sensitive words", () => {
    const ex = validatePlan(ref).ovelser.slice(0, 2);
    const p = buildPlan(ex, defaultSettings("Pasning"));
    expect(p.undertittel).toBe("2 stasjoner, 2 grupper · ca. 50 min");
    expect(() => buildPlan(ex, { ...defaultSettings(), merknad: "Han har astma" })).toThrow(/helse/);
  });

  it("makes stable codes", () => {
    expect(exerciseCode("3 mot 1 i to ruter")).toBe("3-mot-1-i-to-ruter");
    expect(exerciseCode("Små-spill på kunstgress", ["sma-spill-pa-kunstgress"])).toBe("sma-spill-pa-kunstgress-2");
  });

  it("suggests new exercises for the bank", () => {
    const p = validatePlan(ref);
    expect(bankCandidates(p, []).map((c) => c.default)).toEqual(["save", "save", "save"]);
  });

  it("checks the season plan", () => {
    const t = Array(12).fill("");
    t[9] = "Samhandling";
    expect(validateSeason(2026, t, Array(12).fill(""))).toEqual([{ month: 10, theme: "Samhandling", description: "" }]);
    const d = Array(12).fill("");
    d[0] = "uten tema";
    expect(() => validateSeason(2026, Array(12).fill(""), d)).toThrow(/januar/);
  });
});

describe("drawing", () => {
  const d = validatePlan(ref).ovelser[0].tegning!;
  it("validates, compacts and draws", () => {
    expect(d.skisser).toHaveLength(2);
    expect(validateDrawing(compactDrawing(d))).toEqual(d);
    const s = drawingShapes(d, 1200);
    expect(s.width).toBe(1200);
    expect(s.shapes.length).toBeGreaterThan(20);
  });
  it("finds and fixes overlapping players", () => {
    const bad = validateDrawing({ skisser: [{ bane: { bredde: 12, lengde: 12 }, objekter: [{ type: "spiller", x: 5, y: 5 }, { type: "spiller", lag: 2, x: 5.2, y: 5 }] }] })!;
    expect(checkDrawing(bad).map((p) => p.type)).toEqual(["spillere"]);
    expect(checkDrawing(fixDrawing(bad))).toEqual([]);
  });
  it("gives Norwegian errors", () => {
    expect(() => validateDrawing({ skisser: [{ bane: { bredde: 2, lengde: 12 } }] })).toThrow(DrawingError);
    expect(() => validateDrawing("{nope")).toThrow(/gyldig JSON/);
    expect(() => validateDrawing({ skisser: [{ bane: { bredde: 12, lengde: 12 }, objekter: [{ type: "ball", x: 40, y: 0 }] }] })).toThrow(/utenfor/);
  });
});

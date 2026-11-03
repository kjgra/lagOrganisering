import { describe, expect, it } from "vitest";
import { CELL_GOAL, coverage, coverageGaps } from "@/lib/nff/coverage";
import type { BankExercise } from "@/lib/plans/plan";

let n = 0;
const ex = (x: Partial<BankExercise>): BankExercise =>
  ({ id: ++n, code: `ov-${n}`, name: `Øvelse ${n}`, status: "active", bands: [], nff_activity: "", nff_tags: [], fb_n: 0, fb_mean: null, fb_yes: 0, fb_changes: 0, fb_no: 0, ...x }) as BankExercise;

describe("coverage of the fagplan", () => {
  it("has the 40 cells that exist in the fagplan", () => {
    const c = coverage([]);
    expect(c.cells).toHaveLength(40);
    expect(c.cells.filter((x) => x.band === "6-7").map((x) => x.tema)).toEqual(expect.arrayContaining(["score-mal", "hindre-mal"]));
    expect(c.cells.some((x) => x.band === "6-7" && x.tema === "vinne-ball")).toBe(false);
    // Heading is a delferdighet from 8–9.
    expect(c.delf.some((d) => d.band === "6-7" && d.key === "heading")).toBe(false);
    expect(c.delf.filter((d) => d.band === "8-9")).toHaveLength(10);
  });

  it("counts good exercises and candidates in every cell their tags put them in", () => {
    const bank = [
      ex({ bands: ["8-9", "10-12"], nff_activity: "med-og-mot", nff_tags: ["tema.vinne-ball", "tema.hindre-avslutning", "delf.press"] }),
      ex({ bands: ["8-9"], nff_activity: "med-og-mot", nff_tags: ["tema.vinne-ball"], status: "candidate" }),
      // KI avoids it: a poor average.
      ex({ bands: ["8-9"], nff_activity: "med-og-mot", nff_tags: ["tema.vinne-ball"], fb_n: 3, fb_mean: 1.3 }),
      ex({ bands: ["8-9"], nff_activity: "med-og-mot", nff_tags: ["tema.vinne-ball"], status: "archived" }),
      ex({ bands: [], nff_activity: "spill", nff_tags: [] }),
    ];
    const c = coverage(bank);
    const cell = c.cells.find((x) => x.key === "8-9.vinne-ball.med-og-mot")!;
    expect(cell).toMatchObject({ good: 1, candidates: 1 });
    expect(cell.exercises).toHaveLength(3);
    expect(cell.exercises[0].good).toBe(true);
    expect(c.cells.find((x) => x.key === "10-12.hindre-avslutning.med-og-mot")!.good).toBe(1);
    expect(c.cells.find((x) => x.key === "8-9.vinne-ball.spill")!.good).toBe(0);
    expect(c.delf.find((d) => d.band === "8-9" && d.key === "press")!.good).toBe(1);
    expect(c.untagged).toBe(1);
  });

  it("lists the gaps as an order for the next series", () => {
    const full = Array.from({ length: CELL_GOAL }, () => ex({ bands: ["6-7"], nff_activity: "spill", nff_tags: ["tema.score-mal"] }));
    const g = coverageGaps(coverage(full));
    expect(g.celler).toHaveLength(39);
    expect(g.celler.some((x) => x.aldersband === "6-7" && x.hovedtema === "score-mal" && x.aktivitet === "spill")).toBe(false);
    expect(g.celler[0]).toMatchObject({ gode: 0, mangler: CELL_GOAL });
  });
});

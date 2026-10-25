import { describe, expect, it } from "vitest";
import { distribute, move, moveFollow, nextLabel, parentNotes } from "@/lib/board";

const players = Array.from({ length: 11 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, tags: i < 2 ? ["Keeper"] : [], coach: false }));

describe("distribute", () => {
  it("spreads keepers and keeps teams within one of each other", () => {
    const a = distribute(players, ["A", "B", "C"], 3);
    const sizes = ["A", "B", "C"].map((l) => Object.values(a).filter((x) => x === l).length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(a.p0).not.toBe(a.p1);
    expect(Object.keys(a)).toHaveLength(11);
  });
  it("is the same for the same seed and leaves trainers out", () => {
    const withCoach = [...players, { id: "c", name: "C", coach: true }];
    expect(distribute(withCoach, ["A", "B"], 7)).toEqual(distribute(withCoach, ["A", "B"], 7));
    expect(distribute(withCoach, ["A", "B"], 7).c).toBeUndefined();
  });
});

describe("move", () => {
  const allowed = new Set(["p1", "p2", "dad"]);
  it("moves only allowed members to known teams", () => {
    expect(move({}, "p1", "A", allowed, ["A"])).toEqual({ p1: "A" });
    expect(move({ p1: "A" }, "p1", "", allowed, ["A"])).toEqual({});
    expect(move({}, "x", "A", allowed, ["A"])).toEqual({});
    expect(move({}, "p1", "Z", allowed, ["A"])).toEqual({});
  });
  it("lets a trainer follow their child", () => {
    const r = moveFollow({}, "p1", "B", allowed, ["A", "B"], [{ parentId: "dad", childId: "p1" }]);
    expect(r.assignments).toEqual({ p1: "B", dad: "B" });
    expect(r.followed).toEqual(["dad"]);
    const notes = parentNotes({ p1: "A", dad: "B" }, [{ parentId: "dad", childId: "p1" }], (id) => id.toUpperCase());
    expect(notes.dad).toBe("Forelder til P1 (A)");
  });
});

it("finds the next free team name", () => {
  expect(nextLabel(["Lag 1", "Lag 3"])).toBe("Lag 2");
});

describe("distribute with levels and pairs", () => {
  const lv = [5, 5, 4, 4, 3, 3, 2, 2, 1, 1];
  const team = lv.map((level, i) => ({ id: `q${i}`, name: `Q${i}`, tags: i === 9 ? ["keeper"] : [], coach: false, level }));
  const sum = (a: Record<string, string>, l: string) => team.filter((p) => a[p.id] === l).reduce((s, p) => s + p.level, 0);

  it("balances the level sum and team sizes", () => {
    for (const seed of [1, 2, 3, 4]) {
      const a = distribute(team, ["A", "B"], seed);
      expect(Object.values(a).filter((x) => x === "A")).toHaveLength(5);
      expect(Math.abs(sum(a, "A") - sum(a, "B"))).toBeLessThanOrEqual(2);
    }
  });

  it("keeps pairs together when it fits, and spreads keepers", () => {
    const keepers = team.map((p, i) => ({ ...p, tags: i === 0 || i === 1 ? ["Keeper"] : [] }));
    const a = distribute(keepers, ["A", "B"], 5, { pairs: [["q2", "q3"], ["q4", "q8"]] });
    expect(a.q2).toBe(a.q3);
    expect(a.q4).toBe(a.q8);
    expect(a.q0).not.toBe(a.q1);
    expect(Object.values(a).filter((x) => x === "A")).toHaveLength(5);
  });

  it("splits a group of pairs that is bigger than a team", () => {
    const pairs: [string, string][] = [["q0", "q1"], ["q1", "q2"], ["q2", "q3"], ["q3", "q4"], ["q4", "q5"]];
    const a = distribute(team, ["A", "B"], 1, { pairs });
    expect(Object.values(a).filter((x) => x === "A")).toHaveLength(5);
  });
});

describe("distribute: Fordeling", () => {
  const sizes = (a: Record<string, string>, labels: string[]) => labels.map((l) => Object.values(a).filter((x) => x === l).length);
  const labels = ["A", "B", "C"];
  const banded = [5, 5, 5, 5, 3, 3, 3, 3, 1, 1, 1, 1].map((level, i) => ({ id: `b${i}`, name: `B${i}`, coach: false, level }));
  const levelsOf = (a: Record<string, string>, l: string) => banded.filter((p) => a[p.id] === l).map((p) => p.level);

  it("nivådelt puts players of the same level together, in random team order", () => {
    const strongest = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const a = distribute(banded, labels, seed, { mode: "levels" });
      expect(sizes(a, labels)).toEqual([4, 4, 4]);
      for (const l of labels) expect(new Set(levelsOf(a, l)).size).toBe(1);
      strongest.add(labels.find((l) => levelsOf(a, l)[0] === 5)!);
    }
    expect(strongest.size).toBeGreaterThan(1);
  });

  it("jevne lag mixes the same players instead", () => {
    const a = distribute(banded, labels, 1, { mode: "even" });
    for (const l of labels) expect(levelsOf(a, l).reduce((s, x) => s + x, 0)).toBe(12);
  });

  it("nivådelt keeps a pair one level apart, but not one far apart", () => {
    const four = [5, 5, 4, 4, 2, 2, 1, 1].map((level, i) => ({ id: `f${i}`, name: `F${i}`, coach: false, level }));
    for (const seed of [1, 2, 3]) {
      const near = distribute(four, ["A", "B"], seed, { mode: "levels", pairs: [["f0", "f2"]] });
      expect(near.f0).toBe(near.f2);
      const far = distribute(four, ["A", "B"], seed, { mode: "levels", pairs: [["f0", "f7"]] });
      expect(far.f0).not.toBe(far.f7);
    }
  });

  it("spreads the roles chosen, and ignores pairs unless given", () => {
    const kids = Array.from({ length: 12 }, (_, i) => ({ id: `k${i}`, name: `K${i}`, coach: false, tags: i < 3 ? ["Forsvar"] : i < 6 ? ["Keeper"] : [] }));
    for (const seed of [1, 2, 3]) {
      const a = distribute(kids, labels, seed, { roles: ["forsvar", "Keeper"] });
      expect(new Set(["k0", "k1", "k2"].map((id) => a[id])).size).toBe(3);
      expect(new Set(["k3", "k4", "k5"].map((id) => a[id])).size).toBe(3);
    }
  });

  it("falls back to random teams of equal size without levels, roles or pairs", () => {
    const plain = Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, name: `R${i}`, coach: false }));
    const a = distribute(plain, labels, 1);
    expect(sizes(a, labels).sort()).toEqual([3, 3, 4]);
    expect(distribute(plain, labels, 2)).not.toEqual(a);
  });

  it("is quick for a big group with everything on", () => {
    const big = Array.from({ length: 40 }, (_, i) => ({ id: `g${i}`, name: `G${i}`, coach: false, level: (i % 5) + 1, tags: i % 8 ? [] : ["Keeper"] }));
    const pairs = Array.from({ length: 10 }, (_, i) => [`g${i}`, `g${i + 20}`] as [string, string]);
    const t = performance.now();
    for (const mode of ["even", "levels"] as const) distribute(big, ["A", "B", "C", "D"], 3, { mode, pairs });
    expect(performance.now() - t).toBeLessThan(1500);
  });
});

describe("distribute: forrige treninger", () => {
  const kids = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, name: `T${i}`, coach: false }));
  const ids = kids.map((k) => k.id);
  const labels = ["A", "B", "C"];
  const last = [ids.slice(0, 4), ids.slice(4, 8), ids.slice(8, 12)];
  const together = (a: Record<string, string>, teams: string[][]) =>
    teams.reduce((n, t) => n + t.filter((x, i) => t.slice(i + 1).some((y) => a[x] === a[y])).length, 0);

  it("«Som sist» puts last training's teammates together again", () => {
    for (const seed of [1, 2, 3]) {
      const a = distribute(kids, labels, seed, { history: "same", previous: [last] });
      for (const t of last) expect(new Set(t.map((id) => a[id])).size).toBe(1);
    }
  });

  it("«Rullér» gives new teammates, and is ignored when off", () => {
    for (const seed of [1, 2, 3]) {
      const a = distribute(kids, labels, seed, { history: "rotate", previous: [last] });
      // Four on a team from three old teams: two of them always shared a team, so 3 is the best.
      expect(together(a, last)).toBe(3);
    }
    const off = [1, 2, 3, 4, 5].map((seed) => together(distribute(kids, labels, seed, { previous: [last] }), last));
    expect(Math.max(...off)).toBeGreaterThan(3);
  });

  it("«Rullér» still keeps the teams even on level", () => {
    const lv = kids.map((k, i) => ({ ...k, level: (i % 4) + 2 }));
    const a = distribute(lv, labels, 1, { history: "rotate", previous: [last, last] });
    const sums = labels.map((l) => lv.filter((p) => a[p.id] === l).reduce((s, p) => s + p.level, 0));
    expect(Math.max(...sums) - Math.min(...sums)).toBeLessThanOrEqual(2);
  });
});

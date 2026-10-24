import { describe, expect, it } from "vitest";
import { distribute, move, moveFollow, nextLabel, parentNotes } from "@/lib/board";

const players = Array.from({ length: 11 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, keeper: i < 2, coach: false }));

describe("distribute", () => {
  it("spreads keepers and keeps teams within one of each other", () => {
    const a = distribute(players, ["A", "B", "C"], 3);
    const sizes = ["A", "B", "C"].map((l) => Object.values(a).filter((x) => x === l).length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(a.p0).not.toBe(a.p1);
    expect(Object.keys(a)).toHaveLength(11);
  });
  it("is the same for the same seed and leaves trainers out", () => {
    const withCoach = [...players, { id: "c", name: "C", keeper: false, coach: true }];
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
  const team = lv.map((level, i) => ({ id: `q${i}`, name: `Q${i}`, keeper: i === 9, coach: false, level }));
  const sum = (a: Record<string, string>, l: string) => team.filter((p) => a[p.id] === l).reduce((s, p) => s + p.level, 0);

  it("balances the level sum and team sizes", () => {
    for (const seed of [1, 2, 3, 4]) {
      const a = distribute(team, ["A", "B"], seed);
      expect(Object.values(a).filter((x) => x === "A")).toHaveLength(5);
      expect(Math.abs(sum(a, "A") - sum(a, "B"))).toBeLessThanOrEqual(2);
    }
  });

  it("keeps pairs together when it fits, and spreads keepers", () => {
    const keepers = team.map((p, i) => ({ ...p, keeper: i === 0 || i === 1 }));
    const a = distribute(keepers, ["A", "B"], 5, [["q2", "q3"], ["q4", "q8"]]);
    expect(a.q2).toBe(a.q3);
    expect(a.q4).toBe(a.q8);
    expect(a.q0).not.toBe(a.q1);
    expect(Object.values(a).filter((x) => x === "A")).toHaveLength(5);
  });

  it("splits a group of pairs that is bigger than a team", () => {
    const pairs: [string, string][] = [["q0", "q1"], ["q1", "q2"], ["q2", "q3"], ["q3", "q4"], ["q4", "q5"]];
    const a = distribute(team, ["A", "B"], 1, pairs);
    expect(Object.values(a).filter((x) => x === "A")).toHaveLength(5);
  });
});

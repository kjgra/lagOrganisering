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

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { osloMonthStart, osloParts } from "@/lib/format";
import type { Insight } from "@/lib/plans/insights";
import {
  bestCombinations,
  improvementEffects,
  kiOutcomes,
  lastMonths,
  monthName,
  monthRows,
  percent,
  totals,
  type PlanRow,
  type SessionRating,
} from "@/lib/plans/learning-stats";
import { validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import type { VersionStat } from "@/lib/plans/versions";
import type { Access } from "@/lib/store/access";
import { improvedVersions, planRows, sessionRatings } from "@/lib/store/learning-stats";
import { approvePlan, saveFeedback, savePlan } from "@/lib/store/training";
import { testDb } from "../helpers/db";

const plan = (x: Partial<PlanRow>): PlanRow => ({ id: 1, session: "G1/E1", version: 1, status: "draft", source: "manual", kind: "", codes: ["a", "b", "c"], month: null, ...x });

describe("numbers for «Innsikt»", () => {
  it("compares KI's last plan before the approved one with what was approved", () => {
    const rows = [
      // KI, then the trainer swapped one exercise.
      plan({ id: 1, session: "G1/E1", source: "ai", codes: ["a", "b", "c", "d"] }),
      plan({ id: 2, session: "G1/E1", version: 2, status: "approved", codes: ["a", "b", "x", "d"], month: "2026-11" }),
      // «Hurtigopprett» approved as it was.
      plan({ id: 3, session: "G1/E2", source: "ai", kind: "hurtig", status: "approved", month: "2026-11" }),
      // «Hurtigopprett» with the order changed: not unchanged.
      plan({ id: 4, session: "G2/E3", source: "ai", kind: "hurtig" }),
      plan({ id: 5, session: "G2/E3", version: 2, status: "approved", codes: ["c", "b", "a"], month: "2026-10" }),
      // Without KI, and KI not approved yet: not counted.
      plan({ id: 6, session: "G2/E4", status: "approved", month: "2026-11" }),
      plan({ id: 7, session: "G2/E5", source: "ai" }),
    ];
    expect(kiOutcomes(rows).map((o) => [o.session, o.codes, o.kept, o.quick, o.unchanged])).toEqual([
      ["G1/E1", 4, 3, false, false],
      ["G1/E2", 3, 3, true, true],
      ["G2/E3", 3, 3, true, false],
    ]);
    const ratings: SessionRating[] = [
      { month: "2026-11", rating: 3, ki: true },
      { month: "2026-11", rating: 2, ki: true },
      { month: "2026-11", rating: 1, ki: false },
      { month: "2026-10", rating: 2, ki: true },
    ];
    const months = lastMonths(2026, 11, 3);
    expect(months).toEqual(["2026-11", "2026-10", "2026-09"]);
    expect(lastMonths(2026, 1, 2)).toEqual(["2026-01", "2025-12"]);
    const m = monthRows(rows, ratings, months);
    expect(m[0]).toEqual({ month: "2026-11", kiSessions: 2, kiExercises: 7, kept: 6, quick: 1, quickUnchanged: 1, kiMean: 2.5, kiRatings: 2, ownMean: 1, ownRatings: 1 });
    expect(m[2]).toMatchObject({ kiSessions: 0, kiMean: null, ownMean: null });
    expect(totals(m)).toEqual({ quick: 2, quickUnchanged: 1, kiExercises: 10, kept: 9, kiMean: 2.33, kiRatings: 3, ownMean: 1, ownRatings: 1 });
    expect(percent(1, 2)).toBe("50 %");
    expect(percent(0, 0)).toBe("–");
    expect(monthName("2026-11")).toBe("november 2026");
  });

  it("shows the best combinations per band, only from several teams and with exercises still in the bank", () => {
    const i = (key: string, mean: number, groups = 2, band: Insight["band"] = "8-9"): Insight => ({
      kind: "kombinasjon",
      band,
      key,
      codes: key.split("+"),
      sessions: 4,
      trainers: 3,
      groups,
      mean,
      tags: [],
    });
    const best = bestCombinations([i("a+b", 2.6), i("a+c", 2.9), i("b+c", 2.2), i("c+d", 3, 1), i("a+e", 3), i("a+b", 2.7, 2, "10-12")], new Set(["a", "b", "c", "d"]));
    expect([...best].map(([band, list]) => [band, list.map((x) => x.key)])).toEqual([
      ["8-9", ["a+c", "a+b"]],
      ["10-12", ["a+b"]],
    ]);
  });

  it("measures each improvement against the version before it", () => {
    const v = (version: number, source: VersionStat["source"], n: number, mean: number | null): VersionStat => ({ version, source, n, mean, created_at: null });
    const fx = improvementEffects(
      new Map([
        ["rondo", [v(3, "forbedring", 4, 2.5), v(2, "endret", 5, 1.8), v(1, "tidligere", 2, 2)]],
        ["kaos", [v(2, "automatisk", 1, 3), v(1, "tidligere", 6, 2)]],
      ]),
    );
    expect(fx).toEqual([
      { code: "rondo", version: 3, before: { mean: 1.8, n: 5 }, after: { mean: 2.5, n: 4 }, measured: true },
      { code: "kaos", version: 2, before: { mean: 2, n: 6 }, after: { mean: 3, n: 1 }, measured: false },
    ]);
  });
});

describe("rows for «Innsikt» from the database", () => {
  let d: Db;
  const ann: Access = { profileId: "P-ANN", groupIds: new Set(["G1"]) };
  const base = validatePlan(reference);
  const session = (rating: number) => ({ exercise_no: null, exercise_code: "", rating, tags: [], actual_minutes: null, actual_players: 12, body: "", use_again: "" });

  beforeAll(async () => {
    d = await testDb();
  });
  afterAll(async () => d.close());

  it("counts KI plans, what was approved and the session ratings, without names", async () => {
    const ki = await savePlan(d, ann, "G1", "E1", base, { source: "ai", context: { kind: "hurtig" } });
    await approvePlan(d, ann, ki.id);
    await saveFeedback(d, ann, ki.id, [session(3)], 12);
    const own = await savePlan(d, ann, "G1", "E2", base);
    await approvePlan(d, ann, own.id);
    await saveFeedback(d, ann, own.id, [session(2)], 12);

    const since = osloMonthStart(new Date(), 5);
    const plans = await planRows(d, ann, "G1", since);
    expect(plans.map((p) => [p.session, p.source, p.kind, p.status])).toEqual(
      expect.arrayContaining([
        ["G1/E1", "ai", "hurtig", "approved"],
        ["G1/E2", "manual", "", "approved"],
      ]),
    );
    const ratings = await sessionRatings(d, ann, "G1", since);
    expect(ratings.map((r) => [r.rating, r.ki]).sort()).toEqual([
      [2, false],
      [3, true],
    ]);
    const t = osloParts(new Date());
    const [now] = monthRows(plans, ratings, lastMonths(t.year, t.month, 1));
    expect(now).toMatchObject({ kiSessions: 1, quick: 1, quickUnchanged: 1, kiMean: 3, ownMean: 2 });
    expect(JSON.stringify([plans, ratings])).not.toMatch(/P-ANN/);
    expect(await improvedVersions(d, ann, "G1")).toEqual(new Map());
    await expect(planRows(d, ann, "G9", since)).rejects.toThrow();
  });
});

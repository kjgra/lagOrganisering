import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lessonsText } from "@/lib/ai/lessons";
import { catalogue } from "@/lib/ai/plan-ai";
import { playersPerGroup, prepareExerciseKi, prepareKi } from "@/lib/ai/service";
import type { CurrentUser } from "@/lib/auth/current";
import type { Db } from "@/lib/db";
import { needsFor, type NeedRow } from "@/lib/plans/needs";
import type { ExercisePattern, Pattern } from "@/lib/plans/observations";
import { validatePlan, type BankExercise } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import type { Access } from "@/lib/store/access";
import { savePatterns } from "@/lib/store/observations";
import { listExercises, savePlanExercise } from "@/lib/store/training";
import type { Group } from "@/lib/spond/types";
import { testDb } from "../helpers/db";

const ex = (code: string, extra: Partial<BankExercise> = {}): BankExercise => ({
  id: 1, code, name: code.toUpperCase(), category: "pasning_mottak", themes: [], min_players: 4, max_players: 8, duration_minutes: 12,
  area: "", organisation: "", execution: "Spill", learning_points: "", questions: "", easier: "", harder: "", nff_url: "",
  drawing: null, source: "manual", based_on: "", status: "active", updated_at: new Date(),
  fb_n: 6, fb_sessions: 6, fb_bank: 0, fb_good: 0, fb_ok: 0, fb_bad: 0, fb_yes: 0, fb_changes: 0, fb_no: 0, fb_mean: 2.2, fb_minutes: null, fb_last: null, fb_tags: {}, bands: [], nff_activity: "", nff_tags: [], ...extra,
});
const pat = (x: Partial<Pattern>): Pattern => ({ kind: "ko", positive: false, count: 3, sessions: 3, trainers: 2, pattern: true, part: "organisering", context: "", suggestions: [], ...x });
const score = (band: "6-7" | "8-9" | "10-12", mean: number, ratings = 4, trainers = 2) => ({ band, mean, ratings, trainers });
const ep = (code: string, x: Partial<ExercisePattern>): ExercisePattern => ({ code, score: 2.2, ratings: 6, trend: "", patterns: [], bands: [], ...x });

const bank = [ex("rondo"), ex("kaos"), ex("stafett"), ex("arkivert", { status: "archived" })];
const patterns = [
  // Good for 10–12, poor for 8–9.
  ep("rondo", { bands: [score("10-12", 2.8), score("8-9", 1.5)] }),
  // Good for 8–9, but too few ratings to say.
  ep("kaos", { bands: [score("8-9", 3, 2)], patterns: [pat({ context: "for 6–7 år", band: "6-7" }), pat({ kind: "uklar", part: "gjennomforing", suggestions: ["vis det først"] })] }),
  ep("stafett", { bands: [score("8-9", 2.6, 5, 3)], trend: "byttes_ut" }),
  ep("arkivert", { bands: [score("8-9", 3, 9, 4)] }),
];

describe("experiences for the order", () => {
  it("uses only what holds for the team's age band, with the numbers behind it", () => {
    const t = lessonsText({ band: "8-9", bank, patterns, needs: [{ band: "8-9", need: "mindre_ko", sources: 4, trainers: 3, groups: 2 }] });
    expect(t).toContain("# Erfaringer fra lignende økter (8–9 år)");
    expect(t).toContain("## Fungerer godt for 8–9 år\n\n- stafett (STAFETT): snitt 2,6/3 (5 vurderinger, 3 trenere)");
    expect(t).toContain("## Fungerer dårlig for 8–9 år");
    expect(t).toContain("- rondo (RONDO): snitt 1,5/3");
    // Too few ratings, archived, or another band's problem: not used.
    expect(t).not.toMatch(/kaos \(KAOS\): snitt|arkivert|mye venting/);
    expect(t).toContain("- kaos (KAOS): uklar forklaring (del: gjennomforing), 3 økter, 2 trenere; trenerne foreslår «vis det først»");
    expect(t).toContain("- stafett (STAFETT): trenerne bytter den ofte ut etter KI-opplegg");
    expect(t).toContain("- mindre kø og venting (4 ganger, 3 trenere)");

    // The same data for 10–12 says the opposite about rondo, and nothing about 8–9.
    const older = lessonsText({ band: "10-12", bank, patterns, needs: [{ band: "8-9", need: "mindre_ko", sources: 4, trainers: 3, groups: 2 }] });
    expect(older).toContain("- rondo (RONDO): snitt 2,8/3");
    expect(older).not.toMatch(/stafett \(STAFETT\): snitt|mindre kø|8–9/);
    // Without a band, nothing.
    expect(lessonsText({ band: null, bank, patterns, needs: [] })).toBe("");
  });

  it("shares needs from other groups only when two groups are behind them", () => {
    const r = (x: Partial<NeedRow>): NeedRow => ({ need: "mindre_ko", band: "8-9", source: "opplegg:1", author: "A", groupId: "G1", ...x });
    const t = { minSessions: 3, minTrainers: 2 };
    // Another group's need alone is not used; the team's own is.
    const other = [1, 2, 3].map((n) => r({ need: "lite_utstyr", source: `opplegg:${n}`, author: `B${n}`, groupId: "G2" }));
    const own = [4, 5, 6].map((n) => r({ need: "mer_1mot1", source: `opplegg:${n}`, author: `A${n}` }));
    const both = [7, 8, 9].map((n) => r({ source: `opplegg:${n}`, author: `C${n}`, groupId: n === 7 ? "G2" : "G1" }));
    expect(needsFor([...other, ...own, ...both], "G1", "8-9", t).map((x) => [x.need, x.groups])).toEqual([
      ["mer_1mot1", 1],
      ["mindre_ko", 2],
    ]);
    expect(needsFor([...other, ...own], "G1", "10-12", t)).toEqual([]);
  });

  it("puts what fits the band and the group size first, and rates it for the band", () => {
    const b = [ex("a-stor", { min_players: 10, max_players: 20 }), ex("b-band", { bands: ["8-9"], fb_n: 0, fb_mean: null }), ex("c-passer"), ex("stafett")];
    const c = catalogue(b, "", 30, { band: "8-9", players: 6, patterns });
    const order = [...c.matchAll(/^- ([a-z-]+) \|/gm)].map((m) => m[1]);
    expect(order).toEqual(["b-band", "c-passer", "stafett", "a-stor"]);
    expect(c).toContain("snitt 8–9 år 2,6/3 (5)");
    expect(c).toContain("c-passer | C-PASSER | pasning_mottak | 4–8 spillere | 12 min | snitt 2,2/3 (6)");
    expect(playersPerGroup(14, [5, 5, 4])).toBe(5);
    expect(playersPerGroup(14, [])).toBe(14);
    expect(playersPerGroup(0, [])).toBeNull();
  });
});

describe("a KI order with experiences", () => {
  let d: Db;
  const me: Access = { profileId: "P-ANN", groupIds: new Set(["G1"]) };
  const user = { access: me } as CurrentUser;
  const group = { id: "G1" } as Group;
  const order = {
    sub: "",
    start: null,
    minutes: 60,
    theme: "Samhandling",
    themeDescription: "",
    team: { age_group: "G9", pitch: "", equipment: "", principles: "" },
    nPlayers: 12,
    groupSizes: [6, 6],
    wish: "",
    maxNew: 2,
    links: [],
    names: [],
  };

  beforeAll(async () => {
    process.env.AI_MOCK = "true";
    d = await testDb();
    const plan = validatePlan(reference);
    await savePlanExercise(d, me, "G1", plan.ovelser[0], ["Samhandling"], "manual");
    const code = (await listExercises(d, me, "G1"))[0].code;
    await savePatterns(d, [ep(code, { bands: [score("8-9", 2.9, 4, 3)] })]);
  });
  afterAll(async () => d.close());

  it("sends the band's experiences with a plan and with one exercise, and none without a band", async () => {
    const withBand = await prepareKi(d, user, { ai: true } as CurrentUser["rights"], group, { ...order, band: "8-9" });
    expect(withBand.call.system[1]).toContain("# Erfaringer fra lignende økter (8–9 år)");
    expect(withBand.call.system[1]).toMatch(/Fungerer godt for 8–9 år\n\n- .+: snitt 2,9\/3 \(4 vurderinger, 3 trenere\)/);
    expect(withBand.call.system[0]).toContain("# Erfaringer fra lignende økter");
    const without = await prepareKi(d, user, { ai: true } as CurrentUser["rights"], group, { ...order, band: null });
    expect(without.call.system[1]).not.toContain("Erfaringer fra lignende økter");
    const one = await prepareExerciseKi(d, user, { ai: true }, group, { sub: "", theme: "Samhandling", themeDescription: "", team: order.team, players: 6, minutes: 12, category: "", wish: "", links: [], names: [], band: "8-9" });
    expect(one.call.system[1]).toContain("Fungerer godt for 8–9 år");
  });
});

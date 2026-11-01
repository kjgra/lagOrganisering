import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lessonsText } from "@/lib/ai/lessons";
import { prepareKi } from "@/lib/ai/service";
import type { CurrentUser } from "@/lib/auth/current";
import type { Db } from "@/lib/db";
import { analyseBank } from "@/lib/observe";
import { insightsFor, sessionInsights, structureLabel, type Insight, type SessionRow } from "@/lib/plans/insights";
import { validatePlan, type BankExercise } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import type { Access } from "@/lib/store/access";
import { bandInsights } from "@/lib/store/insights";
import { listExercises, saveFeedback, savePlan, savePlanExercise, saveTeamSettings } from "@/lib/store/training";
import type { Group } from "@/lib/spond/types";
import { testDb } from "../helpers/db";

const t = { minSessions: 3, minTrainers: 2 };
const row = (planId: number, author: string, rating: number, x: Partial<SessionRow> = {}): SessionRow => ({
  planId,
  groupId: "G1",
  author,
  rating,
  tags: [],
  band: "8-9",
  codes: ["rondo", "kaos", "spill"],
  rotation: false,
  ...x,
});

describe("patterns for whole sessions", () => {
  it("finds combinations, order and structure over the thresholds, per age band", () => {
    const rows = [
      row(1, "A", 3, { tags: ["god_flyt"] }),
      // Two trainers rating the same session count as one session.
      row(1, "B", 3, { tags: ["god_flyt"] }),
      row(2, "A", 2),
      row(3, "C", 3, { groupId: "G2", tags: ["god_flyt"] }),
      // The same exercises for 10–12 say nothing about 8–9.
      row(4, "D", 1, { band: "10-12" }),
      // Without a band: left out.
      row(5, "E", 1, { band: null }),
    ];
    const found = sessionInsights(rows, t);
    expect(found.map((i) => [i.kind, i.key])).toEqual([
      ["kombinasjon", "kaos+rondo"],
      ["kombinasjon", "kaos+spill"],
      ["kombinasjon", "rondo+spill"],
      ["progresjon", "kaos>spill"],
      ["progresjon", "rondo>kaos"],
      ["struktur", "3:samlet"],
    ]);
    expect(found[0]).toEqual({
      kind: "kombinasjon",
      band: "8-9",
      key: "kaos+rondo",
      codes: ["kaos", "rondo"],
      sessions: 3,
      trainers: 3,
      groups: 2,
      mean: 2.75,
      tags: ["god_flyt"],
    });
    // Two sessions are not enough.
    expect(sessionInsights(rows.slice(0, 3), t)).toEqual([]);
  });

  it("learns order only from sessions without rotation", () => {
    const rows = [1, 2, 3].map((n) => row(n, `T${n}`, 3, { rotation: true }));
    const found = sessionInsights(rows, t);
    expect(found.some((i) => i.kind === "progresjon")).toBe(false);
    expect(found.find((i) => i.kind === "struktur")!.key).toBe("3:rotasjon");
    expect(structureLabel("3:rotasjon")).toBe("3 øvelser på stasjoner med rotasjon");
    expect(structureLabel("1:samlet")).toBe("1 øvelse med alle samlet");
  });

  it("shares other groups' patterns only when two groups are behind them", () => {
    const i = (key: string, groups: number, band: "8-9" | "10-12" = "8-9"): Insight => ({
      kind: "kombinasjon",
      band,
      key,
      codes: key.split("+"),
      sessions: 3,
      trainers: 2,
      groups,
      mean: 2.6,
      tags: [],
    });
    expect(insightsFor([i("a+b", 2), i("c+d", 1), i("e+f", 3, "10-12")], [i("c+d", 1), i("g+h", 1)], "8-9").map((x) => x.key)).toEqual(["a+b", "c+d", "g+h"]);
    expect(insightsFor([i("a+b", 2)], [], null)).toEqual([]);
  });

  it("tells KI about them for the band, only for live exercises, with the numbers", () => {
    const ex = (code: string): BankExercise => ({ code, name: code.toUpperCase(), status: "active" }) as BankExercise;
    const bank = [ex("rondo"), ex("kaos"), ex("spill")];
    const i = (kind: Insight["kind"], key: string, mean: number, tags: string[] = []): Insight => ({
      kind,
      band: "8-9",
      key,
      codes: kind === "struktur" ? [] : key.split(/[+>]/),
      sessions: 4,
      trainers: 3,
      groups: 2,
      mean,
      tags,
    });
    const text = lessonsText({
      band: "8-9",
      bank,
      patterns: [],
      needs: [],
      insights: [
        i("kombinasjon", "kaos+rondo", 2.8, ["god_flyt"]),
        i("kombinasjon", "rondo+spill", 1.5),
        i("kombinasjon", "gammel+rondo", 3),
        i("progresjon", "rondo>kaos", 2.6),
        i("struktur", "3:samlet", 2.5),
        i("struktur", "5:rotasjon", 1.4),
      ],
    });
    expect(text).toContain(
      "## Øvelser som fungerer sammen\n\n- kaos (KAOS) + rondo (RONDO): snitt 2,8/3 for økta (4 økter, 3 trenere); ofte «god flyt mellom øvelsene»",
    );
    expect(text).toContain("- Unngå rondo (RONDO) + spill (SPILL) i samme økt: snitt 1,5/3");
    expect(text).not.toContain("gammel");
    expect(text).toContain("## Rekkefølge som fungerer (økter der alle gjør det samme)\n\n- rondo (RONDO) før kaos (KAOS): snitt 2,6/3");
    expect(text).toContain("## Oppbygging av økta\n\n- 3 øvelser med alle samlet: snitt 2,5/3");
    expect(text).toContain("- Fungerer dårlig: 5 øvelser på stasjoner med rotasjon: snitt 1,4/3");
    // Nothing for another band.
    expect(lessonsText({ band: "10-12", bank, patterns: [], needs: [], insights: [i("kombinasjon", "kaos+rondo", 2.8)] })).toBe("");
  });
});

describe("session patterns at night and in the KI order", () => {
  let d: Db;
  const base = validatePlan(reference);
  // Everyone does the exercises one after another (one group), so the order counts.
  const plan = { ...base, tidsplan: { ...base.tidsplan, stasjoner: { ...base.tidsplan.stasjoner, grupper: 1 } } };
  const codes = plan.ovelser.map((e) => e.kode);
  const session = (rating: number, tags: string[] = []) => ({
    exercise_no: null,
    exercise_code: "",
    rating,
    tags,
    actual_minutes: null,
    actual_players: 12,
    body: "",
    use_again: "",
  });

  beforeAll(async () => {
    process.env.AI_MOCK = "true";
    d = await testDb();
  });
  afterAll(async () => d.close());

  it("counts the rated sessions per band, for every team and per group, and sends them with the order", async () => {
    const a: Access = { profileId: "P-ANN", groupIds: new Set(["G1"]) };
    const b: Access = { profileId: "P-BO", groupIds: new Set(["G1"]) };
    const c: Access = { profileId: "P-CARL", groupIds: new Set(["G2"]) };
    await saveTeamSettings(d, a, "G1", "", { birth_year: 2017 });
    // The plan's exercises are in the bank, so KI may be told about them.
    for (const e of plan.ovelser) await savePlanExercise(d, a, "G1", e, ["Samhandling"], "manual").catch(() => null);
    const live = new Set((await listExercises(d, a, "G1")).map((e) => e.code));
    await saveTeamSettings(d, c, "G2", "", { birth_year: 2017 });
    for (const [who, group, event] of [
      [a, "G1", "E1"],
      [b, "G1", "E2"],
      [c, "G2", "E3"],
    ] as const) {
      const p = await savePlan(d, who, group, event, plan);
      await saveFeedback(d, who, p.id, [session(3, ["god_progresjon"])], 12);
    }
    const r = await analyseBank(d);
    expect(r.insights).toBeGreaterThan(0);
    const band = (await d.query<{ band: string }>("SELECT DISTINCT band FROM learning_insights"))[0].band as "8-9" | "10-12";
    const { shared, own } = await bandInsights(d, "G1", band);
    // Every team together: three sessions, three trainers, two groups.
    expect(shared.find((i) => i.kind === "kombinasjon")).toMatchObject({ sessions: 3, trainers: 3, groups: 2, mean: 3, tags: ["god_progresjon"] });
    expect(shared.some((i) => i.kind === "progresjon" && i.key === `${codes[0]}>${codes[1]}`)).toBe(true);
    // G1 alone has two sessions: below the threshold.
    expect(own).toEqual([]);
    // No text from the trainers is stored.
    expect(JSON.stringify(await d.query("SELECT * FROM learning_insights"))).not.toMatch(/P-ANN|P-BO/);

    const user = { access: a } as CurrentUser;
    const order = {
      sub: "",
      start: null,
      minutes: 60,
      theme: "Samhandling",
      themeDescription: "",
      team: { age_group: "G9", pitch: "", equipment: "", principles: "" },
      nPlayers: 12,
      groupSizes: [],
      wish: "",
      maxNew: 2,
      links: [],
      names: [],
      band,
    };
    const prep = await prepareKi(d, user, { ai: true } as CurrentUser["rights"], { id: "G1" } as Group, order);
    const pair = shared.find((i) => i.kind === "kombinasjon" && i.codes.every((x) => live.has(x)));
    expect(pair).toBeDefined();
    expect(prep.call.system[1]).toContain("## Øvelser som fungerer sammen");
    expect(prep.call.system[1]).toContain("snitt 3,0/3 for økta (3 økter, 3 trenere); ofte «god progresjon»");
    // Another band gets none of it.
    const other = await prepareKi(d, user, { ai: true } as CurrentUser["rights"], { id: "G1" } as Group, { ...order, band: band === "8-9" ? "10-12" : "8-9" });
    expect(other.call.system[1]).not.toContain("Øvelser som fungerer sammen");
  });
});

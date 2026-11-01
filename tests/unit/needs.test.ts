import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NEEDS_SCHEMA, needsFromAnswer, needsText } from "@/lib/ai/needs-ai";
import type { Db } from "@/lib/db";
import { analyseBank } from "@/lib/observe";
import { needPatterns, type NeedRow } from "@/lib/plans/needs";
import { validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import type { Access } from "@/lib/store/access";
import { needRows, unclassifiedNeeds } from "@/lib/store/needs";
import { addPlanComment, savePlan, saveTeamSettings } from "@/lib/store/training";
import { testDb } from "../helpers/db";

const row = (x: Partial<NeedRow>): NeedRow => ({ need: "mindre_ko", band: "8-9", source: "opplegg:1", author: "A", groupId: "G1", ...x });

describe("needs from the trainers' wishes", () => {
  it("is a pattern only with enough wishes and trainers, per age band", () => {
    const t = { minSessions: 3, minTrainers: 2 };
    const rows = [
      row({ source: "opplegg:1", author: "A" }),
      row({ source: "opplegg:2", author: "A" }),
      row({ source: "kommentar:1", author: "B", groupId: "G2" }),
      // The same need for another age band does not count for 8–9.
      row({ source: "opplegg:3", author: "C", band: "10-12" }),
      // One trainer saying it many times is not a pattern.
      ...[4, 5, 6].map((n) => row({ need: "lite_utstyr", source: `opplegg:${n}`, author: "A" })),
      // Without a band, and «annet», is never a pattern.
      ...[7, 8, 9].map((n) => row({ need: "mer_1mot1", source: `opplegg:${n}`, author: `T${n}`, band: null })),
      ...[7, 8, 9].map((n) => row({ need: "annet", source: `opplegg:${n}`, author: `T${n}` })),
    ];
    expect(needPatterns(rows, t)).toEqual([{ band: "8-9", need: "mindre_ko", sources: 3, trainers: 2, groups: 2 }]);
    // One wish counts once, even when two needs are found in it.
    expect(needPatterns([row({}), row({}), row({ author: "B" })], t)).toEqual([]);
  });

  it("keeps only known needs and ids from KI's answer", () => {
    expect(NEEDS_SCHEMA.properties.tekster.items.properties.behov.items.enum).toContain("faerre_per_gruppe");
    expect(needsText([{ id: "opplegg:1", text: " Det blir\nfor mye kø " }])).toContain("- id opplegg:1\n  Tekst: Det blir for mye kø");
    const found = needsFromAnswer(
      JSON.stringify({ tekster: [{ id: "opplegg:1", behov: ["mindre_ko", "ukjent", "mindre_ko"] }, { id: "opplegg:9", behov: ["enklere"] }] }),
      ["opplegg:1", "kommentar:2"],
    );
    expect([...found]).toEqual([
      ["opplegg:1", ["mindre_ko"]],
      ["kommentar:2", []],
    ]);
    expect(() => needsFromAnswer("ikke json", [])).toThrow(/JSON/);
  });
});

describe("classifying wishes at night", () => {
  let d: Db;
  const me: Access = { profileId: "P-ANN", groupIds: new Set(["G1"]) };
  const plan = validatePlan(reference);
  const ctx = (wish: string) => ({ kind: "draft", band: "8-9", players: 14, groups: [7, 7], minutes: 60, coaches: 2, theme: "Samhandling", wish, comments: [], links: 0 });

  beforeAll(async () => {
    process.env.AI_MOCK = "true";
    d = await testDb();
  });
  afterAll(async () => d.close());

  it("turns wishes and comments into needs once, with the age band, and never stores the text", async () => {
    await saveTeamSettings(d, me, "G1", "", { birth_year: 2016 });
    const a = await savePlan(d, me, "G1", "E1", plan, { source: "ai", context: ctx("Det blir for mye kø, og vi har ingen kjegler") });
    await savePlan(d, me, "G1", "E2", plan, { source: "ai", context: ctx("") });
    // A plan made by hand has no wish to classify.
    const manual = await savePlan(d, me, "G1", "E3", plan);
    await addPlanComment(d, me, manual.id, "Vi vil ha mer 1 mot 1", null);
    expect((await unclassifiedNeeds(d, 10)).map((x) => x.id)).toEqual([`opplegg:${a.id}`, "opplegg:" + (a.id + 1), expect.stringMatching(/^kommentar:/)]);

    const r = await analyseBank(d);
    expect(r).toMatchObject({ wishes: 2, needs: 3 });
    const rows = await needRows(d);
    expect(rows.map((x) => [x.source.split(":")[0], x.need, x.band]).sort()).toEqual([
      ["kommentar", "mer_1mot1", expect.any(String)],
      ["opplegg", "lite_utstyr", "8-9"],
      ["opplegg", "mindre_ko", "8-9"],
    ]);
    // The comment gets the band of the group's birth year when the plan has none.
    expect(rows.find((x) => x.need === "mer_1mot1")!.band).toMatch(/^(8-9|10-12)$/);
    expect(await unclassifiedNeeds(d, 10)).toEqual([]);
    expect((await analyseBank(d)).wishes).toBe(0);
    const stored = JSON.stringify(await d.query("SELECT * FROM ki_needs"));
    expect(stored).not.toMatch(/kjegler|kø/);
  });
});

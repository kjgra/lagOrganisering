import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CallInput } from "@/lib/ai/client";
import { drawingFeedbackText, drawingProblems } from "@/lib/ai/plan-ai";
import { validateDrawing } from "@/lib/plans/drawing";

const calls: CallInput[] = [];
const answers: string[] = [];
vi.mock("@/lib/ai/client", () => ({
  callClaude: async (c: CallInput) => {
    calls.push(structuredClone(c));
    const text = answers.shift() ?? answers[0];
    return { ok: true, text, usage: { input_tokens: 10, output_tokens: 10, cache_read_tokens: 0, cache_write_tokens: 0 }, errorCode: "", message: "", durationMs: 1 };
  },
  countTokens: async () => 10,
}));

const { prepareExerciseKi, runExerciseKi } = await import("@/lib/ai/service");
const { testDb } = await import("../helpers/db");
const { seedDemo } = await import("@/lib/demo/seed");

const sketch = (passFrom: [number, number]) => ({
  tittel: "A",
  bane: { bredde: 12, lengde: 12 },
  objekter: [
    { type: "spiller", lag: "1", x: 3, y: 3, tekst: "A" },
    { type: "ball", x: 3, y: 4 },
    { type: "spiller", lag: "1", x: 9, y: 9, tekst: "B" },
  ],
  // From far away from the ball, nothing can play this pass.
  piler: [{ type: "pasning", fra: passFrom, til: [9, 8.2], trinn: 1 }],
  trinnliste: [{ tekst: "A spiller til B" }],
});
const answer = (passFrom: [number, number]) =>
  JSON.stringify({
    kilde: "ny",
    kode: "retry-test",
    navn: `Prøv igjen ${passFrom.join("-")}`,
    kategori: "pasning_mottak",
    fokus: "Pasning",
    organisering: ["To spillere"],
    gjennomforing: ["A spiller til B"],
    tilpasning: ["Flere par"],
    laeringsmomenter: ["Se opp"],
    sporsmal: ["«Hvor er B?»"],
    enklere: "",
    vanskeligere: "",
    tegning_json: JSON.stringify({ skisser: [sketch(passFrom)] }),
    min_spillere: 2,
    maks_spillere: 8,
    minutter: 10,
    omrade: "12 × 12 m",
  });

describe("drawing problems", () => {
  it("lists what is wrong when the drawing is played", () => {
    const tegning = validateDrawing({ skisser: [sketch([6, 1])] });
    expect(drawingProblems({ tegning }, [])).toEqual(["Skisse 1, animasjonen: Pasningen i trinn 1 starter ikke ved ballen."]);
    expect(drawingProblems({ tegning: validateDrawing({ skisser: [sketch([3, 4])] }) }, [])).toEqual([]);
    expect(drawingProblems({ tegning: null }, ["Øvelsen: tegningen kunne ikke brukes (x) og er utelatt.", "Annet"])).toHaveLength(1);
    expect(drawingFeedbackText(["En feil"])).toMatch(/- En feil\n\nRett feilene/);
  });
});

describe("«Juster med KI» fixes its own drawing", () => {
  let d: Awaited<ReturnType<typeof testDb>>;
  const user = { access: { profileId: "P-ANN", groupIds: new Set(["G-FOTBALL"]) } } as never;
  const run = async () => {
    const prep = await prepareExerciseKi(d, user, { ai: true }, { id: "G-FOTBALL" } as never, {
      sub: "",
      theme: "Samhandling",
      themeDescription: "",
      team: { age_group: "G9", pitch: "", equipment: "", principles: "" },
      players: 8,
      minutes: 12,
      category: "",
      wish: "",
      links: [],
      names: [],
      band: "8-9",
    } as never);
    return runExerciseKi(d, user, prep);
  };

  beforeAll(async () => {
    d = await testDb();
    await seedDemo(d);
  });
  afterAll(async () => d.close());

  it("sends the problems back and uses the fixed answer", async () => {
    calls.length = 0;
    answers.push(answer([6, 1]), answer([3, 4]));
    const r = await run();
    expect(calls).toHaveLength(2);
    expect(calls[0].followUps).toEqual([]);
    expect(calls[1].followUps?.[0].feedback).toMatch(/starter ikke ved ballen/);
    expect(r.warnings.join(" ")).not.toMatch(/animasjonen/);
  });

  it("stops after two tries and keeps the last answer", async () => {
    calls.length = 0;
    answers.length = 0;
    answers.push(answer([6, 2]), answer([6, 2]), answer([6, 2]));
    await run().catch(() => null);
    expect(calls).toHaveLength(3);
    expect(calls[2].followUps).toHaveLength(2);
  });
});

import { describe, expect, it } from "vitest";
import ref from "@/lib/plans/reference-plan.json";
import { answerFromPlan, catalogue, orderText, planFromAnswer, revisionText, PLAN_SCHEMA, aiCost, formatNok, budgetCheck, DEFAULT_AI_SETTINGS } from "@/lib/ai/plan-ai";
import { extractText, parseLinks } from "@/lib/ai/links";
import { validatePlan, type BankExercise } from "@/lib/plans/plan";

const plan = validatePlan(ref);
const order = {
  start: "2026-10-15T15:30:00Z",
  minutes: 65,
  theme: "Samhandling",
  themeDescription: "",
  team: { age_group: "G10", pitch: "", equipment: "", principles: "" },
  nPlayers: 14,
  groupSizes: [5, 5, 4],
  wish: "",
  maxNew: 2,
  links: [],
  names: ["Emil Haugen", "Emil"],
};

const bankRow = (code: string, extra: Partial<BankExercise> = {}): BankExercise => ({
  id: 1, code, name: "Rondo", category: "pasning_mottak", themes: ["Samhandling"], min_players: 4, max_players: 8, duration_minutes: 12,
  area: "", organisation: "4 mot 1 i rute", execution: "Hold ballen", learning_points: "Se opp\nVær spillbar", questions: "", easier: "", harder: "", nff_url: "",
  drawing: null, source: "manual", based_on: "", status: "active", updated_at: new Date(),
  fb_n: 0, fb_sessions: 0, fb_good: 0, fb_ok: 0, fb_bad: 0, fb_yes: 0, fb_changes: 0, fb_no: 0, fb_mean: null, fb_minutes: null, fb_last: null, fb_tags: {}, ...extra,
});

describe("KI order", () => {
  it("contains counts and the theme, never names", () => {
    const t = orderText(order);
    expect(t).toContain("Påmeldte spillere: 14");
    expect(t).toContain("3 (5, 5, 4 spillere)");
    expect(t).toContain("torsdag 15. oktober 2026 kl. 17:30");
    expect(t).not.toContain("Bane:");
    expect(orderText({ ...order, team: { ...order.team, pitch: "Nymark Kunstgress 04 7er A (7er · 48 × 30 m · lys 150 lux)" } })).toContain(
      "- Bane: Nymark Kunstgress 04 7er A (7er · 48 × 30 m · lys 150 lux)",
    );
    expect(() => orderText({ ...order, wish: "Emil må stå i mål" })).toThrow(/Emil/);
    expect(() => orderText({ ...order, wish: "Noen har astma" })).toThrow(/helse/);
  });
  it("needs something to change when adjusting", () => {
    expect(() => revisionText(plan, order)).toThrow(/Skriv hva/);
    expect(revisionText(plan, { ...order, wish: "Kortere økt" })).toContain("# Endringsønske\n\nKortere økt");
  });
  it("lists the bank and leaves out badly rated exercises", () => {
    const c = catalogue([bankRow("rondo"), bankRow("kjedelig", { name: "Kø", fb_n: 3, fb_mean: 1.3 })], "Samhandling");
    expect(c).toContain("rondo | Rondo");
    expect(c).not.toContain("kjedelig");
  });
});

describe("KI answer", () => {
  it("turns an answer into a plan, using the bank and renaming clashing codes", () => {
    const a = answerFromPlan(plan);
    a.ovelser[0] = { ...a.ovelser[0], kilde: "bank", kode: "rondo" };
    a.ovelser[1] = { ...a.ovelser[1], kode: "rondo" };
    const r = planFromAnswer(JSON.stringify(a), [bankRow("rondo")], { theme: "Samhandling", minutes: 65, maxNew: 2, linkUrls: [] });
    expect(r.plan.ovelser[0].navn).toBe("Rondo");
    expect(r.plan.ovelser[0].laeringsmomenter).toEqual(["Se opp", "Vær spillbar"]);
    expect(r.plan.ovelser[1].kode).not.toBe("rondo");
    expect(r.plan.tema).toBe("Samhandling");
  });
  it("keeps «uendret» exercises from the plan being adjusted and drops bad drawings with a warning", () => {
    const a = answerFromPlan(plan);
    a.ovelser[0] = { ...a.ovelser[0], kilde: "uendret", navn: "", tegning_json: "" };
    a.ovelser[1] = { ...a.ovelser[1], tegning_json: "{ikke json" };
    const r = planFromAnswer(JSON.stringify(a), [], { theme: "", minutes: null, maxNew: 6, linkUrls: [], base: plan });
    expect(r.plan.ovelser[0]).toEqual(plan.ovelser[0]);
    expect(r.plan.ovelser[1].tegning).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/tegningen kunne ikke brukes/);
  });
  it("has a schema where every property is required", () => {
    expect(PLAN_SCHEMA.required).toContain("ovelser");
  });
});

describe("money", () => {
  it("prices calls and checks the budget", () => {
    expect(aiCost({ input_tokens: 1e6, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 }, "claude-haiku-5-5")).toBeCloseTo(0.1);
    expect(formatNok(0.004, 10)).toBe("ca. 4 øre");
    expect(formatNok(0.12, 10)).toBe("ca. 1,20 kr");
    expect(budgetCheck({ group_usd: 3.5, total_usd: 4 }, DEFAULT_AI_SETTINGS).ok).toBe(false);
  });
});

describe("links", () => {
  it("only allows https on approved sites", () => {
    expect(parseLinks("https://tiim.no/ovelse/1 https://www.tiim.no/x", ["tiim.no"])).toHaveLength(2);
    expect(() => parseLinks("http://tiim.no/a", ["tiim.no"])).toThrow(/https/);
    expect(() => parseLinks("https://evil.no/a", ["tiim.no"])).toThrow(/bare hente/);
  });
  it("extracts the exercise text without menus and scripts", () => {
    const html = `<html><head><title>T</title><script>alert(1)</script></head><body><nav>Meny</nav><main><h1>Rondo</h1><p>Fire spillere holder ballen.</p><ul><li>Se opp</li></ul></main><footer>Bunn</footer></body></html>`;
    const r = extractText(html);
    expect(r.title).toBe("Rondo");
    expect(r.text).toContain("Fire spillere holder ballen.");
    expect(r.text).toContain("- Se opp");
    expect(r.text).not.toContain("Meny");
    expect(r.text).not.toContain("alert");
  });
});

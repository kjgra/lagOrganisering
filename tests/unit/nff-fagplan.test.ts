import { describe, expect, it } from "vitest";
import ref from "@/lib/plans/reference-plan.json";
import { answerFromPlan, catalogue, exerciseFromAnswer, fagplanText, EXERCISE_SCHEMA } from "@/lib/ai/plan-ai";
import { BAND_KEYS, HOVEDTEMA, LEARNING_POINTS, learningPoint, matchHovedtema, nffSummary, tagLabel } from "@/lib/nff/fagplan";
import { validateNff, validatePlan, type BankExercise } from "@/lib/plans/plan";

describe("NFF fagplan catalog", () => {
  it("has unique learning point ids for every band, hovedtema and role", () => {
    const ids = LEARNING_POINTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of BAND_KEYS) {
      for (const t of HOVEDTEMA.filter((h) => h.bands.includes(b))) {
        expect(LEARNING_POINTS.some((p) => p.band === b && p.topic === t.key), `${b} ${t.key}`).toBe(true);
      }
    }
    expect(learningPoint("lm.8-9.spille-framover.ballforer.1")?.text).toBe("Være spillbar – ut av pasningsskygge.");
    expect(tagLabel("delf.mottak")).toBe("Medtak/mottak");
    expect(tagLabel("tema.borte")).toBeUndefined();
  });
  it("matches a free-text theme to a hovedtema in the band", () => {
    expect(matchHovedtema("Spille oss fremover i banen", "10-12")?.key).toBe("spille-framover");
    expect(matchHovedtema("Komme til avslutning", "8-9")?.key).toBe("komme-til-avslutning");
    expect(matchHovedtema("Score mål", "6-7")?.key).toBe("score-mal");
    expect(matchHovedtema("Samhandling", "10-12")).toBeUndefined();
  });
  it("cleans tags: unknown dropped, learning points only for chosen bands", () => {
    expect(validateNff({ bands: ["10-12", "6-7"], nff_activity: "spill", nff_tags: ["delf.skudd", "lm.8-9.skudd.1", "lm.6-7.skudd.1", "x", "delf.skudd"] })).toEqual({
      bands: ["6-7", "10-12"],
      nff_activity: "spill",
      nff_tags: ["delf.skudd", "lm.6-7.skudd.1"],
    });
    expect(() => validateNff({ bands: ["5-6"] })).toThrow(/aldersbånd/);
    expect(nffSummary({ bands: ["8-9", "10-12"], nff_activity: "med-og-mot", nff_tags: ["tema.vinne-ball"] })).toBe(
      "8–9, 10–12 år · Spille med og mot · Vinne ball, hindre motstander å spille forbi oss",
    );
  });
});

describe("NFF fagplan for KI", () => {
  it("gives the band's hovedtema, activity shares and the theme's learning points", () => {
    const t = fagplanText("10-12", "Spille oss framover i banen");
    expect(t).toContain("# NFFs fagplan for laget (10-12 år)");
    expect(t).toContain("Spill / smålagsspill (spill, 30–50 %)");
    expect(t).toContain("### Resten av laget");
    expect(t).toContain("Gjøre oss store sammen i bredde og dybde.");
    expect(fagplanText("10-12", "Samhandling")).not.toContain("## Læringsmomenter");
    expect(fagplanText(null, "x")).toBe("");
  });
  it("shows tags in the catalogue and keeps them on new exercises and in plans", () => {
    const plan = validatePlan(ref);
    const row = { code: "rondo", name: "Rondo", category: "pasning_mottak", themes: [], status: "active", bands: ["8-9"], nff_activity: "spill", nff_tags: ["tema.spille-framover", "lm.8-9.pasning.1"] };
    expect(catalogue([{ ...row, fb_n: 0, fb_tags: {}, execution: "", organisation: "" } as unknown as BankExercise])).toContain(
      "NFF 8-9 år, Spill / smålagsspill, tema.spille-framover",
    );
    const e = { ...answerFromPlan(plan).ovelser[0], kilde: "ny", kode: "ny-nff", aktivitet: "med-og-mot", nff_tags: ["tema.vinne-ball", "delf.press", "tema.borte"] };
    const r = exerciseFromAnswer(JSON.stringify(e), [], { linkUrls: [] });
    expect(r.exercise).toMatchObject({ aktivitet: "med-og-mot", nff_tags: ["tema.vinne-ball", "delf.press"] });
    expect(validatePlan({ ...plan, ovelser: [r.exercise, ...plan.ovelser.slice(1)] }).ovelser[0]).toMatchObject({ aktivitet: "med-og-mot", nff_tags: ["tema.vinne-ball", "delf.press"] });
    expect(EXERCISE_SCHEMA.required).toEqual(expect.arrayContaining(["aktivitet", "nff_tags"]));
  });
});

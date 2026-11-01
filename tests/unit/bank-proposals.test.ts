import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { HOVEDTEMA } from "@/lib/nff/fagplan";
import { analyseBank } from "@/lib/observe";
import { bankGaps, bankOverlaps, emptyValues, fillMissing, gapCode, gapReason, metadataReason, missingFields, overlapReason } from "@/lib/plans/bank-proposals";
import { exerciseInputFrom, exerciseValues, type ExerciseValues } from "@/lib/plans/exercise-values";
import type { ExercisePattern } from "@/lib/plans/observations";
import type { BankExercise } from "@/lib/plans/plan";
import type { Access } from "@/lib/store/access";
import { listProposals } from "@/lib/store/improvements";
import { getExercise, listExercises, saveBankFeedback, saveExercise } from "@/lib/store/training";
import { testDb } from "../helpers/db";

let n = 0;
const ex = (x: Partial<BankExercise> = {}): BankExercise =>
  ({
    id: ++n,
    code: `ov-${n}`,
    name: `Øvelse ${n}`,
    category: "annet",
    themes: [],
    min_players: 6,
    max_players: 12,
    duration_minutes: 15,
    area: "20 × 20 m",
    organisation: `Organisering ${n} ${"abcdefghij"[n % 10]}${n}`,
    execution: `Gjennomføring nummer ${n} med egen tekst ${n * 7}`,
    learning_points: "",
    questions: "",
    easier: "",
    harder: "",
    nff_url: "",
    drawing: null,
    source: "manual",
    based_on: "",
    status: "active",
    updated_at: new Date(),
    bands: ["8-9"],
    nff_activity: "sjef-intro",
    nff_tags: ["tema.spille-framover"],
    fb_n: 0,
    ...x,
  }) as BankExercise;
const pat = (code: string, score: number, ratings = 5, bands: ExercisePattern["bands"] = []): ExercisePattern => ({ code, score, ratings, trend: "", patterns: [], bands });

describe("gaps in the bank", () => {
  const tagged = Array.from({ length: 10 }, () => ex());

  it("finds main themes for the bands in use with too few good exercises, the emptiest first", () => {
    const vinne = [ex({ nff_tags: ["tema.vinne-ball"] }), ex({ nff_tags: ["tema.vinne-ball"], bands: [] }), ex({ nff_tags: ["tema.vinne-ball"], bands: ["10-12"] })];
    const gaps = bankGaps([...tagged, ...vinne], [], ["8-9"]);
    // 8–9 has four main themes; «Spille framover» has ten.
    expect(gaps.map((g) => [g.tema.key, g.have])).toEqual([
      ["komme-til-avslutning", 0],
      ["hindre-avslutning", 0],
      // One for 8–9 and one with no band: two of three.
      ["vinne-ball", 2],
    ]);
    // Rated poorly, it does not count.
    const poor = bankGaps([...tagged, ...vinne, ex({ nff_tags: ["tema.vinne-ball"], code: "svak" })], [pat("svak", 1.4)], ["8-9"]);
    expect(poor.find((g) => g.tema.key === "vinne-ball")!.have).toBe(2);
    // No band in use, no gaps.
    expect(bankGaps(tagged, [], [])).toEqual([]);
    expect(gapCode(gaps[0])).toBe("ny-8-9-komme-til-avslutning");
    expect(gapReason(gaps[0])).toBe(
      "Banken har ingen gode øvelser for 8–9 år med hovedtemaet «Komme til avslutning, score mål». Lag med 8–9 år bruker appen, så KI foreslår en ny.",
    );
  });

  it("waits until most of the bank is tagged with main themes", () => {
    const untagged = Array.from({ length: 7 }, () => ex({ nff_tags: [] }));
    expect(bankGaps([...tagged, ...untagged], [], ["8-9"])).toEqual([]);
    expect(bankGaps(tagged.slice(0, 9), [], ["8-9"])).toEqual([]);
  });
});

describe("overlapping exercises", () => {
  it("pairs nearly equal exercises and proposes archiving the weaker, never variants of each other", () => {
    const a = ex({ name: "Rondo 4 mot 1" });
    const b = ex({ name: "Rondo 4 mot 1!" });
    const c = ex({ name: "Rondo 4-mot-1", based_on: a.code });
    const d = ex();
    // Unrated: the newer goes.
    expect(bankOverlaps([a, b, c, d], []).map((o) => [o.weaker.code, o.stronger.code, o.score])).toEqual([[b.code, a.code, 1]]);
    // Rated lower: that one goes, even if it is older.
    const o = bankOverlaps([a, b, c, d], [pat(a.code, 1.9, 4), pat(b.code, 2.6, 8)]);
    expect(o.map((x) => x.weaker.code)).toEqual([a.code]);
    expect(overlapReason(o[0], [pat(a.code, 1.9, 4), pat(b.code, 2.6, 8)])).toBe(
      "Øvelsen er 100 % lik «Rondo 4 mot 1!». «Rondo 4 mot 1!» er snitt 2,6 av 3 fra 8 vurderinger, denne er snitt 1,9 av 3 fra 4 vurderinger. To nesten like øvelser gjør banken vanskeligere å bruke, så forslaget er å arkivere denne. De slås ikke sammen.",
    );
    // Archived ones are left alone.
    expect(bankOverlaps([a, { ...b, status: "archived" }], [])).toEqual([]);
  });
});

describe("missing info", () => {
  const base: ExerciseValues = { ...exerciseValues(ex()), min_players: "", duration_minutes: "", nff_tags: ["delf.pasning"], bands: [] };

  it("fills in only what is missing, and the bands only from where it is rated well", () => {
    expect(missingFields(base)).toEqual(["min_players", "duration_minutes", "nff_tags", "bands"]);
    const ki = { ...base, name: "KI endret navnet", min_players: "14", max_players: "4", duration_minutes: "20", nff_tags: ["tema.vinne-ball"] };
    const p = pat("x", 2.4, 9, [
      { band: "8-9", mean: 2.5, ratings: 4, trainers: 2 },
      { band: "6-7", mean: 1.5, ratings: 4, trainers: 2 },
      { band: "10-12", mean: 3, ratings: 2, trainers: 1 },
    ]);
    // KI changes the name and max players too, and asks for more than the max: only the missing go in, kept in order.
    const out = fillMissing(base, ki, missingFields(base), p);
    expect(out).toEqual({ ...base, min_players: "12", duration_minutes: "20", nff_tags: ["delf.pasning", "tema.vinne-ball"], bands: ["8-9"] });
    expect(metadataReason(["min_players", "nff_tags"])).toBe(
      "Øvelsen mangler min. spillere, NFF-tagger. Med dem finner KI og trenerne den lettere for riktig alder og gruppestørrelse. Forslaget fyller bare inn det som mangler.",
    );
    expect(missingFields({ ...emptyValues(), min_players: "4", max_players: "8", duration_minutes: "10", area: "x", nff_activity: "y", nff_tags: ["tema.a"], bands: ["8-9"] })).toEqual([]);
  });
});

describe("proposals for the bank at night", () => {
  let d: Db;
  const ann: Access = { profileId: "P-ANN", groupIds: new Set(["G1"]) };
  const bo: Access = { profileId: "P-BO", groupIds: new Set(["G1"]) };
  const input = (name: string, x: Partial<ExerciseValues> = {}) =>
    exerciseInputFrom({
      ...emptyValues(),
      name,
      category: "annet",
      min_players: "6",
      max_players: "12",
      duration_minutes: "15",
      area: "20 × 20 m",
      organisation: `Oppsett for ${name}: ${name.split("").reverse().join("")}`,
      execution: `Slik gjør vi ${name} ${name.length * 13}`,
      status: "active",
      bands: ["8-9"],
      nff_activity: "sjef-intro",
      nff_tags: ["tema.spille-framover"],
      ...x,
    });

  beforeAll(async () => {
    process.env.AI_MOCK = "true";
    d = await testDb();
  });
  afterAll(async () => d.close());

  it("proposes archiving one of two nearly equal exercises, and fills in what one lacks with KI", async () => {
    const a = await saveExercise(d, ann, "G1", input("Pasningstrekant"), null);
    const b = await saveExercise(d, ann, "G1", input("Firkant med vegg"), null);
    // Made nearly the same afterwards (the form stops it when saving).
    await d.query("UPDATE exercises SET name = 'Pasningstrekant!' WHERE id = $1", [b]);
    const lacking = await saveExercise(d, ann, "G1", input("Kanonball", { min_players: "", duration_minutes: "", nff_activity: "", nff_tags: [] }), null);

    // After an evaluation the analysis leaves the bank alone; the nightly run does it.
    expect((await analyseBank(d)).bankProposed).toBe(0);
    const r = await analyseBank(d, { bank: true });
    expect(r.proposed).toBe(0);
    expect(r.bankProposed).toBe(2);
    const { open } = await listProposals(d, ann, "G1");
    const overlap = open.find((p) => p.kind === "overlapp")!;
    expect(overlap).toMatchObject({ exercise_id: b, proposed: { status: "archived" } });
    expect(overlap.reason).toContain("100 % lik «Pasningstrekant»");
    const meta = open.find((p) => p.kind === "metadata")!;
    expect(meta.exercise_id).toBe(lacking);
    expect(meta.proposed).toEqual({ ...meta.base_values, min_players: "6", duration_minutes: "15", nff_activity: "sjef-intro", nff_tags: ["tema.spille-framover"] });
    expect((await getExercise(d, ann, "G1", a)).status).toBe("active");

    // Nothing new the next night while they wait.
    expect((await analyseBank(d, { bank: true })).bankProposed).toBe(0);
  });

  it("lets the trainers' proposal replace a waiting «Mangler info»", async () => {
    const id = (await listExercises(d, ann, "G1")).find((e) => e.name === "Kanonball")!.id;
    const code = (await getExercise(d, ann, "G1", id)).code;
    const row = (who: Access) =>
      saveBankFeedback(d, who, "G1", id, { exercise_no: null, exercise_code: code, rating: 1, tags: ["ko"], actual_minutes: null, actual_players: null, body: "", use_again: "changes" });
    await row(ann);
    await row(bo);
    expect((await analyseBank(d, { bank: true })).proposed).toBe(1);
    const { open } = await listProposals(d, ann, "G1");
    expect(open.filter((p) => p.exercise_code === code).map((p) => p.kind)).toEqual(["ny_versjon"]);
    const [old] = await d.query<{ status: string }>("SELECT status FROM improvement_proposals WHERE exercise_code = $1 AND kind = 'metadata'", [code]);
    expect(old.status).toBe("utdatert");
  });

  it("proposes a new exercise from KI where a band in use lacks good ones for a main theme", async () => {
    const m = await testDb();
    try {
      const year = new Date().getFullYear();
      await m.query("INSERT INTO team_settings (spond_group_id, spond_subgroup_id, birth_year, updated_by) VALUES ('G1', '', $1, 'P-ANN')", [year - 9]);
      const names = ["Alfa", "Bravo", "Charlie", "Delta", "Ekko", "Foxtrot", "Golf", "Hotell", "India", "Juliett"];
      for (const x of names) await saveExercise(m, ann, "G1", input(`${x}spill`), null);
      // Two good for «Vinne ball»: it is a gap too, but the empty ones come first.
      for (const x of ["Kilo", "Lima"]) await saveExercise(m, ann, "G1", input(`${x}press`, { nff_tags: ["tema.vinne-ball"] }), null);

      const r = await analyseBank(m, { bank: true });
      expect(r.bankProposed).toBe(1);
      const [p] = (await listProposals(m, ann, "G1")).open;
      const tema = HOVEDTEMA.find((t) => t.key === "komme-til-avslutning")!;
      expect(p).toMatchObject({ kind: "ny_ovelse", exercise_code: "ny-8-9-komme-til-avslutning", exercise_id: null, exercise_name: "Simulert KI-øvelse" });
      expect(p.proposed).toMatchObject({ status: "candidate", bands: ["8-9"], themes: tema.label, min_players: "6", max_players: "10" });
      expect(p.proposed.nff_tags).toContain("tema.komme-til-avslutning");
      expect(p.reason).toContain("ingen gode øvelser for 8–9 år");

      // «Bruk»: a new exercise in the bank, made with KI.
      const id = await saveExercise(m, ann, "G1", exerciseInputFrom(p.proposed), null, { madeByKi: true });
      expect(await getExercise(m, ann, "G1", id)).toMatchObject({ source: "ai", status: "candidate", bands: ["8-9"] });
    } finally {
      await m.close();
    }
  });
});

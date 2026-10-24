import { unzipSync, strFromU8 } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { osloParts } from "@/lib/format";
import type { Db } from "@/lib/db";
import { runMaintenance } from "@/lib/maintenance";
import { pitchText, pitchTree, validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import { NO_RIGHTS, type Access, type Rights } from "@/lib/store/access";
import { archivePending, buildArchive, confirmArchive } from "@/lib/store/archive";
import {
  addPlanComment,
  approvePlan,
  deleteExercise,
  feedbackSince,
  getPlan,
  getTeamSettings,
  latestLearning,
  listExercises,
  listPitches,
  listSeason,
  myBankFeedback,
  planVersions,
  saveBankFeedback,
  saveFeedback,
  savePlan,
  savePlanExercise,
  saveExercise,
  saveLearning,
  savePrinciples,
  saveSeason,
  saveTeamSettings,
  teamPitches,
} from "@/lib/store/training";
import { testDb } from "../helpers/db";

let d: Db;
const me: Access = { profileId: "P-1", groupIds: new Set(["G1"]) };
const sa: Rights = { superadmin: true, admin: true, ai: true, app: true, tags: true };
const plan = validatePlan(reference);

beforeAll(async () => {
  d = await testDb();
});
afterAll(async () => d.close());

describe("training plans", () => {
  it("saves versions, approves one, and puts new exercises in the bank as candidates", async () => {
    const v1 = await savePlan(d, me, "G1", "E1", plan);
    const v2 = await savePlan(d, me, "G1", "E1", { ...plan, tittel: "Versjon to" }, { source: "ai", model: "claude-haiku-5-5", costUsd: 0.01 });
    expect([v1.version, v2.version]).toEqual([1, 2]);
    await approvePlan(d, me, v1.id);
    await approvePlan(d, me, v2.id);
    const versions = await planVersions(d, me, "G1", "E1");
    expect(versions.map((v) => [v.version, v.status])).toEqual([
      [2, "approved"],
      [1, "draft"],
    ]);
    expect((await getPlan(d, me, v2.id)).plan.tittel).toBe("Versjon to");

    expect(await savePlanExercise(d, me, "G1", plan.ovelser[0], [plan.tema], "ai")).toEqual(expect.any(Number));
    expect(await savePlanExercise(d, me, "G1", plan.ovelser[0], [plan.tema], "ai")).toBeNull();
    const bank = await listExercises(d, me, "G1");
    expect(bank).toHaveLength(1);
    expect(bank[0].status).toBe("candidate");

    // 👍 + «Bruke igjen: Ja» makes the candidate active.
    const activated = await saveFeedback(
      d,
      me,
      v2.id,
      [{ exercise_no: 1, exercise_code: plan.ovelser[0].kode, rating: 3, tags: ["goy"], actual_minutes: 15, actual_players: null, body: "", use_again: "yes" }],
      12,
    );
    expect(activated).toEqual([plan.ovelser[0].kode]);
    expect((await listExercises(d, me, "G1"))[0].fb_n).toBe(1);
  });

  it("evaluates an exercise from the bank, in the same data as after a training", async () => {
    const other: Access = { profileId: "P-3", groupIds: new Set(["G1"]) };
    const [ex] = await listExercises(d, me, "G1");
    const row = { exercise_no: null, exercise_code: ex.code, rating: 2, tags: ["ko"], actual_minutes: 20, actual_players: null, body: "Bra variant", use_again: "changes" };
    expect(await saveBankFeedback(d, other, "G1", ex.id, row)).toBe(false);
    // Saving again replaces the trainer's evaluation.
    await saveBankFeedback(d, other, "G1", ex.id, { ...row, rating: 1 });
    expect((await myBankFeedback(d, other, "G1", ex.code))?.rating).toBe(1);
    expect(await myBankFeedback(d, me, "G1", ex.code)).toBeNull();

    const b = (await listExercises(d, me, "G1"))[0];
    expect([b.fb_n, b.fb_sessions, b.fb_bank, b.fb_good, b.fb_bad, b.fb_tags]).toEqual([2, 1, 1, 1, 1, { goy: 1, ko: 1 }]);
    const since = await feedbackSince(d, me, "G1", new Date(0));
    expect(since.find((r) => r.spond_event_id === "")).toMatchObject({ exercise_name: ex.name, rating: 1, body: "Bra variant" });

    await saveBankFeedback(d, other, "G1", ex.id, null);
    expect(await myBankFeedback(d, other, "G1", ex.code)).toBeNull();
    expect((await listExercises(d, me, "G1"))[0].fb_bank).toBe(0);
    await expect(saveBankFeedback(d, { profileId: "P-2", groupIds: new Set(["G2"]) }, "G1", ex.id, row)).rejects.toThrow(/tilgang/);
    await expect(saveBankFeedback(d, other, "G1", 99999, row)).rejects.toThrow(/Fant ikke/);
  });

  it("a 👍 with «Bruke igjen: Ja» from the bank makes a candidate active", async () => {
    await savePlanExercise(d, me, "G1", plan.ovelser[1], [plan.tema], "ai");
    const cand = (await listExercises(d, me, "G1")).find((b) => b.code === plan.ovelser[1].kode)!;
    expect(cand.status).toBe("candidate");
    const row = { exercise_no: null, exercise_code: cand.code, rating: 3, tags: [], actual_minutes: null, actual_players: null, body: "", use_again: "yes" };
    expect(await saveBankFeedback(d, me, "G1", cand.id, row)).toBe(true);
    expect((await listExercises(d, me, "G1")).find((b) => b.id === cand.id)!.status).toBe("active");
  });

  it("saves an exercise from «Ny øvelse med KI» with players, minutes and area", async () => {
    const other: Access = { profileId: "P-1", groupIds: new Set(["G9"]) };
    const id = await savePlanExercise(d, other, "G9", plan.ovelser[1], ["Samhandling"], "ai", { min_players: 6, max_players: 10, duration_minutes: 15, area: "20 × 15 m" });
    const [b] = await listExercises(d, other, "G9");
    expect(b).toMatchObject({ id, source: "ai", status: "candidate", min_players: 6, max_players: 10, duration_minutes: 15, area: "20 × 15 m", themes: ["Samhandling"] });
  });

  it("tags exercises with NFF's fagplan, and gives KI exercises the team's band", async () => {
    const other: Access = { profileId: "P-1", groupIds: new Set(["G8"]) };
    const base = { name: "Rondo NFF", category: "pasning_mottak", themes: [], status: "active" };
    const id = await saveExercise(d, other, "G8", {
      ...base,
      bands: ["10-12", "8-9"],
      nff_activity: "med-og-mot",
      nff_tags: ["tema.spille-framover", "delf.pasning", "lm.8-9.pasning.1", "lm.6-7.foring.1", "tema.finnes-ikke"],
    }, null);
    let [b] = await listExercises(d, other, "G8");
    expect(b).toMatchObject({ id, bands: ["8-9", "10-12"], nff_activity: "med-og-mot", nff_tags: ["tema.spille-framover", "delf.pasning", "lm.8-9.pasning.1"] });
    await expect(saveExercise(d, other, "G8", { ...base, bands: ["13-16"] }, id)).rejects.toThrow(/aldersbånd/);
    await expect(saveExercise(d, other, "G8", { ...base, nff_activity: "x" }, id)).rejects.toThrow(/aktivitetskategori/);

    await saveTeamSettings(d, other, "G8", { birth_year: String(osloParts(new Date()).year - 9) });
    const ex = { ...plan.ovelser[1], kode: "ki-nff", aktivitet: "spill", nff_tags: ["tema.vinne-ball"] };
    await savePlanExercise(d, other, "G8", ex, [], "ai");
    b = (await listExercises(d, other, "G8")).find((x) => x.code === "ki-nff")!;
    expect(b).toMatchObject({ bands: ["8-9"], nff_activity: "spill", nff_tags: ["tema.vinne-ball"] });
  });

  it("refuses other groups", async () => {
    const other: Access = { profileId: "P-2", groupIds: new Set(["G2"]) };
    await expect(savePlan(d, other, "G1", "E1", plan)).rejects.toThrow(/tilgang/);
    const [v] = await planVersions(d, me, "G1", "E1");
    await expect(getPlan(d, other, v.id)).rejects.toThrow(/tilgang/);
  });
});

describe("pitches and team settings", () => {
  it("has the Nymark pitches with sub-pitches from fotball.no", async () => {
    const pitches = await listPitches(d);
    expect(pitches).toHaveLength(36);
    const tree = pitchTree(pitches);
    const a7 = tree.find((x) => x.pitch.id === 18049)!;
    expect(a7.depth).toBe(2);
    expect(a7.pitch).toMatchObject({ name: "Nymark Kunstgress 04 7er A", pitch_type: "7er", length_m: 48, width_m: 30, lighting: "150 lux", parent_id: 8876 });
    expect(pitches.find((p) => p.id === 686)).toMatchObject({ surface: "Naturgress", lighting: null, length_m: 100, width_m: 60 });
    expect(pitches.find((p) => p.id === 22419)?.retired).toBe(true);
  });

  it("saves the team's pitches with a note, and refuses unknown pitches", async () => {
    await saveTeamSettings(d, me, "G1", { age_group: "G10", pitch_ids: [18049, 686, 18049], pitch: "Deler med G11" });
    const s = await getTeamSettings(d, me, "G1");
    expect([s.pitch_ids, s.pitch]).toEqual([[686, 18049], "Deler med G11"]);
    const mine = await teamPitches(d, me, "G1");
    expect(mine.map((p) => p.id)).toEqual([18049, 686]);
    expect(pitchText(mine.slice(0, 1), s.pitch)).toBe(
      "Nymark idrettsanlegg, Nymark Kunstgress 04 7er A (7er · Kunstgress m/plastholdig innfyll · 48 × 30 m · lys 150 lux). Deler med G11",
    );
    expect(pitchText(mine, "")).toContain("lys 150 lux); Nymark idrettsanlegg, Nymark gress 01 (11er · Naturgress · 100 × 60 m · uten lys)");
    await saveTeamSettings(d, me, "G1", { birth_year: "2016", gender: "gutter" });
    expect(await getTeamSettings(d, me, "G1")).toMatchObject({ age_group: "", birth_year: 2016, gender: "gutter" });
    await expect(saveTeamSettings(d, me, "G1", { birth_year: "1990" })).rejects.toThrow(/Fødselsår/);
    await expect(saveTeamSettings(d, me, "G1", { gender: "x" })).rejects.toThrow(/kjønn/);
    await expect(saveTeamSettings(d, me, "G1", { pitch_ids: [999] })).rejects.toThrow(/Ukjent bane/);
    await expect(saveTeamSettings(d, me, "G1", { pitch_ids: "x" })).rejects.toThrow(/Ukjent bane/);
    await expect(teamPitches(d, me, "G2")).rejects.toThrow();
    await saveTeamSettings(d, me, "G1", { pitch_ids: [686] });
    expect((await getTeamSettings(d, me, "G1")).pitch_ids).toEqual([686]);
    await saveTeamSettings(d, me, "G1", { pitch_ids: [] });
    expect(await teamPitches(d, me, "G1")).toEqual([]);
  });
});

describe("«Trening» for every trainer", () => {
  it("lets a trainer without admin change the season plan, the team, principles, learnings and exercises; only admins delete", async () => {
    const t: Access = { profileId: "P-2", groupIds: new Set(["G7"]) };
    const months = Array.from({ length: 12 }, (_, i) => (i === 0 ? "Pasning" : ""));
    await saveSeason(d, t, "G7", 2026, months, Array(12).fill(""));
    expect((await listSeason(d, t, "G7", 2026)).map((r) => r.theme)).toEqual(["Pasning"]);

    // The principles are saved on their own, and saving the team leaves them alone.
    await savePrinciples(d, t, "G7", "Alle har ball");
    await saveTeamSettings(d, t, "G7", { session_minutes: "60" });
    expect(await getTeamSettings(d, t, "G7")).toMatchObject({ principles: "Alle har ball", session_minutes: 60 });
    await savePrinciples(d, t, "G7", "");
    expect((await getTeamSettings(d, t, "G7")).principles).toBe("");

    await saveLearning(d, t, "G7", "Korte køer fungerer", "manual");
    expect(await latestLearning(d, t, "G7")).toBe("Korte køer fungerer");

    const id = await saveExercise(d, t, "G7", { name: "Trenerøvelse", category: "annet", themes: [], status: "active" }, null);
    await expect(deleteExercise(d, t, NO_RIGHTS, "G7", id)).rejects.toThrow(/administratorer/);
    await deleteExercise(d, t, sa, "G7", id);
    expect(await listExercises(d, t, "G7")).toEqual([]);
    await expect(saveSeason(d, t, "G1", 2026, months, Array(12).fill(""))).rejects.toThrow();
  });
});

describe("maintenance and archive", () => {
  it("deletes old intermediate versions but keeps first, last and approved", async () => {
    for (let i = 0; i < 4; i++) await savePlan(d, me, "G1", "E2", plan);
    await d.query("UPDATE training_plans SET created_at = now() - interval '40 days' WHERE spond_event_id = 'E2'");
    const r = await runMaintenance(d);
    expect(r.versions).toBe(2);
    expect((await planVersions(d, me, "G1", "E2")).map((v) => v.version)).toEqual([4, 1]);
  });

  it("archives trainings older than a year as a ZIP, then deletes them when confirmed", async () => {
    const old = await savePlan(d, me, "G1", "E-OLD", plan);
    await addPlanComment(d, me, old.id, "Fin økt", null);
    await d.query("UPDATE training_plans SET created_at = now() - interval '400 days' WHERE spond_event_id = 'E-OLD'");
    const pending = await archivePending(d, me);
    expect(pending.map((p) => p.spond_event_id)).toEqual(["E-OLD"]);

    await expect(buildArchive(d, me, NO_RIGHTS, {})).rejects.toThrow(/superadmin/);
    const a = await buildArchive(d, me, sa, { G1: "Gutter 2016" });
    const files = unzipSync(a.zip);
    const names = Object.keys(files);
    expect(names).toContain("LES-MEG.txt");
    const json = names.find((n) => n.endsWith("data.json"))!;
    expect(json).toMatch(/^gutter-2016\/\d{4}-\d{2}-\d{2}-EOLD\/data\.json$/);
    const data = JSON.parse(strFromU8(files[json]));
    expect(data.versjoner).toHaveLength(1);
    expect(data.kommentarer[0].tekst).toBe("Fin økt");
    expect(names.some((n) => n.endsWith(".pdf"))).toBe(true);

    const done = await confirmArchive(d, me, sa, a.keys, "P-1");
    expect(done).toEqual({ nEvents: 1, nVersions: 1 });
    expect(await archivePending(d, me)).toEqual([]);
    const [log] = await d.query<{ n_events: number }>("SELECT n_events FROM archive_log");
    expect(log.n_events).toBe(1);
  }, 60_000);
});

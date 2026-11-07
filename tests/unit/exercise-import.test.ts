import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { parseImportFile, previewImport } from "@/lib/plans/exercise-import";
import { NO_RIGHTS, type Access } from "@/lib/store/access";
import { importExercises, previewExerciseImport } from "@/lib/store/exercise-import";
import { listProposals } from "@/lib/store/improvements";
import { listExercises } from "@/lib/store/training";
import { testDb } from "../helpers/db";

const access: Access = { profileId: "P-1", groupIds: new Set(["BARN"]) };
const superadmin = { ...NO_RIGHTS, superadmin: true, admin: true };

const ex = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  category: "ballmestring",
  themes: ["Score mål"],
  bands: ["6-7"],
  nff_activity: "sjef-intro",
  nff_tags: ["tema.score-mal", "delf.foring"],
  min_players: 4,
  max_players: 16,
  duration_minutes: 10,
  area: "15 × 15 m",
  organisation: `Rute for ${name}\nÉn ball per spiller`,
  execution: `Spillerne gjør ${name} på signal fra treneren`,
  learning_points: "Små touch",
  ...extra,
});

describe("parseImportFile", () => {
  it("takes { ovelser: [...] } or a bare list", () => {
    expect(parseImportFile(JSON.stringify({ ovelser: [ex("A")] }))).toHaveLength(1);
    expect(parseImportFile(JSON.stringify([ex("A"), ex("B")]))).toHaveLength(2);
  });
  it("refuses what is not such a file", () => {
    expect(() => parseImportFile("ikke json")).toThrow("gyldig JSON");
    expect(() => parseImportFile("{}")).toThrow("«ovelser»");
    expect(() => parseImportFile("[]")).toThrow("ingen øvelser");
  });
});

describe("previewImport", () => {
  it("marks new, duplicate, too similar and invalid rows", () => {
    const rows = previewImport(
      [ex("Trafikklys"), ex("trafikklys"), ex("Trafikklys med ball", { organisation: "Rute for Trafikklys\nÉn ball per spiller", execution: "Spillerne gjør Trafikklys på signal fra treneren" }), ex("Uten kategori", { category: "tull" }), ex("Rare tagger", { nff_tags: ["lm.finnes.ikke"], organisation: "Tre lag i hver sin sone", execution: "Lagene sender pasninger over midtsonen" })],
      [],
    );
    expect(rows.map((r) => r.status)).toEqual(["ny", "finnes", "ligner", "feil", "ny"]);
    expect(rows[3].note).toBe("Velg en kategori.");
    // Imported exercises are candidates unless the file says otherwise.
    expect(rows[0].input?.status).toBe("candidate");
    expect(rows[0].input?.min_players).toBe("4");
  });
});

describe("importExercises", () => {
  let d: Db;
  beforeAll(async () => {
    d = await testDb();
  });
  afterAll(async () => d.close());

  it("is for the superadmin only", async () => {
    const text = JSON.stringify({ ovelser: [ex("Trafikklys")] });
    await expect(previewExerciseImport(d, access, { ...NO_RIGHTS, admin: true }, "BARN", text)).rejects.toThrow("superadmin");
    await expect(importExercises(d, access, superadmin, "ANDRE", text)).rejects.toThrow("tilgang");
  });

  it("saves the new exercises as candidates, and adds nothing the second time", async () => {
    const text = JSON.stringify({ ovelser: [ex("Trafikklys"), ex("Skuddporter", { category: "avslutning", organisation: "Porter og småmål", execution: "Skyt gjennom portene" })] });
    const r = await importExercises(d, access, superadmin, "BARN", text);
    expect(r.imported).toEqual(["Trafikklys", "Skuddporter"]);
    const bank = await listExercises(d, access, "BARN");
    expect(bank.map((b) => [b.name, b.status, b.bands, b.nff_activity])).toEqual(
      expect.arrayContaining([
        ["Trafikklys", "candidate", ["6-7"], "sjef-intro"],
        ["Skuddporter", "candidate", ["6-7"], "sjef-intro"],
      ]),
    );
    const again = await importExercises(d, access, superadmin, "BARN", text);
    expect(again.imported).toEqual([]);
    expect(again.skipped.map((s) => s.status)).toEqual(["finnes", "finnes"]);
  });

  it("turns a change to an exercise in the bank into a proposal in Forbedringer, only once", async () => {
    const [t] = (await listExercises(d, access, "BARN")).filter((b) => b.name === "Trafikklys");
    const text = JSON.stringify({
      ovelser: [
        { code: t.code, easier: "Gå i stedet for å løpe", begrunnelse: "Trenerne sier de minste mister ballen for ofte." },
        { code: t.code, harder: "Dobbelt" },
        { code: "finnes-ikke", easier: "x" },
        { code: t.code, name: "Trafikklys" },
      ],
    });
    const preview = await previewExerciseImport(d, access, superadmin, "BARN", text);
    expect(preview.map((r) => r.status)).toEqual(["endring", "finnes", "feil", "finnes"]);
    expect(preview[0].note).toBe("Endrer enklere.");
    const r = await importExercises(d, access, superadmin, "BARN", text);
    expect(r.proposed).toEqual(["Trafikklys"]);
    expect(r.imported).toEqual([]);
    const { open } = await listProposals(d, access, "BARN");
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ exercise_code: t.code, kind: "ny_versjon", reason: "Trenerne sier de minste mister ballen for ofte." });
    expect(open[0].proposed.easier).toBe("Gå i stedet for å løpe");
    expect({ ...open[0].proposed, easier: "" }).toEqual({ ...open[0].base_values, easier: "" });
    // The exercise itself is unchanged until a trainer uses the proposal.
    expect((await listExercises(d, access, "BARN")).find((b) => b.code === t.code)?.easier).toBe("");
    const again = await importExercises(d, access, superadmin, "BARN", text);
    expect(again.proposed).toEqual([]);
    expect(again.skipped[0].note).toContain("venter");
  });

  it("refuses a change that breaks the form's checks, and shows no change as none", async () => {
    const [s] = (await listExercises(d, access, "BARN")).filter((b) => b.name === "Skuddporter");
    const rows = await previewExerciseImport(d, access, superadmin, "BARN", JSON.stringify([{ code: s.code, category: "tull" }, { code: s.code, name: "Skuddporter" }]));
    expect(rows.map((r) => [r.status, r.note])).toEqual([
      ["feil", "Velg en kategori."],
      ["finnes", "Øvelsen er endret lenger opp i fila."],
    ]);
    const same = await previewExerciseImport(d, access, superadmin, "BARN", JSON.stringify([{ code: s.code, name: "Skuddporter" }]));
    expect(same.map((r) => [r.status, r.note])).toEqual([["finnes", "Ingen endringer."]]);
  });
});

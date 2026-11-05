import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { DELFERDIGHETER, HOVEDTEMA, LEARNING_POINTS, delfTag, temaTag } from "@/lib/nff/fagplan";
import { NO_RIGHTS, type Access, type Rights } from "@/lib/store/access";
import { addLearningPoint, addTopic, listCatalog, listSeasonFocus, saveSeasonFocus, setHidden } from "@/lib/store/nff-catalog";
import { followMainGroup, listSeason, saveSeason, saveSeasonSetup, seasonTheme, type MonthFocusInput } from "@/lib/store/training";
import { testDb } from "../helpers/db";

let d: Db;
const me: Access = { profileId: "P-1", groupIds: new Set(["G1"]) };
const other: Access = { profileId: "P-2", groupIds: new Set(["G2"]) };
const admin: Rights = { ...NO_RIGHTS, admin: true, app: true };
const trainer: Rights = { ...NO_RIGHTS, app: true };

beforeAll(async () => {
  d = await testDb();
});
afterAll(async () => d.close());

describe("NFF catalog in the database", () => {
  it("has the same NFF rows and ids as lib/nff/fagplan.ts", async () => {
    const topics = await d.query<{ id: string; label: string; side: string; bands: string[] }>(
      "SELECT id, label, side, bands FROM nff_topics WHERE source = 'nff' ORDER BY kind, sort",
    );
    expect(topics).toEqual([
      ...DELFERDIGHETER.map((t) => ({ id: delfTag(t.key), label: t.label, side: t.side, bands: t.bands })),
      ...HOVEDTEMA.map((t) => ({ id: temaTag(t.key), label: t.label, side: t.side, bands: t.bands })),
    ]);
    const points = await d.query<{ id: string; band: string; role: string | null; phase: string; text: string; topic_id: string }>(
      "SELECT id, band, role, phase, text, topic_id FROM nff_learning_points WHERE source = 'nff' ORDER BY sort",
    );
    const topicId = (key: string) => (HOVEDTEMA.some((h) => h.key === key) ? temaTag(key) : delfTag(key));
    expect(points).toEqual(LEARNING_POINTS.map((p) => ({ id: p.id, band: p.band, role: p.role, phase: p.group, text: p.text, topic_id: topicId(p.topic) })));
  });

  it("lists NFF's catalog for a team, by band", async () => {
    const all = await listCatalog(d, me, "G1");
    expect(all.topics).toHaveLength(HOVEDTEMA.length + DELFERDIGHETER.length);
    expect(all.learningPoints).toHaveLength(LEARNING_POINTS.length);
    const c = await listCatalog(d, me, "G1", { band: "10-12" });
    expect(c.topics.filter((t) => t.kind === "hovedtema").map((t) => t.id)).toEqual(
      HOVEDTEMA.filter((h) => h.bands.includes("10-12")).map((h) => temaTag(h.key)),
    );
    expect(c.learningPoints.every((p) => p.band === "10-12")).toBe(true);
    await expect(listCatalog(d, me, "G2")).rejects.toThrow(/tilgang/);
  });

  it("lets an admin add the team's own topic and learning points, seen only by that team", async () => {
    await expect(addTopic(d, me, trainer, "G1", { kind: "hovedtema", label: "Omstilling", side: "omstilling", bands: ["10-12"] })).rejects.toThrow(/administratorer/);
    const id = await addTopic(d, me, admin, "G1", { kind: "hovedtema", label: "  Omstilling ", side: "omstilling", bands: ["10-12", "10-12"] });
    expect(id).toMatch(/^tema\.egen\.[0-9a-f]{10}$/);
    const lm = await addLearningPoint(d, me, admin, "G1", { topicId: id, band: "10-12", role: "laget", phase: "Ved balltap", text: "Første spiller presser med en gang" });
    const nff = await addLearningPoint(d, me, admin, "G1", { topicId: "delf.pasning", band: "10-12", role: "laget", text: "Pasning på første touch" });
    await expect(addLearningPoint(d, me, admin, "G1", { topicId: id, band: "8-9", text: "Feil bånd" })).rejects.toThrow(/Aldersbåndet/);
    await expect(addLearningPoint(d, me, admin, "G1", { topicId: "tema.finnes-ikke", band: "10-12", text: "x" })).rejects.toThrow(/Fant ikke/);
    await expect(addTopic(d, me, admin, "G1", { kind: "hovedtema", label: "", side: "angrep", bands: ["10-12"] })).rejects.toThrow(/Ugyldig/);

    const c = await listCatalog(d, me, "G1", { band: "10-12" });
    expect(c.topics.find((t) => t.id === id)).toMatchObject({ label: "Omstilling", source: "egen", bands: ["10-12"], hidden: false });
    expect(c.learningPoints.find((p) => p.id === lm)).toMatchObject({ topic_id: id, role: "laget", phase: "Ved balltap", source: "egen" });
    // A delferdighet has no role.
    expect(c.learningPoints.find((p) => p.id === nff)).toMatchObject({ topic_id: "delf.pasning", role: null });

    const g2 = await listCatalog(d, other, "G2");
    expect(g2.topics.some((t) => t.id === id)).toBe(false);
    expect(g2.learningPoints.some((p) => p.id === lm)).toBe(false);
    await expect(addLearningPoint(d, other, admin, "G2", { topicId: id, band: "10-12", text: "Andres tema" })).rejects.toThrow(/Fant ikke/);
  });

  it("hides (deletes) for one team only, keeps the row, and can show it again", async () => {
    await expect(setHidden(d, me, trainer, "G1", "delf.heading", true)).rejects.toThrow(/administratorer/);
    await setHidden(d, me, admin, "G1", "delf.heading", true);
    await setHidden(d, me, admin, "G1", "delf.heading", true);
    await setHidden(d, me, admin, "G1", "lm.10-12.pasning.1", true);
    const c = await listCatalog(d, me, "G1", { band: "10-12" });
    expect(c.topics.some((t) => t.id === "delf.heading")).toBe(false);
    // The learning points under a hidden topic are hidden too.
    expect(c.learningPoints.some((p) => p.topic_id === "delf.heading")).toBe(false);
    expect(c.learningPoints.some((p) => p.id === "lm.10-12.pasning.1")).toBe(false);
    const withHidden = await listCatalog(d, me, "G1", { band: "10-12", withHidden: true });
    expect(withHidden.topics.find((t) => t.id === "delf.heading")?.hidden).toBe(true);

    const g2 = await listCatalog(d, other, "G2", { band: "10-12" });
    expect(g2.topics.some((t) => t.id === "delf.heading")).toBe(true);

    await setHidden(d, me, admin, "G1", "delf.heading", false);
    expect((await listCatalog(d, me, "G1", { band: "10-12" })).topics.some((t) => t.id === "delf.heading")).toBe(true);
    await expect(setHidden(d, me, admin, "G1", "lm.finnes.ikke", true)).rejects.toThrow(/Fant ikke/);
  });

  it("stores hovedtema and up to two learning points per month next to the free-text theme", async () => {
    await saveSeason(d, me, "G1", "", 2027, ["Pasning og mottak", "", "", "", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", "", "", "", ""]);
    const focus = { month: 1, hovedtemaId: "tema.spille-framover", learningPointIds: ["lm.10-12.spille-framover.ballforer.1", "lm.10-12.mottak.1"] };
    await saveSeasonFocus(d, me, "G1", "", 2027, focus);
    expect(await listSeasonFocus(d, me, "G1", "", 2027)).toEqual([{ month: 1, hovedtema_id: focus.hovedtemaId, learning_point_ids: focus.learningPointIds }]);
    // A subgroup without its own season plan sees the main group's.
    expect(await listSeasonFocus(d, me, "G1", "S1", 2027)).toHaveLength(1);

    // Saving the free text again (today's UI) keeps the choice.
    await saveSeason(d, me, "G1", "", 2027, ["Pasning, mottak", "", "", "", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", "", "", "", ""]);
    expect((await listSeason(d, me, "G1", "", 2027)).rows[0]?.theme).toBe("Pasning, mottak");
    expect((await listSeasonFocus(d, me, "G1", "", 2027))[0]?.hovedtema_id).toBe("tema.spille-framover");

    await expect(saveSeasonFocus(d, me, "G1", "", 2027, { ...focus, hovedtemaId: "delf.pasning" })).rejects.toThrow(/hovedtemaet/);
    await expect(saveSeasonFocus(d, me, "G1", "", 2027, { ...focus, learningPointIds: ["lm.finnes.ikke"] })).rejects.toThrow(/læringsmomentet/);
    await expect(saveSeasonFocus(d, me, "G1", "", 2027, { ...focus, learningPointIds: ["lm.10-12.mottak.1", "lm.10-12.mottak.2", "lm.10-12.mottak.3"] })).rejects.toThrow(/Ugyldig/);
    await expect(saveSeasonFocus(d, me, "G1", "", 2027, { ...focus, month: 2 })).rejects.toThrow(/ikke noe tema/);
  });

  it("sets up a year with NFF's terms, saves the picks and gives KI the picked link", async () => {
    const empty = Array(12).fill("");
    // A year that was never set up uses the team's own words, as before.
    expect((await listSeason(d, me, "G1", "", 2028)).setup).toBeNull();
    await saveSeasonSetup(d, me, "G1", "", 2028, { mode: "nff", primaryLevel: "hovedtema" });
    expect((await listSeason(d, me, "G1", "", 2028)).setup).toEqual({ mode: "nff", primary_level: "hovedtema" });

    const egen = await addTopic(d, me, admin, "G1", { kind: "hovedtema", label: "Omstilling", side: "omstilling", bands: ["10-12"] });
    const themes = ["Spille oss framover i banen", "Omstilling", ...empty.slice(2)];
    const focus: MonthFocusInput[] = [
      { hovedtemaId: "tema.spille-framover", delferdighetId: "delf.mottak", learningPointIds: ["lm.10-12.spille-framover.ballforer.1", "lm.10-12.mottak.1"] },
      { hovedtemaId: egen, delferdighetId: null, learningPointIds: [] },
      ...empty.slice(2).map(() => null),
    ];
    await saveSeason(d, me, "G1", "", 2028, themes, empty, focus);
    const jan = await seasonTheme(d, me, "G1", "", 2028, 1);
    expect(jan?.link).toMatchObject({ hovedtema: ["tema.spille-framover"], delferdigheter: ["delf.mottak"], learningPoints: focus[0]!.learningPointIds });
    expect(jan?.link?.picked?.points.map((p) => p.text)).toEqual(focus[0]!.learningPointIds.map((id) => LEARNING_POINTS.find((p) => p.id === id)?.text));
    // The team's own hovedtema has its own name.
    expect((await seasonTheme(d, me, "G1", "", 2028, 2))?.link?.picked?.names[egen]).toBe("Omstilling");

    // Wrong kind or unknown ids are refused.
    const bad = (f: NonNullable<MonthFocusInput>) => saveSeason(d, me, "G1", "", 2028, themes, empty, [f, ...focus.slice(1)]);
    await expect(bad({ hovedtemaId: "delf.pasning", delferdighetId: null, learningPointIds: [] })).rejects.toThrow(/hovedtemaet/);
    await expect(bad({ hovedtemaId: null, delferdighetId: "tema.vinne-ball", learningPointIds: [] })).rejects.toThrow(/delferdigheten/);
    await expect(bad({ hovedtemaId: null, delferdighetId: null, learningPointIds: ["lm.finnes.ikke"] })).rejects.toThrow(/læringsmomentet/);
    await expect(saveSeason(d, other, "G1", "", 2028, themes, empty, focus)).rejects.toThrow();

    // With the team's own words the picks are kept but not used; switching back brings them back.
    await saveSeasonSetup(d, me, "G1", "", 2028, { mode: "egne", primaryLevel: "hovedtema" });
    await saveSeason(d, me, "G1", "", 2028, themes, empty);
    expect((await seasonTheme(d, me, "G1", "", 2028, 1))?.link).toBeNull();
    await saveSeasonSetup(d, me, "G1", "", 2028, { mode: "nff", primaryLevel: "hovedtema" });
    expect((await seasonTheme(d, me, "G1", "", 2028, 1))?.link?.hovedtema).toEqual(["tema.spille-framover"]);
  });

  it("starts a new year from another, and a subgroup that set up its own year keeps the main group's months", async () => {
    await saveSeasonSetup(d, me, "G1", "", 2029, { mode: "nff", primaryLevel: "delferdighet", copyFrom: 2028 });
    const copied = await listSeason(d, me, "G1", "", 2029);
    expect(copied.rows.map((r) => [r.month, r.theme, r.hovedtema_id])).toEqual([
      [1, "Spille oss framover i banen", "tema.spille-framover"],
      [2, "Omstilling", expect.stringMatching(/^tema\.egen\./)],
    ]);
    // Copying never overwrites a year that has months.
    await saveSeasonSetup(d, me, "G1", "", 2029, { mode: "nff", primaryLevel: "hovedtema", copyFrom: 2027 });
    expect((await listSeason(d, me, "G1", "", 2029)).rows).toHaveLength(2);

    expect((await listSeason(d, me, "G1", "S2", 2029)).inherited).toBe(true);
    await saveSeasonSetup(d, me, "G1", "S2", 2029, { mode: "egne", primaryLevel: "hovedtema" });
    const own = await listSeason(d, me, "G1", "S2", 2029);
    expect(own).toMatchObject({ inherited: false, setup: { mode: "egne" } });
    expect(own.rows).toHaveLength(2);
    await followMainGroup(d, me, "G1", "S2", "season", 2029);
    expect(await listSeason(d, me, "G1", "S2", 2029)).toMatchObject({ inherited: true, setup: { mode: "nff", primary_level: "hovedtema" } });
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/board";
import { NO_RIGHTS, type Access, type Rights } from "@/lib/store/access";
import { getBoardSettings, saveBoardSettings } from "@/lib/store/board-settings";
import { testDb } from "../helpers/db";

let d: Db;
const me: Access = { profileId: "P-1", groupIds: new Set(["G1"]) };
const tags: Rights = { ...NO_RIGHTS, tags: true };

beforeAll(async () => {
  d = await testDb();
});
afterAll(async () => d.close());

describe("Fordeling (board settings)", () => {
  it("defaults, then the main group's, then the subgroup's own", async () => {
    expect(await getBoardSettings(d, me, tags, "G1", "S1")).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.history).toBe("rotate");
    await saveBoardSettings(d, me, tags, "G1", "", { mode: "levels", roles: [" Keeper ", "keeper", "Forsvar"], pairs: false, history: "off" });
    expect(await getBoardSettings(d, me, tags, "G1", "S1")).toEqual({ mode: "levels", roles: ["Keeper", "Forsvar"], pairs: false, history: "off" });
    await saveBoardSettings(d, me, tags, "G1", "S1", { ...DEFAULT_SETTINGS, roles: [] });
    expect((await getBoardSettings(d, me, tags, "G1", "S1"))?.roles).toEqual([]);
    expect((await getBoardSettings(d, me, tags, "G1", ""))?.mode).toBe("levels");
  });

  it("needs the tags right and access to the group", async () => {
    expect(await getBoardSettings(d, me, NO_RIGHTS, "G1", "")).toBeNull();
    await expect(saveBoardSettings(d, me, NO_RIGHTS, "G1", "", DEFAULT_SETTINGS)).rejects.toThrow("tilgang til tagger");
    await expect(saveBoardSettings(d, me, tags, "G2", "", DEFAULT_SETTINGS)).rejects.toThrow("tilgang til denne gruppen");
    await expect(saveBoardSettings(d, me, tags, "G1", "", { ...DEFAULT_SETTINGS, mode: "x" as "even" })).rejects.toThrow("Ukjent type");
  });
});

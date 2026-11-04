import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import {
  addDays,
  currentRows,
  endingSoon,
  endedText,
  endingText,
  eventPitches,
  fixedOn,
  isDateKey,
  isoWeekday,
  periodText,
  validateWeekdayPitches,
  type WeekdayPitches,
} from "@/lib/plans/pitch-schedule";
import type { Access } from "@/lib/store/access";
import {
  deleteWeekdayPitches,
  eventOverrides,
  listWeekdayPitches,
  pitchesForEvent,
  pitchesForEvents,
  saveWeekdayPitches,
  setEventPitches,
} from "@/lib/store/pitch-schedule";
import { followMainGroup, saveTeamSettings } from "@/lib/store/training";
import { testDb } from "../helpers/db";

let n = 0;
const row = (weekday: number, from: string, to: string | null, ids: number[]): WeekdayPitches => ({
  id: ++n,
  weekday,
  valid_from: from,
  valid_to: to,
  pitch_ids: ids,
  updated_by: "P1",
  updated_at: new Date(),
});

// 2026-11-02 is a Monday.
const MON = "2026-11-02";
const TUE = "2026-11-03";

describe("dates", () => {
  it("knows weekdays, real dates and adds days", () => {
    expect(isoWeekday(MON)).toBe(1);
    expect(isoWeekday("2026-11-08")).toBe(7);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("fixed pitches for a date", () => {
  const rows = [row(1, "2026-08-01", "2027-03-31", [1, 2]), row(1, "2026-11-16", "2027-03-31", [3]), row(2, "2026-08-01", null, [4])];

  it("uses the newest row that has started, until its end date", () => {
    expect(fixedOn(rows, MON)).toMatchObject({ state: "fixed", row: { pitch_ids: [1, 2] } });
    expect(fixedOn(rows, "2026-11-16")).toMatchObject({ state: "fixed", row: { pitch_ids: [3] } });
    expect(fixedOn(rows, "2027-04-05")).toMatchObject({ state: "expired", row: { valid_to: "2027-03-31" } });
    expect(fixedOn(rows, TUE)).toMatchObject({ state: "fixed", row: { pitch_ids: [4] } });
    expect(fixedOn(rows, "2026-11-04")).toEqual({ state: "none" });
    expect(fixedOn(rows, "2026-07-27")).toEqual({ state: "none" });
  });

  it("lets a training's own pitches win, and reports ended ones only without them", () => {
    expect(eventPitches(rows, [9], MON)).toMatchObject({ ids: [9], source: "event", fixed: { pitch_ids: [1, 2] } });
    expect(eventPitches(rows, null, MON)).toMatchObject({ ids: [1, 2], source: "fixed" });
    expect(eventPitches(rows, null, "2027-04-05")).toMatchObject({ ids: [], source: "none", expired: { weekday: 1 } });
    expect(eventPitches(rows, [9], "2027-04-05")).toMatchObject({ source: "event", expired: null });
    expect(eventPitches(rows, null, null)).toMatchObject({ source: "none", expired: null });
  });
});

describe("reminders and the list", () => {
  it("reminds before the end date unless new pitches follow", () => {
    const rows = [row(1, "2026-08-01", "2026-11-20", [1]), row(2, "2026-08-01", "2026-11-20", [2]), row(2, "2026-11-21", null, [3]), row(4, "2026-08-01", "2027-03-31", [4])];
    const soon = endingSoon(rows, MON);
    expect(soon.map((r) => r.weekday)).toEqual([1]);
    expect(endingText(soon, MON)).toBe("Faste baner for mandager slutter 20. nov.");
    expect(endingSoon(rows, "2026-11-21")).toEqual([]);
  });

  it("shows the row in force (or last ended) per weekday and coming ones", () => {
    const old = row(1, "2026-01-01", "2026-07-31", [1]);
    const now = row(1, "2026-08-01", null, [2]);
    const next = row(1, "2026-12-01", null, [3]);
    expect(currentRows([old, now, next], MON).map((r) => r.id)).toEqual([now.id, next.id]);
    expect(periodText(now, MON)).toBe("Fra 1. aug til neste endring");
    expect(periodText(old, MON)).toBe("1. jan–31. jul");
    expect(periodText(row(1, "2026-08-01", "2027-03-31", []), MON)).toBe("Fra 1. aug til og med 31. mar 2027");
  });

  it("checks the form", () => {
    expect(validateWeekdayPitches({ from: MON, to: null, days: [{ weekday: 1, pitch_ids: [1] }] })).toBeNull();
    expect(validateWeekdayPitches({ from: MON, to: "2026-11-01", days: [{ weekday: 1, pitch_ids: [1] }] })).toMatch(/etter/);
    expect(validateWeekdayPitches({ from: MON, to: null, days: [] })).toMatch(/minst én ukedag/);
    expect(validateWeekdayPitches({ from: MON, to: null, days: [{ weekday: 2, pitch_ids: [] }] })).toMatch(/tirsdager/);
    expect(validateWeekdayPitches({ from: "2026-13-01", to: null, days: [{ weekday: 1, pitch_ids: [1] }] })).toMatch(/fra/);
  });
});

describe("store", () => {
  let d: Db;
  const access: Access = { profileId: "P1", groupIds: new Set(["G1"]) };
  const team = (pitch_ids: number[]) => ({ age_group: "", birth_year: "", gender: "", session_minutes: "", pitch: "", equipment: "", pitch_ids });

  beforeAll(async () => {
    d = await testDb();
    const pitches = await d.query<{ id: number }>("SELECT id FROM pitches ORDER BY id LIMIT 3");
    ids = pitches.map((p) => p.id);
    await saveTeamSettings(d, access, "G1", "", team(ids));
  });
  afterAll(() => d.close());
  let ids: number[] = [];

  it("saves only the chosen weekdays and updates a row with the same start", async () => {
    await saveWeekdayPitches(d, access, "G1", "", { from: "2026-08-01", to: "2027-03-31", days: [{ weekday: 1, pitch_ids: [ids[0], ids[1]] }, { weekday: 2, pitch_ids: [ids[2]] }] });
    await saveWeekdayPitches(d, access, "G1", "", { from: "2026-08-01", to: null, days: [{ weekday: 2, pitch_ids: [ids[1]] }] });
    const { rows, inherited } = await listWeekdayPitches(d, access, "G1", "");
    expect(inherited).toBe(false);
    expect(rows.map((r) => [r.weekday, r.valid_from, r.valid_to, r.pitch_ids])).toEqual([
      [1, "2026-08-01", "2027-03-31", [ids[0], ids[1]]],
      [2, "2026-08-01", null, [ids[1]]],
    ]);
  });

  it("only takes the team's pitches and other groups are closed", async () => {
    await expect(saveWeekdayPitches(d, access, "G1", "", { from: MON, to: null, days: [{ weekday: 3, pitch_ids: [999999] }] })).rejects.toThrow(/lagets baner/);
    await expect(listWeekdayPitches(d, access, "G2", "")).rejects.toThrow(/tilgang/);
  });

  it("lets a training have its own pitches, and the fixed ones remove them", async () => {
    const e = { id: "E1", sub: "", date: MON };
    expect(await pitchesForEvent(d, access, "G1", e)).toMatchObject({ source: "fixed", ids: [ids[0], ids[1]] });
    await setEventPitches(d, access, "G1", e, [ids[2]]);
    expect(await pitchesForEvent(d, access, "G1", e)).toMatchObject({ source: "event", ids: [ids[2]] });
    await setEventPitches(d, access, "G1", e, [ids[1], ids[0]]);
    expect((await eventOverrides(d, access, "G1", ["E1"])).size).toBe(0);
    await setEventPitches(d, access, "G1", e, [ids[2]]);
    await setEventPitches(d, access, "G1", e, []);
    expect(await pitchesForEvent(d, access, "G1", e)).toMatchObject({ source: "fixed" });
  });

  it("a subgroup follows the main group until it saves its own (a copy)", async () => {
    const events = [
      { id: "E2", sub: "S1", date: MON },
      { id: "E3", sub: "", date: "2027-04-05" },
    ];
    let map = await pitchesForEvents(d, access, "G1", events);
    expect(map.get("E2")).toMatchObject({ source: "fixed", ids: [ids[0], ids[1]] });
    expect(map.get("E3")).toMatchObject({ source: "none", expired: { weekday: 1 } });

    expect((await listWeekdayPitches(d, access, "G1", "S1")).inherited).toBe(true);
    await saveWeekdayPitches(d, access, "G1", "S1", { from: "2026-11-09", to: null, days: [{ weekday: 1, pitch_ids: [ids[2]] }] });
    const own = await listWeekdayPitches(d, access, "G1", "S1");
    expect(own.inherited).toBe(false);
    expect(own.rows.map((r) => [r.weekday, r.valid_from])).toEqual([
      [1, "2026-08-01"],
      [1, "2026-11-09"],
      [2, "2026-08-01"],
    ]);
    map = await pitchesForEvents(d, access, "G1", [{ id: "E4", sub: "S1", date: "2026-11-09" }]);
    expect(map.get("E4")).toMatchObject({ ids: [ids[2]] });

    await expect(deleteWeekdayPitches(d, access, "G1", "", own.rows[1].id)).rejects.toThrow(/Fant ikke/);
    await deleteWeekdayPitches(d, access, "G1", "S1", own.rows[1].id);
    await followMainGroup(d, access, "G1", "S1", "team");
    expect((await listWeekdayPitches(d, access, "G1", "S1")).inherited).toBe(true);
  });
});

describe("text", () => {
  it("says when the fixed pitches end", () => {
    const rows = [row(4, "2026-08-01", "2026-11-20", [1]), row(2, "2026-08-01", "2026-11-20", [2]), row(1, "2026-08-01", "2026-10-30", [3])];
    expect(endedText(rows, MON)).toBe("de faste banene for mandager sluttet 30. okt og tirsdager og torsdager slutter 20. nov.");
  });
});

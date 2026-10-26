import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { NO_RIGHTS, type Access, type Rights } from "@/lib/store/access";
import { acquireLock, activeLocks, addComment, getProposal, listProposals, releaseLock, saveProposal, teamsOfEvents, transition } from "@/lib/store/proposals";
import { addPair, addTag, listPlayerTags, listTags, removePair, removeTag, setLevel } from "@/lib/store/tags";
import { testDb } from "../helpers/db";

let d: Db;
const me: Access = { profileId: "P-1", groupIds: new Set(["G1"]) };
const other: Access = { profileId: "P-2", groupIds: new Set(["G2"]) };

beforeAll(async () => {
  d = await testDb();
});
afterAll(async () => d.close());

describe("proposals", () => {
  it("saves, edits and approves; approving rolls back the other approved one", async () => {
    const a = await saveProposal(d, me, { groupId: "G1", eventId: "E1", name: "Forslag 1", labels: ["Lag 1", "Lag 2"], assignments: { m1: "Lag 1", m2: "Lag 2" } });
    const b = await saveProposal(d, me, { groupId: "G1", eventId: "E1", name: "Forslag 2", labels: ["Lag 1"], assignments: { m1: "Lag 1" }, submit: true });
    let p = await getProposal(d, me, a);
    expect(p.labels).toEqual(["Lag 1", "Lag 2"]);
    expect(p.assignments).toEqual({ m1: "Lag 1", m2: "Lag 2" });
    expect(p.history.map((h) => h.text)).toEqual(["created"]);

    await saveProposal(d, me, { groupId: "G1", eventId: "E1", id: a, name: "Forslag 1b", labels: ["A"], assignments: { m2: "A" } });
    p = await getProposal(d, me, a);
    expect(p.name).toBe("Forslag 1b");
    expect(p.assignments).toEqual({ m2: "A" });

    await transition(d, me, a, "submit");
    await transition(d, me, a, "approve");
    const rolled = await transition(d, me, b, "approve");
    expect(rolled).toEqual(["Forslag 1b"]);
    expect((await getProposal(d, me, a)).status).toBe("rolled_back");
    await expect(transition(d, me, b, "approve")).rejects.toThrow(/Godkjent/);
    // An approved (or waiting) proposal can be edited at the pitch, and stays approved.
    await saveProposal(d, me, { groupId: "G1", id: b, name: "Forslag 2", labels: ["A"], assignments: { m1: "A" }, submit: true });
    p = await getProposal(d, me, b);
    expect(p.status).toBe("approved");
    expect(p.assignments).toEqual({ m1: "A" });
    expect(p.history.map((h) => h.text).slice(-1)).toEqual(["edited"]);
    await transition(d, me, a, "delete");
    await expect(saveProposal(d, me, { groupId: "G1", id: a, name: "x", labels: ["A"], assignments: {} })).rejects.toThrow(/Fant ikke/);
  });

  it("checks group access and labels", async () => {
    await expect(saveProposal(d, other, { groupId: "G1", name: "x", labels: ["A"], assignments: {} })).rejects.toThrow(/tilgang/);
    await expect(saveProposal(d, me, { groupId: "G1", name: "x", labels: ["A", "a"], assignments: {} })).rejects.toThrow(/samme navn/);
    await expect(saveProposal(d, me, { groupId: "G1", name: "x", labels: ["A"], assignments: { m: "B" } })).rejects.toThrow(/Ukjent gruppe/);
  });

  it("lists drafts per context and pending ones everywhere", async () => {
    const sub = await saveProposal(d, me, { groupId: "G1", subgroupId: "S1", name: "Utkast 1", labels: ["A"], assignments: {} });
    const whole = await saveProposal(d, me, { groupId: "G1", name: "Utkast 2", labels: ["A"], assignments: {}, submit: true });
    const inSub = (await listProposals(d, me, "G1", { subgroupId: "S1" })).map((p) => p.id);
    expect(inSub).toContain(sub);
    expect(inSub).toContain(whole); // pending: shown for approval everywhere
    const inWhole = (await listProposals(d, me, "G1", { subgroupId: null })).map((p) => p.id);
    expect(inWhole).not.toContain(sub);
  });

  it("refuses sensitive comments", async () => {
    const id = await saveProposal(d, me, { groupId: "G1", name: "K", labels: ["A"], assignments: {} });
    await addComment(d, me, id, "Bra fordeling");
    await expect(addComment(d, me, id, "Han er skadet")).rejects.toThrow(/helseopplysninger/);
    expect((await getProposal(d, me, id)).comments.map((c) => c.text)).toEqual(["Bra fordeling"]);
  });

  it("keeps advisory locks", async () => {
    await acquireLock(d, me, "G1", "k1", { eventId: "E9" });
    expect((await activeLocks(d, me, "G1")).map((l) => l.eventId)).toEqual(["E9"]);
    await releaseLock(d, me, "k1");
    expect(await activeLocks(d, me, "G1")).toEqual([]);
  });
});

describe("tags", () => {
  const coach: Rights = { ...NO_RIGHTS, app: true, tags: true };
  it("adds with the group's spelling and refuses sensitive tags", async () => {
    await addTag(d, me, coach, "G1", "m1", "Keeper");
    expect(await addTag(d, me, coach, "G1", "m2", "keeper")).toBe("Keeper");
    await expect(addTag(d, me, coach, "G1", "m2", "Astma")).rejects.toThrow();
    await expect(addTag(d, me, coach, "G1", "m2", "ring 99 88 77 66")).rejects.toThrow(/kontakt/);
    await expect(addTag(d, me, coach, "G1", "m2", "3")).rejects.toThrow(/nivå/);
    expect((await listTags(d, me, "G1")).get("m2")).toEqual(["Keeper"]);
    await removeTag(d, me, coach, "G1", "m2", "Keeper");
    expect((await listTags(d, me, "G1")).get("m2")).toBeUndefined();
  });

  it("keeps one level per player and each pair once", async () => {
    await setLevel(d, me, coach, "G1", "m1", 2);
    await setLevel(d, me, coach, "G1", "m1", 4);
    await expect(setLevel(d, me, coach, "G1", "m2", 6)).rejects.toThrow(/1 til 5/);
    await addPair(d, me, coach, "G1", "m2", "m1");
    await addPair(d, me, coach, "G1", "m1", "m2");
    await expect(addPair(d, me, coach, "G1", "m1", "m1")).rejects.toThrow();
    let t = await listPlayerTags(d, me, coach, "G1");
    expect(t.levels.get("m1")).toBe(4);
    expect(t.pairs).toEqual([["m1", "m2"]]);
    await removePair(d, me, coach, "G1", "m2", "m1");
    await setLevel(d, me, coach, "G1", "m1", null);
    t = await listPlayerTags(d, me, coach, "G1");
    expect([t.levels.size, t.pairs.length]).toEqual([0, 0]);
  });

  it("shows and changes nothing without the tags right", async () => {
    const none: Rights = { ...coach, tags: false };
    await addTag(d, me, coach, "G1", "m3", "Ny");
    const t = await listPlayerTags(d, me, none, "G1");
    expect([t.tags.size, t.levels.size, t.pairs.length]).toEqual([0, 0, 0]);
    await expect(addTag(d, me, none, "G1", "m3", "Kaptein")).rejects.toThrow(/tagger/);
    await expect(setLevel(d, me, none, "G1", "m3", 1)).rejects.toThrow(/tagger/);
    await expect(addPair(d, me, none, "G1", "m3", "m1")).rejects.toThrow(/tagger/);
  });
});

describe("teams of earlier trainings", () => {
  it("uses the approved proposal, else the last saved, newest event first", async () => {
    const two = { labels: ["A", "B"], assignments: { h1: "A", h2: "A", h3: "B", h4: "B" } };
    const ok = await saveProposal(d, me, { groupId: "G1", eventId: "H1", name: "Godkjent", ...two, submit: true });
    await transition(d, me, ok, "approve");
    await saveProposal(d, me, { groupId: "G1", eventId: "H1", name: "Nyere utkast", labels: ["A"], assignments: { h1: "A", h3: "A" } });
    await saveProposal(d, me, { groupId: "G1", eventId: "H2", name: "Eldre", labels: ["A"], assignments: { h1: "A" } });
    await saveProposal(d, me, { groupId: "G1", eventId: "H2", name: "Sist lagret", labels: ["A", "B", "C"], assignments: { h1: "A", h4: "B" } });
    expect(await teamsOfEvents(d, me, "G1", ["H2", "H0", "H1"])).toEqual([
      [["h1"], ["h4"]],
      [
        ["h1", "h2"],
        ["h3", "h4"],
      ],
    ]);
    await expect(teamsOfEvents(d, other, "G1", ["H1"])).rejects.toThrow();
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import type { Access } from "@/lib/store/access";
import { acquireLock, activeLocks, addComment, getProposal, listProposals, releaseLock, saveProposal, transition } from "@/lib/store/proposals";
import { addTag, listTags, removeTag } from "@/lib/store/tags";
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
    await expect(saveProposal(d, me, { groupId: "G1", id: b, name: "x", labels: ["A"], assignments: {} })).rejects.toThrow(/redigeres/);
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
  it("adds with the group's spelling and refuses sensitive tags", async () => {
    await addTag(d, me, "G1", "m1", "Keeper");
    expect(await addTag(d, me, "G1", "m2", "keeper")).toBe("Keeper");
    await expect(addTag(d, me, "G1", "m2", "Astma")).rejects.toThrow();
    await expect(addTag(d, me, "G1", "m2", "ring 99 88 77 66")).rejects.toThrow(/kontakt/);
    expect((await listTags(d, me, "G1")).get("m2")).toEqual(["Keeper"]);
    await removeTag(d, me, "G1", "m2", "Keeper");
    expect((await listTags(d, me, "G1")).get("m2")).toBeUndefined();
  });
});

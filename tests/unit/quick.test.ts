import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CurrentUser } from "@/lib/auth/current";
import type { Db } from "@/lib/db";
import { distributionText, quickCreate, quickDefaults, quickMinutes, quickTeamCount, teamSizeText } from "@/lib/quick";
import type { Group, Member, SpondEvent } from "@/lib/spond/types";
import { listProposals } from "@/lib/store/proposals";
import { getPlan, lastPlanPitches, planVersions, saveTeamSettings } from "@/lib/store/training";
import { testDb } from "../helpers/db";

describe("defaults for «Hurtigopprett»", () => {
  it("makes as many teams as last time, else one per trainer, with 4–8 players each", () => {
    expect(quickTeamCount(14, 2, 3)).toBe(3);
    // Last time's three teams would give two per team now.
    expect(quickTeamCount(7, 1, 3)).toBe(1);
    expect(quickTeamCount(16, 2, null)).toBe(2);
    // Two trainers, but 24 players: at most 8 per team.
    expect(quickTeamCount(24, 2, null)).toBe(3);
    // No trainers have answered: as few teams as possible.
    expect(quickTeamCount(10, 0, null)).toBe(2);
    expect(quickTeamCount(3, 2, null)).toBe(1);
    expect(quickTeamCount(0, 0, null)).toBe(1);
    expect(teamSizeText(14, 3)).toBe("4–5 spillere");
    expect(teamSizeText(12, 2)).toBe("6 spillere");
  });

  it("uses the team's length, else the event's, else 60 minutes", () => {
    expect(quickMinutes(75, null, null)).toBe(75);
    expect(quickMinutes(null, "2026-11-03T16:30:00Z", "2026-11-03T17:45:00Z")).toBe(75);
    expect(quickMinutes(null, "2026-11-03T16:30:00Z", "2026-11-03T23:30:00Z")).toBe(60);
    expect(quickMinutes(null, null, null)).toBe(60);
  });

  it("says how the players are spread", () => {
    expect(distributionText(null, false)).toBe("Tilfeldig");
    expect(distributionText({ mode: "even", roles: ["Keeper"], pairs: true, history: "rotate" }, true)).toBe("Jevne lag, keeper spres, nye lagkamerater");
    expect(distributionText({ mode: "levels", roles: [], pairs: false, history: "rotate" }, false)).toBe("Nivådelt");
  });
});

describe("making teams and plan in one go", () => {
  let d: Db;
  const access = { profileId: "P-ANN", groupIds: new Set(["G1"]) };
  const user = { access, rights: { ai: true, tags: false } } as unknown as CurrentUser;
  const member = (n: number, kind: Member["kind"] = "player"): Member => ({
    id: `M${n}`,
    firstName: `Spiller${n}`,
    lastName: "Test",
    profileId: null,
    kind,
    roles: "",
    subgroupIds: [],
    displayName: `Spiller${n} T.`,
  });
  const group: Group = {
    id: "G1",
    name: "Nymark",
    myRoles: "",
    subgroups: [],
    members: [...Array.from({ length: 13 }, (_, i) => member(i + 1)), member(90, "coach"), member(91, "coach")],
    parentLinks: [],
  };
  const start = new Date(Date.now() + 2 * 86_400_000);
  const event = (id: string, x: Partial<SpondEvent> = {}): SpondEvent => ({
    id,
    heading: "Trening",
    start: start.toISOString(),
    end: new Date(start.getTime() + 75 * 60_000).toISOString(),
    cancelled: false,
    match: false,
    subgroupIds: [],
    location: "",
    inviteTime: null,
    notSent: false,
    responses: [
      ...Array.from({ length: 12 }, (_, i) => ({ memberId: `M${i + 1}`, status: "accepted" as const })),
      { memberId: "M13", status: "unanswered" as const },
      { memberId: "M90", status: "accepted" as const },
      { memberId: "M91", status: "accepted" as const },
    ],
    owners: [],
    ...x,
  });

  beforeAll(async () => {
    process.env.AI_MOCK = "true";
    d = await testDb();
    await saveTeamSettings(d, access, "G1", "", { birth_year: 2017 });
  });
  afterAll(async () => d.close());

  it("shows what will be made, and nothing for a match", async () => {
    const q = await quickDefaults(d, user, group, null, event("E1"));
    // 12 players said yes (not the one who has not answered), two trainers: two teams.
    expect(q).toMatchObject({ players: 12, teams: 2, sizeText: "6 spillere", coaches: 2, minutes: 75, distribution: "Tilfeldig", pitches: [], pitchIds: [] });
    expect(await quickDefaults(d, user, group, null, event("E9", { match: true }))).toBeNull();
    expect(await quickDefaults(d, { ...user, rights: { ai: false, tags: false } } as unknown as CurrentUser, group, null, event("E1"))).toBeNull();
  });

  it("saves the teams and a KI plan as drafts, marked as quick, and only once", async () => {
    const r = await quickCreate(d, user, group, null, event("E1"), { theme: "Pasning", pitchIds: [] }, 7);
    expect(r.error).toBeNull();
    const [p] = await listProposals(d, access, "G1", { eventIds: ["E1"] });
    expect(p).toMatchObject({ id: r.proposalId, status: "draft", name: "Hurtigforslag", labels: ["Lag 1", "Lag 2"] });
    expect(Object.keys(p.assignments).sort()).toEqual(Array.from({ length: 12 }, (_, i) => `M${i + 1}`).sort());
    const plan = await getPlan(d, access, r.plan!.id);
    expect(plan).toMatchObject({ status: "draft", source: "ai", kind: "hurtig" });
    const [{ context }] = await d.query<{ context: Record<string, unknown> }>("SELECT context FROM training_plans WHERE id = $1", [plan.id]);
    expect(typeof context === "string" ? JSON.parse(context) : context).toMatchObject({
      kind: "hurtig",
      groups: [6, 6],
      coaches: 2,
      minutes: 75,
      wish: "",
      theme: "Pasning",
      pitches: [],
    });

    // Now the event has teams and a plan: no second quick create.
    expect(await quickDefaults(d, user, group, null, event("E1"))).toBeNull();
    await expect(quickCreate(d, user, group, null, event("E1"), { theme: "Pasning", pitchIds: [] })).rejects.toThrow(/allerede lag eller opplegg/);
    expect(await planVersions(d, access, "G1", "E1")).toHaveLength(1);
    expect(await lastPlanPitches(d, access, "G1")).toEqual([]);
  });

  it("needs a theme when the season plan has none, before anything is saved", async () => {
    await expect(quickCreate(d, user, group, null, event("E2"), { theme: "", pitchIds: [] })).rejects.toThrow(/tema/);
    expect(await listProposals(d, access, "G1", { eventIds: ["E2"] })).toEqual([]);
  });
});

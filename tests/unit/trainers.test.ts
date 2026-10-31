import { describe, expect, it } from "vitest";
import { allTrainers } from "@/lib/admin";
import type { Group, Member } from "@/lib/spond/types";
import { matchesTrainer } from "@/lib/trainer-search";

const coach = (profileId: string, firstName: string, lastName: string, roles: string, subgroupIds: string[]): Member => ({
  id: `M-${profileId}`,
  firstName,
  lastName,
  profileId,
  kind: "coach",
  roles,
  subgroupIds,
  displayName: firstName,
});
const group = (id: string, name: string, subgroups: [string, string][], members: Member[]): Group => ({
  id,
  name,
  myRoles: "Trener",
  subgroups: subgroups.map(([sid, n]) => ({ id: sid, name: n, size: 10 })),
  members,
  parentLinks: [],
});

const barn = group("BARN", "Barnefotball", [["S1", "Gutter 2016"], ["S2", "Jenter 2015"]], [coach("P-1", "Kjetil", "Gramstad", "Trener", ["S1"]), coach("P-2", "Åse", "Ødegård", "Hjelpetrener", ["S2"])]);
const ungdom = group("UNG", "Ungdomsfotball", [["S3", "G14"]], [coach("P-1", "Kjetil", "Gramstad", "Lagleder", ["S3"]), coach("P-3", "Per", "Berg", "Trener", [])]);

describe("the trainer list across main groups", () => {
  const list = allTrainers([barn, ungdom]);

  it("lists each trainer once, with every group and team they are in", () => {
    expect(list.map((t) => t.name)).toEqual(["Kjetil Gramstad", "Per Berg", "Åse Ødegård"]);
    expect(list[0]).toMatchObject({
      roles: "Trener, Lagleder",
      groups: [
        { id: "BARN", name: "Barnefotball", teams: ["Gutter 2016"] },
        { id: "UNG", name: "Ungdomsfotball", teams: ["G14"] },
      ],
    });
  });

  it("finds trainers by name, group or team, and filters by main group", () => {
    const names = (search: string, g = "") => list.filter((t) => matchesTrainer(t, search, g)).map((t) => t.name);
    expect(names("")).toHaveLength(3);
    expect(names("ase")).toEqual(["Åse Ødegård"]);
    expect(names("kjetil ungdom")).toEqual(["Kjetil Gramstad"]);
    expect(names("2015")).toEqual(["Åse Ødegård"]);
    expect(names("", "UNG")).toEqual(["Kjetil Gramstad", "Per Berg"]);
    expect(names("per", "BARN")).toEqual([]);
  });
});

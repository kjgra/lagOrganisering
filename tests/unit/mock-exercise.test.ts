import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareExerciseKi, runExerciseKi } from "@/lib/ai/service";
import type { CurrentUser } from "@/lib/auth/current";
import type { Db } from "@/lib/db";
import { seedDemo } from "@/lib/demo/seed";
import type { Group } from "@/lib/spond/types";
import { testDb } from "../helpers/db";

describe("simulated «Ny øvelse med KI»", () => {
  let d: Db;
  const user = {
    access: { profileId: "P-ANN", groupIds: new Set(["G-FOTBALL"]) },
  } as unknown as CurrentUser;
  const team = { age_group: "G9", pitch: "", equipment: "", principles: "" };
  const make = async (wish: string) => {
    const prep = await prepareExerciseKi(
      d,
      user,
      { ai: true },
      { id: "G-FOTBALL" } as Group,
      {
        sub: "",
        theme: "Samhandling",
        themeDescription: "",
        team,
        players: 8,
        minutes: 12,
        category: "",
        wish,
        links: [],
        names: [],
        band: "8-9",
      },
    );
    return runExerciseKi(d, user, prep);
  };

  beforeAll(async () => {
    process.env.AI_MOCK = "true";
    d = await testDb();
    await seedDemo(d);
  });
  afterAll(async () => d.close());

  it("gives a new exercise for each wish, so it can be tried again and again", async () => {
    const names = [];
    for (const wish of [
      "mer pasning",
      "lite kø",
      "avslutning",
      "1 mot 1",
      "konkurranse",
    ])
      names.push((await make(wish)).name);
    expect(new Set(names).size).toBe(5);
  });

  it("gives the same exercise without a wish, which is then too similar the second time", async () => {
    expect((await make("")).name).toBe("Simulert KI-øvelse");
    await expect(make("")).rejects.toThrow(
      /ligner for mye på «Simulert KI-øvelse»/,
    );
  });
});

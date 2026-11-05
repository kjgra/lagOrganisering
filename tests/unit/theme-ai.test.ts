import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { linkThemesWithKi } from "@/lib/ai/service";
import { themeAiAnswer, wordsToAsk } from "@/lib/ai/theme-ai";
import type { CurrentUser } from "@/lib/auth/current";
import type { Db } from "@/lib/db";
import { seedDemo } from "@/lib/demo/seed";
import { autoLink, fixTypos, kiKey, normTheme, themeKey, themeLink } from "@/lib/nff/theme-link";
import type { Group } from "@/lib/spond/types";
import { listKiLinks } from "@/lib/store/training";
import { testDb } from "../helpers/db";

describe("small typos", () => {
  it("corrects them against the words the app knows", () => {
    expect(fixTypos(normTheme("Pasnig og motak"))).toBe("pasning og mottak");
    expect(fixTypos(normTheme("Sentrnig"))).toBe("sentring");
    expect(themeLink("Pasnig", "8-9")?.delferdigheter).toEqual(["delf.pasning"]);
    expect(themeKey("Pasnig")).toBe(themeKey("Pasning"));
  });

  it("leaves words it does not know, short words and holidays alone", () => {
    expect(fixTypos(normTheme("Vinterferie"))).toBe("vinterferie");
    expect(fixTypos(normTheme("Stille om"))).toBe("stille om");
    expect(fixTypos(normTheme("Mestring"))).toBe("mestring");
    expect(fixTypos(normTheme("Spilleforståelse"))).toBe("spilleforståelse");
    expect(fixTypos("1 mot 1")).toBe("1 mot 1");
  });
});

describe("KI's link of unknown words", () => {
  it("asks only about content words the word list does not know, once per key", () => {
    const ask = wordsToAsk(["Spilleforståelse", "spilleforståelse!", "Pasning", "Ferie", "", "Bredde i angrep og Lek"], "8-9", new Set());
    expect(ask.map((w) => w.theme)).toEqual(["Spilleforståelse"]);
    expect(wordsToAsk(["Spilleforståelse"], "8-9", new Set([themeKey("Spilleforståelse")]))).toEqual([]);
  });

  it("keeps only the band's own NFF ids from the answer", () => {
    const words = [{ term: "a" }, { term: "b" }];
    const text = JSON.stringify({
      koblinger: [
        { nr: 1, hovedtema: ["tema.spille-framover", "tema.score-mal", "tull"], delferdigheter: ["delf.pasning"], laeringsmomenter: ["x", "y", "z"] },
        { nr: 2, hovedtema: [], delferdigheter: [], laeringsmomenter: [] },
      ],
    });
    expect(themeAiAnswer(text, words, "8-9")).toEqual([
      { term: "a", hovedtema_ids: ["tema.spille-framover"], delferdighet_ids: ["delf.pasning"], learning_point_ids: [] },
      { term: "b", hovedtema_ids: [], delferdighet_ids: [], learning_point_ids: [] },
    ]);
  });

  it("is used after the word list, marked as KI's", () => {
    const ki = { [kiKey("Spilleforståelse", "8-9")]: { hovedtema_ids: ["tema.spille-framover"], delferdighet_ids: [], learning_point_ids: [] } };
    expect(autoLink("Spilleforståelse", "8-9", ki)).toEqual({ hovedtema: ["tema.spille-framover"], delferdigheter: [], learningPoints: [], ki: true });
    expect(autoLink("Pasning", "8-9", ki)?.ki).toBeUndefined();
    expect(autoLink("Spilleforståelse", "10-12", ki)).toBeNull();
  });
});

describe("simulated KI link of words in the årshjul", () => {
  let d: Db;
  const user = { access: { profileId: "P-ANN", groupIds: new Set(["G-FOTBALL"]) } } as unknown as CurrentUser;
  const group = { id: "G-FOTBALL", members: [{ id: "M1", name: "Ola Nordmann", firstName: "Ola" }] } as unknown as Group;

  beforeAll(async () => {
    process.env.AI_MOCK = "true";
    d = await testDb();
    await seedDemo(d);
  });
  afterAll(async () => d.close());

  it("links new words once, shared by all teams, and never sends names", async () => {
    const themes = ["Spilleforståelse", "Pasning", "Ferie", "Ola sin øvelse", "Spilleforstaaelse"];
    expect(await linkThemesWithKi(d, user, { ai: true } as never, group, "8-9", themes)).toBe(2);
    const ki = await listKiLinks(d, "8-9");
    expect(Object.keys(ki).sort()).toEqual([kiKey("Spilleforstaaelse", "8-9"), kiKey("Spilleforståelse", "8-9")].sort());
    expect(autoLink("spilleforståelse", "8-9", ki)?.ki).toBe(true);
    // Asked once: the second time nothing is sent.
    const [{ n }] = await d.query<{ n: number }>("SELECT count(*)::int AS n FROM ai_usage WHERE kind = 'themes'");
    expect(await linkThemesWithKi(d, user, { ai: true } as never, group, "8-9", themes)).toBe(0);
    const [{ n: after }] = await d.query<{ n: number }>("SELECT count(*)::int AS n FROM ai_usage WHERE kind = 'themes'");
    expect(after).toBe(n);
  });

  it("does nothing without KI rights", async () => {
    expect(await linkThemesWithKi(d, user, { ai: false } as never, group, "10-12", ["Spilleforståelse"])).toBe(0);
    expect(await listKiLinks(d, "10-12")).toEqual({});
  });
});

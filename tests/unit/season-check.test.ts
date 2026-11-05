import { describe, expect, it } from "vitest";
import { seasonCheck, seasonGaps } from "@/lib/nff/season-check";
import type { BankExercise } from "@/lib/plans/plan";

const ex = (code: string, extra: Partial<BankExercise> = {}): BankExercise => ({
  id: 1, code, name: code, category: "pasning_mottak", themes: [], min_players: 4, max_players: 8, duration_minutes: 12,
  area: "", organisation: "", execution: "", learning_points: "", questions: "", easier: "", harder: "", nff_url: "",
  drawing: null, source: "manual", based_on: "", status: "active", updated_at: new Date(),
  fb_n: 0, fb_sessions: 0, fb_bank: 0, fb_good: 0, fb_ok: 0, fb_bad: 0, fb_yes: 0, fb_changes: 0, fb_no: 0, fb_mean: null, fb_minutes: null, fb_last: null, fb_tags: {},
  bands: ["10-12"], nff_activity: "med-og-mot", nff_tags: [], ...extra,
});

const YEAR = [
  "Grunnleggende ballkontroll", "Pasning og mottak", "Dribling og finter", "Skudd og avslutning", "Forsvarsspill", "Angrepsspill",
  "Ferie", "Orientering og bevegelse uten ball", "Spilleforståelse", "Omstilling", "Forsvar", "Oppsummering og mestring",
].map((theme, i) => ({ month: i + 1, theme }));

describe("season plan checked against NFF", () => {
  it("finds what the team's year covers and what is missing", () => {
    const bank = [
      ex("p1", { nff_tags: ["delf.pasning"] }),
      ex("p2", { nff_tags: ["delf.mottak"] }),
      ex("p3", { nff_tags: ["delf.pasning"], status: "candidate" }),
      ex("p4", { nff_tags: ["delf.pasning"], bands: ["6-7"] }),
    ];
    const c = seasonCheck(YEAR, "10-12", bank);
    expect(c.months.map((m) => m.status)).toEqual([
      "koblet", "koblet", "koblet", "koblet", "koblet", "koblet", "telles-ikke", "koblet", "ikke-koblet", "koblet", "koblet", "telles-ikke",
    ]);
    // Only good exercises for the band count.
    expect(c.months[1].good).toBe(2);
    expect(c.hovedtema.every((h) => h.months.length)).toBe(true);
    expect(c.hovedtema.find((h) => h.tag === "tema.vinne-ball")?.months).toEqual([5, 11]);
    expect(c.sides).toEqual({ angrep: 6, forsvar: 2 });
    const g = seasonGaps(c);
    expect(g.hovedtema_uten_maaned).toEqual([]);
    expect(g.delferdigheter_uten_maaned).toEqual(["Heading"]);
    expect(g.maaneder_uten_kobling).toEqual([{ maaned: 9, tema: "Spilleforståelse" }]);
    expect(g.maaneder_med_for_faa_ovelser.map((m) => m.maaned)).toEqual([1, 3, 4, 5, 6, 8, 10, 11]);
  });
});

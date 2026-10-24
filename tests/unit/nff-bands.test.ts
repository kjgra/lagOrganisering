import { describe, expect, it } from "vitest";
import { bandFor, formatFor, teamAge, teamAgeText } from "@/lib/nff/bands";

describe("NFF age bands", () => {
  it("puts ages in NFF's bands up to 12", () => {
    expect([5, 6, 7, 8, 9, 10, 12, 13].map((a) => bandFor(a)?.key ?? null)).toEqual([null, "6-7", "6-7", "8-9", "8-9", "10-12", "10-12", null]);
    expect([6, 8, 10, 11, 12, 13].map(formatFor)).toEqual(["treerfotball", "femmerfotball", "sjuerfotball", "sjuerfotball", "nierfotball", null]);
  });
  it("moves the team up a band by itself from the birth year", () => {
    expect(teamAge(2016, "gutter", 2026)).toMatchObject({ short: "G10", age: 10, format: "sjuerfotball" });
    expect(teamAge(2016, "gutter", 2028).short).toBe("G12");
    expect(teamAge(2018, "jenter", 2026).band?.label).toBe("8–9 år");
    expect(teamAge(2018, "mix", 2026).short).toBe("8 år");
  });
  it("describes the team for KI, falling back to the old free text", () => {
    expect(teamAgeText(2016, "gutter", 2026)).toBe("G10 (født 2016) · NFF-bånd 10–12 år · sjuerfotball");
    expect(teamAgeText(2012, "jenter", 2026)).toBe("J14 (født 2012) · utenfor NFFs barnefotball (6–12 år)");
    expect(teamAgeText(null, null, 2026, "G10")).toBe("G10");
  });
});

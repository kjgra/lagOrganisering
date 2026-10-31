import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import pkg from "@/package.json";
import { latestVersion, parseChangelog, plainText, releaseDate, UNRELEASED } from "@/lib/changelog";

const SAMPLE = `# Versjonslogg

Innledning som ikke hører til en versjon.

## [Ikke utgitt]

## [0.2.0] – 2026-10-24

Kort om versjonen.

### Lagt til

- Ny **knapp** med \`kode\` og [lenke](https://example.com) (#12, #13).
- Migreringer (#31–#33).

### Fikset

- En feil (#5).

## [0.1.0] - 2026-10-16

### Lagt til

- Første versjon.
`;

describe("changelog", () => {
  it("reads versions, dates, summaries and groups", () => {
    const r = parseChangelog(SAMPLE);
    expect(r.map((x) => x.version)).toEqual(["0.2.0", "0.1.0"]);
    expect(r[0]).toEqual({
      version: "0.2.0",
      date: "2026-10-24",
      summary: "Kort om versjonen.",
      groups: [
        { kind: "Lagt til", items: ["Ny knapp med kode og lenke.", "Migreringer."] },
        { kind: "Fikset", items: ["En feil."] },
      ],
    });
    expect(r[1].date).toBe("2026-10-16");
  });

  it("keeps parentheses that are not PR numbers", () => {
    expect(plainText("Nivå (1–5) for spillere (#11).")).toBe("Nivå (1–5) for spillere.");
  });

  it("formats dates in Norwegian", () => {
    expect(releaseDate("2026-10-31")).toBe("31. oktober 2026");
  });

  it("CHANGELOG.md has the version in package.json as its newest release", () => {
    const r = parseChangelog(readFileSync("CHANGELOG.md", "utf8"));
    expect(latestVersion(r)).toBe(pkg.version);
    for (const x of r) {
      if (x.version !== UNRELEASED) expect(x.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

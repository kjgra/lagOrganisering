import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = path.join(process.cwd(), "public/bruksanvisning");
const html = readFileSync(path.join(dir, "index.html"), "utf8");
const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { version: string };

const parts = (v: string) => v.split(".").map(Number);
const notAfter = (a: string, b: string) => {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i];
  return true;
};

describe("bruksanvisningen", () => {
  it("names an app version that exists", () => {
    const v = html.match(/id="VERSJON">([^<]+)</)?.[1];
    expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    expect(notAfter(v!, pkg.version)).toBe(true);
  });

  it("uses every screenshot, and every screenshot it uses exists", () => {
    const used = new Set([...html.matchAll(/src="bilder\/([^"]+)"/g)].map((m) => m[1]));
    const files = new Set(readdirSync(path.join(dir, "bilder")));
    expect([...used].filter((f) => !files.has(f))).toEqual([]);
    expect([...files].filter((f) => !used.has(f))).toEqual([]);
  });

  it("gives every screenshot a text alternative", () => {
    expect(html).not.toMatch(/<img[^>]*alt=""/);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { ERROR_ISSUES_PER_DAY, errorInfo, errorIssueBody, errorIssueTitle, fingerprint, scrub } from "@/lib/error-report";
import { runMaintenance } from "@/lib/maintenance";
import { NO_RIGHTS, type Rights } from "@/lib/store/access";
import { claimIssue, listErrors, mayReopen, recordError, setIssue } from "@/lib/store/errors";
import { testDb } from "../helpers/db";

const SA: Rights = { superadmin: true, admin: true, ai: true, app: true, tags: true };

describe("error report text", () => {
  it("keeps the name, message and stack frames, and strips ids from the route", () => {
    const err = new TypeError("a?.bands.find is not a function");
    const i = errorInfo("Ny øvelse med KI", err, { route: "/g/G-123/alle/trening/ovelser/42" });
    expect(i.message).toBe("TypeError: a?.bands.find is not a function");
    expect(i.stack.split("\n")[0]).toMatch(/^at /);
    expect(i.route).toBe("/g/…/alle/trening/ovelser/…");
    expect(errorInfo("API", err, { route: "/g/[groupId]/[sub]/arrangementer" }).route).toBe("/g/[groupId]/[sub]/arrangementer");
    expect(errorInfo("X", "bare tekst").message).toBe("bare tekst");
    expect(errorInfo("X", { code: 1 }).message).toBe('{"code":1}');
    expect(errorInfo("X", new Error("x".repeat(2000))).message).toHaveLength(1000);
  });

  it("washes personal data, secrets and mentions out of the public text", () => {
    expect(scrub("Sendt til ola@example.no")).toBe("Sendt til <e-post>");
    expect(scrub("Authorization: Bearer abc.def.ghi")).toBe("Authorization: Bearer <skjult>");
    expect(scrub("ring 912 34 567")).toBe("ring <tall>");
    expect(scrub("gruppe 0A1B2C3D4E5F60718293A4B5C6D7E8F9 finnes ikke")).toBe("gruppe <id> finnes ikke");
    expect(scrub('Key (name)=(Ola Nordmann) already exists')).toBe("Key (name)=(…) already exists");
    expect(scrub('column "x" of «Kari»')).toBe('column "…" of «…»');
    expect(scrub("https://api.spond.com/x?token=abc")).toBe("https://api.spond.com/x?<…>");
    expect(scrub("hei @kjgra")).toBe("hei @​kjgra");
    expect(scrub("a?.bands.find is not a function")).toBe("a?.bands.find is not a function");
  });

  it("gives the same fingerprint when only numbers or values differ", () => {
    const a = fingerprint({ area: "KI-kall", source: "server", message: "Timeout after 3000 ms for 'Ola'" });
    const b = fingerprint({ area: "KI-kall", source: "server", message: "Timeout after 4500 ms for 'Kari'" });
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
    expect(fingerprint({ area: "Push", source: "server", message: "Timeout after 3000 ms" })).not.toBe(a);
    expect(fingerprint({ area: "KI-kall", source: "klient", message: "Timeout after 3000 ms for 'Ola'" })).not.toBe(a);
  });

  it("builds a title and body without personal data", () => {
    const i = errorInfo("Lagre opplegg", new Error('Fant ikke "Ola Nordmann" (ola@x.no)'), { route: "/g/[groupId]/[sub]/arrangementer" });
    expect(errorIssueTitle(i)).toBe('Feil i Lagre opplegg: Error: Fant ikke "…" (<e-post>)'.replace("Error: ", ""));
    const body = errorIssueBody({ ...i, fingerprint: "abc", appVersion: "1.9.0", firstSeen: new Date("2026-11-02T10:00:00Z"), count: 3, previous: 61 });
    expect(body).toContain("Feilen kom tilbake etter at #61 ble lukket.");
    expect(body).toContain("| Antall | 3 |");
    expect(body).toContain("`/g/[groupId]/[sub]/arrangementer`");
    expect(body).not.toContain("Ola");
    expect(body).not.toContain("ola@x.no");
  });
});

describe("error log store", () => {
  let d: Db;
  beforeAll(async () => {
    d = await testDb();
  });
  afterAll(() => d.close());

  const info = (message: string) => errorInfo("KI-kall", new Error(message));

  it("counts repeats on one row and lists them for the superadmin only", async () => {
    const i = info("boom 1");
    const fp = fingerprint(i);
    const first = await recordError(d, fp, i, "1.9.0");
    const again = await recordError(d, fp, info("boom 2"), "1.9.1");
    expect(again.id).toBe(first.id);
    expect(again.count).toBe(2);
    expect(again.message).toBe("boom 2");
    expect(again.app_version).toBe("1.9.1");
    expect((await listErrors(d, SA)).map((e) => e.id)).toContain(first.id);
    await expect(listErrors(d, { ...NO_RIGHTS, admin: true, app: true })).rejects.toThrow(/superadmin/);
  });

  it("claims a new issue once, then only checks again in a newer version", async () => {
    const i = info("claim me");
    const row = await recordError(d, fingerprint(i), i, "1.9.0");
    expect(await claimIssue(d, row.id, "1.9.0")).toBe("ny");
    expect(await claimIssue(d, row.id, "1.9.0")).toBeNull();
    await setIssue(d, row.id, { number: 70, url: "https://github.com/x/y/issues/70" }, "1.9.0");
    expect(await claimIssue(d, row.id, "1.9.0")).toBeNull();
    expect(await claimIssue(d, row.id, "1.9.1")).toBe("sjekk");
    expect(await claimIssue(d, row.id, "1.9.1")).toBeNull();
  });

  it("stops new issues after the daily limit", async () => {
    for (let n = 0; n < ERROR_ISSUES_PER_DAY; n++) {
      const i = info(`limit ${String.fromCharCode(97 + n)}`);
      const row = await recordError(d, fingerprint(i), i, "1.9.0");
      if ((await claimIssue(d, row.id, "1.9.0")) === "ny") await setIssue(d, row.id, { number: 100 + n, url: "u" }, "1.9.0");
    }
    expect(await mayReopen(d)).toBe(false);
    const i = info("one too many");
    const row = await recordError(d, fingerprint(i), i, "1.9.0");
    expect(await claimIssue(d, row.id, "1.9.0")).toBeNull();
  });

  it("deletes rows not seen for 90 days in the maintenance", async () => {
    const i = info("old one");
    const row = await recordError(d, fingerprint(i), i, "1.0.0");
    await d.query("UPDATE error_events SET last_seen = now() - interval '91 days' WHERE id = $1", [row.id]);
    const r = await runMaintenance(d);
    expect(r.errors).toBe(1);
    expect((await listErrors(d, SA, 500)).some((e) => e.id === row.id)).toBe(false);
  });
});

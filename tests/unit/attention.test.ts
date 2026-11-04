import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_TABS } from "@/components/settings/SettingsShell";
import { adminAttention, ATTENTION_SOURCES, attentionTotal, badgeText, settingsLabel, tabAttention, type AttentionSource } from "@/lib/attention";
import type { Db } from "@/lib/db";
import { NO_RIGHTS, type Rights } from "@/lib/store/access";
import { addFeedback, deleteFeedback } from "@/lib/store/feedback";
import { testDb } from "../helpers/db";

const SA: Rights = { superadmin: true, admin: true, ai: true, app: true, tags: true };
const ADMIN: Rights = { ...NO_RIGHTS, admin: true, app: true };

describe("attention badges", () => {
  let d: Db;
  beforeAll(async () => {
    d = await testDb();
  });
  afterAll(async () => {
    await d.close();
  });

  it("every source belongs to an admin tab", () => {
    for (const s of ATTENTION_SOURCES) expect(ADMIN_TABS.map((t) => t.key as string)).toContain(s.tab);
  });

  it("counts waiting feedback for the superadmin only, until it is handled", async () => {
    expect(await adminAttention(d, SA)).toEqual({});
    const id = await addFeedback(d, "P1", { kind: "feil", body: "Lagre virker ikke", page: "/", appVersion: "1.26.0", client: "", role: "trener" });
    await addFeedback(d, "P1", { kind: "forslag", body: "Kopier opplegg", page: "/", appVersion: "1.26.0", client: "", role: "trener" });
    const a = await adminAttention(d, SA);
    expect(a).toEqual({ tilbakemeldinger: 2 });
    expect(attentionTotal(a)).toBe(2);
    expect(settingsLabel(a)).toBe("Innstillinger: 2 tilbakemeldinger venter");
    expect(tabAttention(a, "tilbakemeldinger")).toBe("2 tilbakemeldinger venter");
    expect(tabAttention(a, "ki")).toBe("");
    expect(await adminAttention(d, ADMIN)).toEqual({});
    expect(await adminAttention(d, NO_RIGHTS)).toEqual({});
    await deleteFeedback(d, SA, id);
    expect(settingsLabel(await adminAttention(d, SA))).toBe("Innstillinger: 1 tilbakemelding venter");
  });

  it("a failing source counts as nothing, and badges stay small", async () => {
    const broken: AttentionSource = { tab: "feillogg", describe: (n) => `${n} nye`, count: () => Promise.reject(new Error("db")) };
    const many: AttentionSource = { tab: "ki", describe: (n) => `${n} nye`, count: async () => 12 };
    const a = await adminAttention(d, SA, [broken, many]);
    expect(a).toEqual({ ki: 12 });
    expect(settingsLabel(a)).toBe("Innstillinger");
    expect(settingsLabel(a, [broken, many])).toBe("Innstillinger: 12 nye");
    expect(badgeText(3)).toBe("3");
    expect(badgeText(12)).toBe("9+");
  });
});

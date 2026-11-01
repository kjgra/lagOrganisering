import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { cleanPage, clientSummary, FEEDBACK_DAILY_LIMIT, feedbackProblem, issueBody, issueLabels, issueTitle } from "@/lib/feedback";
import { NO_RIGHTS, type Rights } from "@/lib/store/access";
import { addFeedback, deleteFeedback, feedbackInbox, getWaitingFeedback, markFeedbackSent, waitingFeedbackCount, type NewFeedback } from "@/lib/store/feedback";
import { testDb } from "../helpers/db";

const SA: Rights = { superadmin: true, admin: true, ai: true, app: true, tags: true };
const ADMIN: Rights = { ...NO_RIGHTS, admin: true, app: true };
const f = (x: Partial<NewFeedback> = {}): NewFeedback => ({ kind: "feil", body: "Lagre-knappen virker ikke", page: "/g/…/…/arrangementer", appVersion: "1.6.0", client: "mobil (390 px), iOS, Safari", role: "trener", ...x });

describe("feedback text and issue", () => {
  it("refuses names, contact details and sensitive words", () => {
    const names = ["Ola Nordmann", "Ola", "Kari"];
    expect(feedbackProblem("Lagre virker ikke på trening", names)).toBeNull();
    expect(feedbackProblem("hei", names)).toMatch(/Skriv litt mer/);
    expect(feedbackProblem("Kari kom ikke med på laget", names)).toMatch(/«Kari»/);
    expect(feedbackProblem("Ring meg på 912 34 567", names)).toMatch(/telefonnummer/);
    expect(feedbackProblem("Send svar til a@b.no takk", names)).toMatch(/e-post/);
    expect(feedbackProblem("En spiller er skadet og vises feil", names)).toMatch(/sensitive/);
    expect(feedbackProblem("x".repeat(2001), names)).toMatch(/maks 2000/);
  });

  it("removes ids from the page and keeps only a short device summary", () => {
    expect(cleanPage("/g/G-FOTBALL/S-G2016/arrangementer/E-123?x=1")).toBe("/g/…/…/arrangementer/…");
    expect(cleanPage("/g/0A1B2C/alle/trening/ovelser/42/evaluering")).toBe("/g/…/alle/trening/ovelser/…/evaluering");
    expect(cleanPage("https://evil.example/x")).toBe("");
    expect(cleanPage("//evil.example")).toBe("");
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    expect(clientSummary(iphone, 390)).toBe("mobil (390 px), iOS, Safari");
    expect(clientSummary("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0", 1440)).toBe("PC (1440 px), Windows, Edge");
    expect(clientSummary("", null)).toBe("");
  });

  it("builds a title, body and labels without the sender, and without @mentions", () => {
    const r = { kind: "forslag" as const, body: "Kopier opplegg til neste uke\nogså for @kjgra", page: "/g/…/…/trening", appVersion: "1.6.0", client: "PC (1440 px)", role: "trener" as const, createdAt: new Date("2026-11-01T10:00:00Z") };
    expect(issueTitle(r)).toBe("Forslag: Kopier opplegg til neste uke også for @​kjgra");
    expect(issueTitle({ kind: "feil", body: "a".repeat(100) })).toHaveLength("Feil: ".length + 70);
    const body = issueBody(r);
    expect(body).toContain("> Kopier opplegg til neste uke\n> også for @​kjgra");
    expect(body).toContain("| Side | `/g/…/…/trening` |");
    expect(body).toContain("| Versjon | 1.6.0 |");
    expect(body).toContain("| Sendt | 2026-11-01 |");
    expect(issueLabels("feil")).toEqual(["tilbakemelding", "feil"]);
  });
});

describe("feedback store", () => {
  let d: Db;
  beforeAll(async () => {
    d = await testDb();
  });
  afterAll(async () => {
    await d.close();
  });

  it("limits each person per day, and only the superadmin reads and decides", async () => {
    for (let i = 0; i < FEEDBACK_DAILY_LIMIT; i++) await addFeedback(d, "P1", f({ body: `Melding ${i}` }));
    await expect(addFeedback(d, "P1", f())).rejects.toThrow(/5 tilbakemeldinger det siste døgnet/);
    const other = await addFeedback(d, "P2", f({ kind: "forslag", body: "Et forslag" }));

    await expect(feedbackInbox(d, ADMIN)).rejects.toThrow(/Bare superadmin/);
    expect(await waitingFeedbackCount(d, ADMIN)).toBe(0);
    expect(await waitingFeedbackCount(d, SA)).toBe(6);

    const r = await getWaitingFeedback(d, SA, other);
    expect(r.author).toBe("P2");
    await markFeedbackSent(d, SA, "P-SA", other, "Et rettet forslag", { number: 7, url: "https://github.com/x/y/issues/7" });
    await expect(getWaitingFeedback(d, SA, other)).rejects.toThrow(/allerede sendt/);

    const first = (await feedbackInbox(d, SA)).waiting[0];
    await expect(deleteFeedback(d, ADMIN, first.id)).rejects.toThrow(/Bare superadmin/);
    await deleteFeedback(d, SA, first.id);
    await expect(deleteFeedback(d, SA, first.id)).rejects.toThrow(/allerede behandlet/);

    const inbox = await feedbackInbox(d, SA);
    expect(inbox.waiting).toHaveLength(4);
    expect(inbox.sent.map((x) => [x.body, x.issue_number, x.decided_by])).toEqual([["Et rettet forslag", 7, "P-SA"]]);
  });
});

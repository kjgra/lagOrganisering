import { describe, expect, it } from "vitest";
import { planPdf } from "@/lib/pdf/plan-pdf";
import { validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";

describe("plan PDF", () => {
  it("renders the reference plan with groups", async () => {
    const plan = validatePlan(reference);
    const buf = await planPdf({
      plan,
      info: ["Tor 15. okt", "17:30–18:45", "Gutter 2016"],
      footer: `${plan.tema} · Laget med Nymark – Gruppeorganisering`,
      groups: [
        { name: "Lag 1", players: ["Emil", "Jonas"] },
        { name: "Lag 2", players: ["Sander", "Noah"] },
      ],
    });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(20_000);
    if (process.env.PDF_OUT) (await import("node:fs")).writeFileSync(process.env.PDF_OUT, buf);
  }, 60_000);
});

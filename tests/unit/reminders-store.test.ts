import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { validatePlan } from "@/lib/plans/plan";
import reference from "@/lib/plans/reference-plan.json";
import type { Access } from "@/lib/store/access";
import { dueReminders, markReminded, pendingEvaluations, savePushSubscription, syncPlanTimes, deletePushSubscription } from "@/lib/store/reminders";
import { approvePlan, saveFeedback, savePlan } from "@/lib/store/training";
import { testDb } from "../helpers/db";

let d: Db;
const ann: Access = { profileId: "P-ANN", groupIds: new Set(["G1"]) };
const bo: Access = { profileId: "P-BO", groupIds: new Set(["G1", "G2"]) };
const plan = validatePlan(reference);
const now = new Date("2026-10-28T19:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
const keys = (n: string) => ({ endpoint: `https://push.example/${n}`, p256dh: "p", auth: "a" });

beforeAll(async () => {
  d = await testDb();
});
afterAll(async () => d.close());

describe("reminders after training", () => {
  it("knows which trainings each trainer has not evaluated, from the plan's training time", async () => {
    // E1 ended 30 min ago (two versions, the first approved); E2 is later today; E3 had no time until the event list synced it.
    const v1 = await savePlan(d, ann, "G1", "E1", plan, { eventStart: ago(120), eventEnd: ago(30) });
    await savePlan(d, ann, "G1", "E1", { ...plan, tittel: "Ny versjon" }, { eventStart: ago(120), eventEnd: ago(30) });
    await approvePlan(d, ann, v1.id);
    await savePlan(d, ann, "G1", "E2", plan, { eventStart: ago(-60), eventEnd: ago(-120) });
    await savePlan(d, ann, "G1", "E3", { ...plan, tittel: "Gammel økt" });
    await syncPlanTimes(d, ann, "G1", [{ id: "E3", start: ago(3 * 24 * 60 + 90), end: ago(3 * 24 * 60) }]);

    const pending = await pendingEvaluations(d, ann, "G1", now);
    expect(pending.map((p) => [p.eventId, p.planId === v1.id, p.title])).toEqual([
      ["E1", true, plan.tittel],
      ["E3", false, "Gammel økt"],
    ]);

    await saveFeedback(d, ann, v1.id, [{ exercise_no: null, exercise_code: "", rating: 3, tags: [], actual_minutes: null, actual_players: 10, body: "", use_again: "" }], null);
    expect((await pendingEvaluations(d, ann, "G1", now)).map((p) => p.eventId)).toEqual(["E3"]);
    expect((await pendingEvaluations(d, bo, "G1", now)).map((p) => p.eventId)).toEqual(["E1", "E3"]);
  });

  it("pushes once per trainer and training, to all their devices, only for their groups and only when not evaluated", async () => {
    await savePushSubscription(d, ann, keys("ann"));
    await savePushSubscription(d, bo, keys("bo-phone"));
    await savePushSubscription(d, bo, keys("bo-pad"));
    await savePushSubscription(d, { profileId: "P-CY", groupIds: new Set(["G2"]) }, keys("cy"));

    // E1 ended 30 min ago: due for Bo (Ann evaluated, Cy has another group). E3 is too old for push, E2 is not over.
    const due = await dueReminders(d, now);
    expect(due.map((r) => [r.profileId, r.eventId, r.subscriptions.length])).toEqual([["P-BO", "E1", 2]]);
    expect(await dueReminders(d, new Date(now.getTime() - 20 * 60_000))).toEqual([]);

    expect(await markReminded(d, due[0])).toBe(true);
    expect(await markReminded(d, due[0])).toBe(false);
    expect(await dueReminders(d, now)).toEqual([]);
  });

  it("turns push off for one device", async () => {
    await deletePushSubscription(d, bo, keys("bo-pad").endpoint);
    await deletePushSubscription(d, ann, keys("bo-phone").endpoint); // not Ann's
    const rows = await d.query<{ endpoint: string }>("SELECT endpoint FROM push_subscriptions WHERE spond_profile_id = 'P-BO'");
    expect(rows.map((r) => r.endpoint)).toEqual([keys("bo-phone").endpoint]);
  });
});

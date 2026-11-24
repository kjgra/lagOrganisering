import { describe, expect, it } from "vitest";
import { kiProgress, kiStep, PLAN_STEPS } from "@/lib/ki-progress";

describe("kiProgress", () => {
  it("is linear to 90 % at the expected time", () => {
    expect(kiProgress(0, 40_000)).toBe(0);
    expect(kiProgress(20_000, 40_000)).toBeCloseTo(0.45);
    expect(kiProgress(40_000, 40_000)).toBeCloseTo(0.9);
  });
  it("creeps on but never reaches done after the expected time", () => {
    const a = kiProgress(60_000, 40_000);
    const b = kiProgress(400_000, 40_000);
    expect(a).toBeGreaterThan(0.9);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(0.97);
  });
  it("uses at least 5 s as the expected time", () => {
    expect(kiProgress(5_000, 100)).toBeCloseTo(0.9);
  });
});

describe("kiStep", () => {
  it("walks through the steps and stays on the last", () => {
    expect(kiStep(PLAN_STEPS, 0)).toBe(PLAN_STEPS[0]);
    expect(kiStep(PLAN_STEPS, 0.5)).toBe(PLAN_STEPS[2]);
    expect(kiStep(PLAN_STEPS, 0.96)).toBe(PLAN_STEPS[3]);
  });
});

describe("typicalDuration", () => {
  it("is the median of successful calls for the kind and model", async () => {
    const { testDb } = await import("../helpers/db");
    const { logAiUsage, typicalDuration } = await import("@/lib/store/ai");
    const d = await testDb();
    const access = { profileId: "P-1", groupIds: new Set(["G1"]) };
    const row = { kind: "draft" as const, model: "m", input_tokens: 1, output_tokens: 1, cache_read_tokens: 0, cache_write_tokens: 0, cost_usd: 0, error_code: "" };
    expect(await typicalDuration(d, ["draft"], "m")).toBeNull();
    for (const ms of [20_000, 30_000, 40_000]) await logAiUsage(d, access, "G1", { ...row, duration_ms: ms, status: "ok" }, null);
    await logAiUsage(d, access, "G1", { ...row, duration_ms: 900_000, status: "error" }, null);
    await logAiUsage(d, access, "G1", { ...row, kind: "exercise", duration_ms: 1_000, status: "ok" }, null);
    expect(await typicalDuration(d, ["draft"], "m")).toBe(30_000);
    await d.close();
  });
});

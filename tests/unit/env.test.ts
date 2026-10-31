import { afterEach, describe, expect, it, vi } from "vitest";

const load = async (vars: Record<string, string>) => {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return (await import("@/lib/env")).env;
};

afterEach(() => vi.unstubAllEnvs());

describe("env", () => {
  it("refuses simulated Spond with a remote database", async () => {
    const env = await load({ SPOND_MOCK: "true", DATABASE_URL: "postgresql://u:p@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" });
    expect(() => env()).toThrow(/SPOND_MOCK/);
  });

  it("allows simulated Spond with a local database or none", async () => {
    expect((await load({ SPOND_MOCK: "true", DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/postgres" }))().SPOND_MOCK).toBe(true);
    expect((await load({ SPOND_MOCK: "true", DATABASE_URL: "" }))().SPOND_MOCK).toBe(true);
  });
});

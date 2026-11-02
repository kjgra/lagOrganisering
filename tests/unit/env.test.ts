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

describe("database region", () => {
  const prod = { VERCEL_ENV: "production", SESSION_SECRET: "x".repeat(40) };

  it("accepts the Supabase pooler in Ireland in production", async () => {
    const env = await load({ ...prod, DATABASE_URL: "postgresql://postgres.ref:p@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" });
    expect(env().DATABASE_URL).toContain("eu-west-1");
  });

  it("refuses another region or the direct connection in production", async () => {
    for (const url of [
      "postgresql://postgres.ref:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      "postgresql://postgres:p@db.ref.supabase.co:5432/postgres",
      "postgresql://postgres.ref:p@aws-0-eu-west-1.pooler.supabase.com.evil.example:6543/postgres",
    ]) {
      const env = await load({ ...prod, DATABASE_URL: url });
      expect(() => env()).toThrow(/eu-west-1/);
    }
  });

  it("does not check the region outside production", async () => {
    const env = await load({ DATABASE_URL: "postgresql://postgres.ref:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres" });
    expect(env().DATABASE_URL).toContain("us-east-1");
  });
});

describe("demo deployment", () => {
  const demo = { VERCEL_ENV: "production", APP_ENV: "DEMO", SPOND_MOCK: "true", AI_MOCK: "true", SESSION_SECRET: "x".repeat(40) };

  it("runs simulated in production with APP_ENV=DEMO", async () => {
    const env = await load({ ...demo, DATABASE_URL: "", ANTHROPIC_API_KEY: "", GITHUB_FEEDBACK_TOKEN: "" });
    expect(env().SPOND_MOCK).toBe(true);
    const { envLabel } = await import("@/lib/env");
    expect(envLabel()).toBe("DEMO");
  });

  it("still refuses simulation in production without APP_ENV=DEMO", async () => {
    const env = await load({ ...demo, APP_ENV: "" });
    expect(() => env()).toThrow(/SPOND_MOCK kan ikke/);
  });

  it("refuses a database, KI key, feedback token or missing secret in demo", async () => {
    for (const [k, v, msg] of [
      ["DATABASE_URL", "postgresql://u:p@localhost:5432/postgres", /DATABASE_URL/],
      ["ANTHROPIC_API_KEY", "sk-test", /ANTHROPIC_API_KEY/],
      ["GITHUB_FEEDBACK_TOKEN", "ghp_test", /GITHUB_FEEDBACK_TOKEN/],
      ["SESSION_SECRET", "short", /SESSION_SECRET/],
      ["SPOND_MOCK", "false", /SPOND_MOCK/],
    ] as const) {
      const env = await load({ DATABASE_URL: "", ANTHROPIC_API_KEY: "", GITHUB_FEEDBACK_TOKEN: "", ...demo, [k]: v });
      expect(() => env()).toThrow(msg);
    }
  });
});

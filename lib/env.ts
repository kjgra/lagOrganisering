import "server-only";
import { z } from "zod";

/**
 * Environment variables, checked once. Secrets are never logged.
 *
 * Simulation: with SPOND_MOCK=true the app uses a fake Spond with demo data,
 * without DATABASE_URL it uses PGlite (Postgres in the process), and with
 * AI_MOCK=true (and no ANTHROPIC_API_KEY) KI answers with a canned plan.
 * Production (VERCEL_ENV=production) refuses all three. SPOND_MOCK with a
 * remote DATABASE_URL is refused everywhere: the public demo logins would
 * give superadmin on real data.
 */

const list = (fallback: string[]) =>
  z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.split(",").map((x) => x.trim()).filter(Boolean) : fallback));

const flag = z
  .string()
  .optional()
  .transform((s) => s === "true" || s === "1");

const schema = z.object({
  APP_ENV: z.string().optional().default(""),
  SESSION_SECRET: z.string().optional().default(""),
  DATABASE_URL: z.string().optional().default(""),
  PGLITE_DIR: z.string().optional().default(""),
  SPOND_MOCK: flag,
  SUPERADMIN_PROFILE_ID: z.string().optional().default(""),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  AI_MOCK: flag,
  ACCESS_ROLE_NAMES: list(["Teamleder", "Trener", "Lagleder", "Hovedlagleder"]),
  COACH_ROLE_NAMES: list([
    "Teamleder",
    "Trener",
    "Lagleder",
    "Hovedlagleder",
    "Hjelpetrener",
    "Keepertrener",
    "Hjelper",
  ]),
  TAG_SUGGESTIONS: list(["Keeper", "Kaptein", "Forsvar", "Midtbane", "Angrep", "Ny"]),
  VAPID_PUBLIC_KEY: z.string().optional().default(""),
  VAPID_PRIVATE_KEY: z.string().optional().default(""),
  VAPID_SUBJECT: z.string().optional().default(""),
  CRON_SECRET: z.string().optional().default(""),
  VERCEL_ENV: z.string().optional().default(""),
  NODE_ENV: z.string().optional().default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

// A fixed key for local simulation only. Production must set SESSION_SECRET.
const DEV_SECRET = "dev-only-secret-not-for-production-use-0123456789";

/**
 * The app's region: Supabase prod is in Ireland (eu-west-1), and the Vercel
 * functions run in Dublin (dub1, see vercel.json), so personal data stays
 * in the EU and every database call is short.
 */
export const DB_REGION = "eu-west-1";

/**
 * True when the URL points at the Supabase pooler in DB_REGION
 * (aws-0-eu-west-1.pooler.supabase.com). The direct connection
 * (db.<ref>.supabase.co) does not show the region and is refused.
 */
export function isDbInRegion(url: string, region = DB_REGION): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return new RegExp(`^aws-\\d+-${region.replace(/[^a-z0-9-]/g, "")}\\.pooler\\.supabase\\.com$`).test(host);
  } catch {
    return false;
  }
}

/** A Postgres on this machine (local development or CI), not Supabase. */
export function isLocalDb(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.parse(process.env);
  const prod = parsed.VERCEL_ENV === "production";
  if (prod) {
    const problems = [
      parsed.SPOND_MOCK && "SPOND_MOCK kan ikke brukes i produksjon",
      parsed.AI_MOCK && "AI_MOCK kan ikke brukes i produksjon",
      !parsed.DATABASE_URL && "DATABASE_URL mangler",
      parsed.DATABASE_URL && !isDbInRegion(parsed.DATABASE_URL) && `DATABASE_URL må gå til Supabase-pooleren i ${DB_REGION} (Irland)`,
      parsed.SESSION_SECRET.length < 32 && "SESSION_SECRET må ha minst 32 tegn",
    ].filter(Boolean);
    if (problems.length) throw new Error(`Feil i miljøvariabler: ${problems.join("; ")}.`);
  }
  if (parsed.SPOND_MOCK && parsed.DATABASE_URL && !isLocalDb(parsed.DATABASE_URL)) {
    throw new Error("Feil i miljøvariabler: SPOND_MOCK kan ikke brukes med en ekstern DATABASE_URL (demokontoene ville fått tilgang til ekte data).");
  }
  if (!parsed.SESSION_SECRET) {
    if (parsed.NODE_ENV === "production" && !parsed.SPOND_MOCK) {
      throw new Error("Feil i miljøvariabler: SESSION_SECRET mangler.");
    }
    parsed.SESSION_SECRET = DEV_SECRET;
  }
  cached = parsed;
  return parsed;
}

/** "TEST", "DEMO" or "" for production, shown next to the logo. */
export function envLabel(): string {
  const e = env();
  const label = e.APP_ENV.trim().toUpperCase();
  if (label && label !== "PROD" && label !== "PRODUCTION") return label.replace(/[^A-Z0-9 _-]/g, "").slice(0, 12);
  if (e.SPOND_MOCK) return "DEMO";
  return "";
}

export function appTitle(): string {
  const name = "Nymark – Gruppeorganisering";
  const label = envLabel();
  return label ? `${name} (${label})` : name;
}

/** The demo superadmin of the simulated Spond (lib/spond/mock.ts). */
export const DEMO_SUPERADMIN = "P-KJETIL";

/**
 * The superadmin's Spond profile id. With simulated Spond the demo account
 * kjetil@demo.no is superadmin, whatever SUPERADMIN_PROFILE_ID says (that id
 * is a real Spond profile, which does not exist in the demo data).
 */
export function superadminId(): string {
  const e = env();
  return e.SPOND_MOCK ? DEMO_SUPERADMIN : e.SUPERADMIN_PROFILE_ID.trim();
}

export function aiMode(): "real" | "mock" | "off" {
  const e = env();
  if (e.ANTHROPIC_API_KEY) return "real";
  if (e.AI_MOCK) return "mock";
  return "off";
}

/** Web Push keys, or null when push is not set up (then the app only reminds in the app). */
export function vapid(): { publicKey: string; privateKey: string; subject: string } | null {
  const e = env();
  const subject = e.VAPID_SUBJECT.trim();
  if (!e.VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY || !/^(mailto:|https:)/.test(subject)) return null;
  return { publicKey: e.VAPID_PUBLIC_KEY.trim(), privateKey: e.VAPID_PRIVATE_KEY.trim(), subject };
}

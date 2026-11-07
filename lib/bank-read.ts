import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db, type Db } from "@/lib/db";
import { createPostgresDb } from "@/lib/db/postgres";
import { env } from "@/lib/env";

/**
 * Read-only access to the shared exercise bank and what improves it, for
 * Claude (GET /api/ovelsesbank). Reads only the views in the schema
 * `ovelsesbank` (migration 20261118000000_ovelsesbank_les.sql), connected as
 * the role `claude_les`, which can read nothing else: no players, no tags,
 * no levels, no person ids.
 */

export const BANK_VIEWS = [
  "ovelser",
  "versjoner",
  "evalueringer",
  "kommentarer",
  "observasjoner",
  "monstre",
  "forbedringer",
  "endringer",
  "laerdommer",
] as const;

export type BankView = (typeof BANK_VIEWS)[number];

const ORDER: Record<BankView, string> = {
  ovelser: "code",
  versjoner: "exercise_code, version",
  evalueringer: "id",
  kommentarer: "id",
  observasjoner: "id",
  monstre: "exercise_code",
  forbedringer: "id",
  endringer: "id",
  laerdommer: "id",
};

/** The token must be long enough to be a secret; shorter turns the endpoint off. */
export const MIN_TOKEN_LENGTH = 32;

export function bankReadToken(): string | null {
  const t = env().BANK_READ_TOKEN.trim();
  return t.length >= MIN_TOKEN_LENGTH ? t : null;
}

export function isBankReader(authorization: string | null, token: string | null): boolean {
  if (!token) return false;
  const a = Buffer.from(authorization ?? "");
  const b = Buffer.from(`Bearer ${token}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Rows of the given views, each in a stable order. */
export async function readBank(d: Db, views: readonly BankView[]): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  for (const v of views) out[v] = await d.query(`SELECT * FROM ovelsesbank.${v} ORDER BY ${ORDER[v]}`);
  return out;
}

const g = globalThis as unknown as { __bankReader?: Db };

/**
 * Runs `fn` as the role claude_les: through BANK_READ_DATABASE_URL in
 * production and preview, or in simulation (PGlite) by switching role inside
 * a transaction. Null when no reader is set up.
 */
export async function asBankReader<T>(fn: (d: Db) => Promise<T>): Promise<T | null> {
  const e = env();
  if (e.BANK_READ_DATABASE_URL) {
    g.__bankReader ??= createPostgresDb(e.BANK_READ_DATABASE_URL);
    return g.__bankReader.tx(fn);
  }
  if (e.DATABASE_URL) return null;
  return (await db()).tx(async (t) => {
    await t.query("SET LOCAL ROLE claude_les");
    return fn(t);
  });
}

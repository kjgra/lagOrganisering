import "server-only";
import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * The login session: the Spond token and profile id, encrypted (JWE,
 * A256GCM) in an httpOnly cookie. JavaScript in the browser cannot read it,
 * and without SESSION_SECRET nobody can decrypt it. The password is never
 * part of it.
 */

export const SESSION_COOKIE = "nymark_session";
const MAX_HOURS = 12;

export interface Session {
  /** Spond access token. Never sent to the browser in readable form. */
  token: string;
  profileId: string;
  /** Random id for this login (edit locks, throttling); not secret. */
  sid: string;
  /** Unix seconds. */
  exp: number;
}

let keyCache: { secret: string; key: Uint8Array } | null = null;

async function key(): Promise<Uint8Array> {
  const secret = env().SESSION_SECRET;
  if (keyCache?.secret === secret) return keyCache.key;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  keyCache = { secret, key: new Uint8Array(digest) };
  return keyCache.key;
}

export async function sealSession(s: Omit<Session, "exp">, expiration: string | null): Promise<{ value: string; exp: number }> {
  const max = Math.floor(Date.now() / 1000) + MAX_HOURS * 3600;
  const spondExp = expiration ? Math.floor(Date.parse(expiration) / 1000) : NaN;
  const exp = Number.isFinite(spondExp) ? Math.min(max, spondExp) : max;
  const value = await new EncryptJWT({ t: s.token, p: s.profileId, s: s.sid })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .encrypt(await key());
  return { value, exp };
}

export async function unsealSession(value: string): Promise<Session | null> {
  try {
    const { payload } = await jwtDecrypt(value, await key());
    const { t, p, s, exp } = payload as { t?: unknown; p?: unknown; s?: unknown; exp?: number };
    if (typeof t !== "string" || typeof p !== "string" || typeof s !== "string" || !exp) return null;
    return { token: t, profileId: p, sid: s, exp };
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? unsealSession(value) : null;
}

export async function writeSession(s: Omit<Session, "exp">, expiration: string | null): Promise<void> {
  const { value, exp } = await sealSession(s, expiration);
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp * 1000),
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

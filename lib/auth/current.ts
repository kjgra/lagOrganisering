import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { spond, SpondError } from "@/lib/spond";
import { sessionData } from "@/lib/spond/data";
import type { Group, SessionData } from "@/lib/spond/types";
import { NO_RIGHTS, userRights, type Access, type Rights } from "@/lib/store/access";
import { getRole } from "@/lib/store/roles";
import { readSession, type Session } from "./session";

/**
 * The data access layer for the logged-in user. Server Components, Server
 * Actions and Route Handlers get the user here, never from the browser.
 *
 * The minimised Spond data (groups, members) is kept in memory per server
 * instance for a few minutes, keyed by the login's random id, so not every
 * page needs a round trip to Spond. It is never written to the database.
 */

export interface CurrentUser {
  session: Session;
  data: SessionData;
  rights: Rights;
  access: Access;
}

const TTL_MS = 10 * 60_000;
const g = globalThis as unknown as { __nymarkSessionCache?: Map<string, { data: SessionData; until: number }> };
const sessionCache: Map<string, { data: SessionData; until: number }> = (g.__nymarkSessionCache ??= new Map());

function prune(now: number) {
  for (const [k, v] of sessionCache) if (v.until < now) sessionCache.delete(k);
}

export function cacheSessionData(sid: string, data: SessionData): void {
  prune(Date.now());
  sessionCache.set(sid, { data, until: Date.now() + TTL_MS });
}

export function forgetSessionData(sid: string): void {
  sessionCache.delete(sid);
}

export async function loadSessionData(token: string): Promise<SessionData> {
  const api = spond();
  const [groups, profile] = await Promise.all([api.groups(token), api.profile(token)]);
  const e = env();
  return sessionData(groups, profile, e.ACCESS_ROLE_NAMES, e.COACH_ROLE_NAMES);
}

/** Rights read from the database now (never cached), so a right taken away stops working at once. */
export async function readRights(profileId: string): Promise<Rights> {
  const sa = env().SUPERADMIN_PROFILE_ID;
  if (userRights(profileId, null, sa).superadmin) return userRights(profileId, null, sa);
  try {
    return userRights(profileId, await getRole(await db(), profileId), sa);
  } catch (err) {
    console.error("Lesing av rettigheter feilet:", (err as Error).message);
    return NO_RIGHTS;
  }
}

export type CurrentUserResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; reason: "logged_out" | "expired" | "no_role" | "no_app" | "spond_down" };

export const getCurrentUser = cache(async (): Promise<CurrentUserResult> => {
  const session = await readSession();
  if (!session) return { ok: false, reason: "logged_out" };
  let data = sessionCache.get(session.sid);
  if (!data || data.until < Date.now()) {
    try {
      const fresh = await loadSessionData(session.token);
      cacheSessionData(session.sid, fresh);
      data = sessionCache.get(session.sid)!;
    } catch (err) {
      if (err instanceof SpondError && err.code === "expired") return { ok: false, reason: "expired" };
      console.error("Henting av Spond-data feilet:", (err as Error).message);
      return { ok: false, reason: "spond_down" };
    }
  }
  if (data.data.profile.id !== session.profileId) return { ok: false, reason: "expired" };
  if (!data.data.groups.length) return { ok: false, reason: "no_role" };
  const rights = await readRights(session.profileId);
  if (!rights.app) return { ok: false, reason: "no_app" };
  return {
    ok: true,
    user: {
      session,
      data: data.data,
      rights,
      access: { profileId: session.profileId, groupIds: new Set(data.data.groups.map((x) => x.id)) },
    },
  };
});

/** The user, or a redirect to the login page with the reason. */
export async function requireUser(): Promise<CurrentUser> {
  const res = await getCurrentUser();
  if (res.ok) return res.user;
  if (res.reason === "logged_out") redirect("/logg-inn");
  if (res.reason === "spond_down") redirect("/feil?grunn=spond");
  redirect(`/logg-ut?grunn=${res.reason}`);
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await requireUser();
  if (!u.rights.admin) redirect("/");
  return u;
}

/** The main group, or a redirect if the user does not have access to it. */
export function findGroup(user: CurrentUser, groupId: string): Group {
  const group = user.data.groups.find((x) => x.id === groupId);
  if (!group) redirect("/velg-gruppe");
  return group;
}

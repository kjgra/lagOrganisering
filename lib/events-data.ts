import "server-only";
import { redirect } from "next/navigation";
import type { CurrentUser } from "@/lib/auth/current";
import { spond, SpondError } from "@/lib/spond";
import { eventsForContext } from "@/lib/spond/events";
import type { RawEvent, SpondEvent } from "@/lib/spond/types";

/**
 * Events from Spond for a main group. Upcoming events are fetched for the
 * whole main group and filtered per subgroup, so switching subgroup needs no
 * new fetch. Kept in memory for a minute per login; «Oppdater» fetches anew.
 */

const TTL_MS = 60_000;
const UNSENT_HORIZON_DAYS = 62;
const g = globalThis as unknown as { __nymarkEvents?: Map<string, { at: number; events: SpondEvent[] }> };
const cache: Map<string, { at: number; events: SpondEvent[] }> = (g.__nymarkEvents ??= new Map());

async function fetching<T>(f: () => Promise<T>): Promise<T> {
  try {
    return await f();
  } catch (err) {
    if (err instanceof SpondError && err.code === "expired") redirect("/logg-ut?grunn=expired");
    throw err;
  }
}

function cached(key: string, fresh: boolean): SpondEvent[] | null {
  const now = Date.now();
  for (const [k, v] of cache) if (now - v.at > TTL_MS) cache.delete(k);
  const hit = cache.get(key);
  return !fresh && hit ? hit.events : null;
}

/** Upcoming events (sent, and not yet sent up to two months ahead) of a main group. */
export async function upcomingEvents(user: CurrentUser, groupId: string, fresh = false, now = new Date()): Promise<SpondEvent[]> {
  const key = `${user.session.sid}|${groupId}|up`;
  const hit = cached(key, fresh);
  if (hit) return hit;
  const api = spond();
  const token = user.session.token;
  const [sent, unsent] = await fetching(() =>
    Promise.all([
      api.events(token, { groupId, minEnd: now, max: 100 }),
      api
        .events(token, {
          groupId,
          minEnd: now,
          maxStart: new Date(now.getTime() + UNSENT_HORIZON_DAYS * 86_400_000),
          includeScheduled: true,
          max: 300,
        })
        // A failing list of unsent events must not hide the others.
        .catch((err: Error): RawEvent[] => {
          if (err instanceof SpondError && err.code === "expired") throw err;
          console.error("Henting av arrangementer som ikke er sendt feilet:", err.message);
          return [];
        }),
    ]),
  );
  const events = eventsForContext([...sent, ...unsent], null);
  cache.set(key, { at: Date.now(), events });
  return events;
}

/** Past events of the last `days` days, newest first. */
export async function pastEvents(user: CurrentUser, groupId: string, days: number, fresh = false, now = new Date()): Promise<SpondEvent[]> {
  const key = `${user.session.sid}|${groupId}|past|${days}`;
  const hit = cached(key, fresh);
  if (hit) return hit;
  const raw = await fetching(() =>
    spond().events(user.session.token, { groupId, minEnd: new Date(now.getTime() - days * 86_400_000), maxEnd: now, max: 200 }),
  );
  const events = eventsForContext(raw, null, true);
  cache.set(key, { at: Date.now(), events });
  return events;
}

export const forSubgroup = (events: SpondEvent[], subgroupId: string | null) =>
  subgroupId ? events.filter((e) => e.subgroupIds.includes(subgroupId)) : events;

/** One event: from the upcoming list, else from the past ~year. */
export async function findEvent(user: CurrentUser, groupId: string, eventId: string): Promise<SpondEvent | null> {
  const up = await upcomingEvents(user, groupId);
  const hit = up.find((e) => e.id === eventId);
  if (hit) return hit;
  for (const days of [60, 400]) {
    const past = await pastEvents(user, groupId, days);
    const p = past.find((e) => e.id === eventId);
    if (p) return p;
  }
  return null;
}

/**
 * For «Forrige treninger»: trainings (not matches or cancelled) of the
 * subgroup that start before this event, newest first. Includes earlier
 * upcoming trainings, so Thursday can build on Tuesday's teams.
 */
export async function trainingsBefore(user: CurrentUser, groupId: string, subgroupId: string | null, event: SpondEvent, days = 60): Promise<string[]> {
  const start = event.start;
  if (!start) return [];
  const [past, upcoming] = await Promise.all([pastEvents(user, groupId, days), upcomingEvents(user, groupId)]);
  const seen = new Set<string>([event.id]);
  return forSubgroup([...past, ...upcoming], subgroupId)
    .filter((e) => !e.match && !e.cancelled && !!e.start && e.start < start && !seen.has(e.id) && !!seen.add(e.id))
    .sort((a, b) => b.start!.localeCompare(a.start!))
    .map((e) => e.id);
}

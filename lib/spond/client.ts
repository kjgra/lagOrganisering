import "server-only";
import type { EventsQuery, RawEvent, RawGroup, RawProfile } from "./types";

/**
 * Spond's unofficial API, modelled on the Python library Olen/Spond. It may
 * change without notice, so all calls go through here. The password is only
 * sent in `login()` and is never stored or logged; nor is the token.
 */

/** Errors meant for the user (Norwegian, no secrets). */
export class SpondError extends Error {
  constructor(
    message: string,
    readonly code: "login" | "expired" | "http" | "network" = "http",
  ) {
    super(message);
    this.name = "SpondError";
  }
}

export interface SpondToken {
  token: string;
  /** ISO time the token expires, if Spond says. */
  expiration: string | null;
}

export interface SpondApi {
  login(identifier: string, password: string): Promise<SpondToken>;
  profile(token: string): Promise<RawProfile>;
  groups(token: string): Promise<RawGroup[]>;
  events(token: string, query: EventsQuery): Promise<RawEvent[]>;
}

const BASE = "https://api.spond.com/core/v1/";
const USER_AGENT = "NymarkGruppeorganisering";

function formatTime(d?: Date): string | undefined {
  return d ? d.toISOString().replace(/\.\d{3}Z$/, ".000Z") : undefined;
}

export function eventsSearchParams(q: EventsQuery): URLSearchParams {
  const p = new URLSearchParams();
  p.set("max", String(q.max ?? 100));
  p.set("scheduled", q.includeScheduled ? "true" : "false");
  const add = (k: string, v?: string) => v && p.set(k, v);
  add("groupId", q.groupId);
  add("subGroupId", q.subgroupId);
  add("minStartTimestamp", formatTime(q.minStart));
  add("maxStartTimestamp", formatTime(q.maxStart));
  add("minEndTimestamp", formatTime(q.minEnd));
  add("maxEndTimestamp", formatTime(q.maxEnd));
  return p;
}

async function send(path: string, init: RequestInit & { token?: string }): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("User-Agent", USER_AGENT);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  try {
    return await fetch(new URL(path, BASE), { ...init, headers, signal: AbortSignal.timeout(30_000), cache: "no-store" });
  } catch {
    throw new SpondError("Fikk ikke kontakt med Spond. Prøv igjen om litt.", "network");
  }
}

async function getJson<T>(path: string, token: string): Promise<T> {
  const res = await send(path, { method: "GET", token });
  if (res.status === 401) throw new SpondError("Økten i Spond er utløpt. Logg inn på nytt.", "expired");
  if (!res.ok) throw new SpondError(`Kall mot Spond feilet (HTTP ${res.status}). Prøv igjen om litt.`);
  return (await res.json()) as T;
}

export const realSpond: SpondApi = {
  async login(identifier, password) {
    // Spond takes an e-mail address or a mobile number (+4799999999) in `email`.
    const res = await send("auth2/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier, password }),
    });
    if ([400, 401, 403].includes(res.status)) {
      throw new SpondError("Feil e-post, mobilnummer eller passord. Sjekk og prøv igjen.", "login");
    }
    if (!res.ok) throw new SpondError(`Innlogging mot Spond feilet (HTTP ${res.status}). Prøv igjen om litt.`);
    const body = (await res.json()) as { accessToken?: { token?: string; expiration?: string } };
    const token = body.accessToken?.token;
    if (!token) {
      // Not the expected shape; one cause is two-factor login. Only field names are reported.
      throw new SpondError(
        `Spond svarte uten tilgangstoken (feltene var: ${Object.keys(body).join(", ")}). ` +
          "Kontoen krever kanskje ekstra verifisering (tofaktor).",
        "login",
      );
    }
    return { token, expiration: body.accessToken?.expiration ?? null };
  },
  profile: (token) => getJson<RawProfile>("profile", token),
  groups: (token) => getJson<RawGroup[]>("groups/", token),
  events: (token, q) => getJson<RawEvent[]>(`sponds/?${eventsSearchParams(q)}`, token),
};

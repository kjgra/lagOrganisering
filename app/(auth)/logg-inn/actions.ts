"use server";

import { createHash, randomUUID } from "node:crypto";
import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cacheSessionData, loadSessionData, readRights } from "@/lib/auth/current";
import { loginIdentifier, Throttle, waitText } from "@/lib/auth/login-rules";
import { writeSession } from "@/lib/auth/session";
import { runMaintenanceIfDue } from "@/lib/maintenance";
import { syncDepartedAfterLogin } from "@/lib/store/departed";
import { spond, SpondError } from "@/lib/spond";

export type LoginState =
  | { status: "idle" }
  | { status: "error"; message: string; identifier: string }
  | { status: "no_role"; firstName: string }
  | { status: "no_app"; profileId: string };

const g = globalThis as unknown as { __nymarkThrottle?: Throttle };
const throttle = (g.__nymarkThrottle ??= new Throttle());

const input = z.object({
  identifier: z.string().max(200),
  password: z.string().max(200),
});

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Logs in with Spond. The password goes to Spond once and is then dropped:
 * never stored, never logged, never sent back to the browser.
 */
export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = input.safeParse({ identifier: form.get("identifier") ?? "", password: form.get("password") ?? "" });
  const identifier = parsed.success ? parsed.data.identifier.trim() : "";
  const fail = (message: string): LoginState => ({ status: "error", message, identifier });
  if (!parsed.success || !identifier || !parsed.data.password) {
    return fail("Skriv inn både e-post eller mobilnummer og passord.");
  }
  const ident = loginIdentifier(identifier);
  if (!ident) return fail("Skriv e-postadressen eller mobilnummeret du bruker i Spond (mobilnummer med 8 siffer).");

  const h = await headers();
  const client = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "ukjent";
  const keys = { client: sha(client), ident: sha(`${ident.kind}:${ident.value}`), all: "all" };
  const wait = throttle.wait(keys);
  if (wait > 0) return fail(`For mange mislykkede innlogginger. Prøv igjen om ${waitText(wait)}.`);

  let token: string;
  let expiration: string | null;
  let data;
  try {
    ({ token, expiration } = await spond().login(ident.value, parsed.data.password));
    data = await loadSessionData(token);
  } catch (err) {
    throttle.failed(keys);
    if (err instanceof SpondError) return fail(err.message);
    console.error("Innlogging feilet:", (err as Error).message);
    return fail("Fikk ikke kontakt med Spond akkurat nå. Prøv igjen om litt.");
  }
  throttle.succeeded(keys);

  // App access: only trainers given access in the app (and admins, and the superadmin).
  const rights = await readRights(data.profile.id);
  if (!rights.app) return { status: "no_app", profileId: data.profile.id };
  if (!data.groups.length) return { status: "no_role", firstName: data.profile.firstName };

  const sid = randomUUID();
  await writeSession({ token, profileId: data.profile.id, sid }, expiration);
  cacheSessionData(sid, data);
  // Clean-up at most once a day, after the answer has been sent.
  after(() => runMaintenanceIfDue(data.profile.id));
  // Levels, tags and pairs of players who have left the group are deleted after a while.
  after(() => syncDepartedAfterLogin(data.groups));
  redirect("/");
}

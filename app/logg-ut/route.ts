import { NextResponse, type NextRequest } from "next/server";
import { forgetSessionData } from "@/lib/auth/current";
import { clearSession, readSession } from "@/lib/auth/session";

const REASONS = new Set(["expired", "no_app", "no_role", "logout"]);

/** Logs out: forgets the session (the Spond token goes with it). */
async function logout(req: NextRequest) {
  const s = await readSession();
  if (s) forgetSessionData(s.sid);
  await clearSession();
  const reason = req.nextUrl.searchParams.get("grunn") ?? "logout";
  const url = new URL("/logg-inn", req.url);
  url.searchParams.set("grunn", REASONS.has(reason) ? reason : "logout");
  return NextResponse.redirect(url, 303);
}

export const GET = logout;
export const POST = logout;

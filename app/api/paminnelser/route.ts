import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendDueReminders } from "@/lib/push";

export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Sends the reminders that are due (push after a training). Called every
 * 15 minutes by the GitHub workflow «Påminnelser» with CRON_SECRET.
 */
export async function POST(req: Request) {
  const secret = env().CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !same(auth, `Bearer ${secret}`)) return new Response("Ikke tilgang", { status: 401 });
  const r = await sendDueReminders(await db());
  return Response.json(r, { headers: { "Cache-Control": "no-store" } });
}

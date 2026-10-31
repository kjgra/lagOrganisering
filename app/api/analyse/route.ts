import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { weeklyDigest } from "@/lib/improve";
import { analyseAll } from "@/lib/observe";

export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Goes through the trainers' evaluations and computes the patterns per
 * exercise. Called each night by the GitHub workflow «Analyse av innspill»
 * with CRON_SECRET; also makes proposals for better exercises, and on
 * Monday nights tells trainers with push how many wait. The answer holds counts only.
 */
export async function POST(req: Request) {
  const secret = env().CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !same(auth, `Bearer ${secret}`)) return new Response("Ikke tilgang", { status: 401 });
  const d = await db();
  const r = await analyseAll(d);
  const groups = r.map(({ comments, observations, exercises, waiting, proposed, rolledBack }) => ({ comments, observations, exercises, proposed, rolledBack, waiting }));
  return Response.json({ groups, digests: await weeklyDigest(d) }, { headers: { "Cache-Control": "no-store" } });
}

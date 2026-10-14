import { findGroup, getCurrentUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { findEvent } from "@/lib/events-data";
import { dayLabel, timeRange } from "@/lib/format";
import { planPdf } from "@/lib/pdf/plan-pdf";
import { planGroups } from "@/lib/plan-data";
import { UserError } from "@/lib/store/access";
import { getPlan } from "@/lib/store/training";

export const maxDuration = 60;

/** The plan as a PDF. Player names come from the approved team proposal now, and are not stored. */
export async function GET(_req: Request, ctx: RouteContext<"/api/opplegg/[planId]/pdf">) {
  const cur = await getCurrentUser();
  if (!cur.ok) return new Response("Ikke innlogget", { status: 401 });
  const user = cur.user;
  const planId = Number((await ctx.params).planId);
  if (!Number.isInteger(planId) || planId <= 0) return new Response("Ugyldig opplegg", { status: 400 });
  const d = await db();
  let pl;
  try {
    pl = await getPlan(d, user.access, planId);
  } catch (err) {
    if (err instanceof UserError) return new Response(err.message, { status: 404 });
    throw err;
  }
  const group = findGroup(user, pl.groupId);
  const event = await findEvent(user, group.id, pl.eventId);
  const groups = event ? await planGroups(d, user, group, event.id) : [];
  const info = event ? [event.start ? dayLabel(event.start) : "", timeRange(event.start, event.end), event.heading] : [];
  const buf = await planPdf({
    plan: pl.plan,
    info: info.filter(Boolean),
    footer: `${pl.plan.tema || pl.plan.tittel} · Laget med Nymark – Gruppeorganisering`,
    groups,
  });
  const date = event?.start?.slice(0, 10) ?? "";
  const name = `treningsokt-${date ? `${date}-` : ""}v${pl.version}.pdf`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

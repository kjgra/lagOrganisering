import "server-only";
import webpush from "web-push";
import type { Db } from "@/lib/db";
import { vapid } from "@/lib/env";
import { ctxPath } from "@/lib/routes";
import { dueReminders, forgetPushSubscription, markReminded, type PushKeys } from "@/lib/store/reminders";

/**
 * Push messages on the trainers' phones (Web Push, VAPID). The message is
 * short and holds no names: the title of the plan and a link.
 */

export interface PushMessage {
  title: string;
  body: string;
  url: string;
}

/** Send to one device: "gone" when the push service says it is no longer there. */
async function send(s: PushKeys, m: PushMessage): Promise<"ok" | "gone" | "error"> {
  const keys = vapid();
  if (!keys) return "error";
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(m), {
      vapidDetails: { subject: keys.subject, publicKey: keys.publicKey, privateKey: keys.privateKey },
      TTL: 6 * 3600,
      urgency: "normal",
    });
    return "ok";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("Push feilet:", status ?? (err as Error).message);
    return "error";
  }
}

/** Send to some devices; forget the ones that are gone. True when at least one got it. */
export async function sendPush(d: Db, subs: PushKeys[], m: PushMessage): Promise<boolean> {
  let ok = false;
  for (const s of subs) {
    const r = await send(s, m);
    if (r === "ok") ok = true;
    if (r === "gone") await forgetPushSubscription(d, s.endpoint);
  }
  return ok;
}

export const evaluationPath = (groupId: string, eventId: string, planId: number) =>
  ctxPath(groupId, null, `/arrangementer/${encodeURIComponent(eventId)}/opplegg/${planId}/evaluering`);

/** The scheduled job: remind each trainer once per training. */
export async function sendDueReminders(d: Db, now = new Date()): Promise<{ due: number; sent: number }> {
  if (!vapid()) return { due: 0, sent: 0 };
  const due = await dueReminders(d, now);
  let sent = 0;
  for (const r of due) {
    // Marked first, so two runs at the same time never both send.
    if (!(await markReminded(d, r))) continue;
    const ok = await sendPush(d, r.subscriptions, {
      title: "Hvordan gikk økta?",
      body: `Evaluer «${r.title}» mens du husker den. Det tar et halvt minutt.`,
      url: evaluationPath(r.groupId, r.eventId, r.planId),
    });
    if (ok) sent++;
  }
  return { due: due.length, sent };
}

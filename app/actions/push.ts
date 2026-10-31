"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { vapid } from "@/lib/env";
import { sendPush } from "@/lib/push";
import { UserError } from "@/lib/store/access";
import { deletePushSubscription, myPushSubscriptions, savePushSubscription } from "@/lib/store/reminders";

/** Push on this device: a reminder to evaluate after each training. */

const subscription = z.object({
  endpoint: z.string().max(1000).startsWith("https://"),
  p256dh: z.string().min(1).max(200),
  auth: z.string().min(1).max(100),
});

export async function subscribePushAction(input: z.input<typeof subscription>): Promise<ActionResult> {
  return runAction("Varsler", async () => {
    const v = subscription.parse(input);
    if (!vapid()) throw new UserError("Varsler er ikke satt opp i dette miljøet.");
    const user = await requireUser();
    await savePushSubscription(await db(), user.access, v);
    return { data: undefined, message: "Varsler er slått på. Du får en påminnelse etter hver trening med opplegg." };
  });
}

export async function unsubscribePushAction(endpoint: string): Promise<ActionResult> {
  return runAction("Varsler", async () => {
    const v = z.string().max(1000).parse(endpoint);
    const user = await requireUser();
    await deletePushSubscription(await db(), user.access, v);
    return { data: undefined, message: "Varsler er slått av på denne enheten." };
  });
}

/** A test message to all of this trainer's devices. */
export async function testPushAction(): Promise<ActionResult> {
  return runAction("Varsler", async () => {
    const user = await requireUser();
    const d = await db();
    const subs = await myPushSubscriptions(d, user.access);
    if (!subs.length) throw new UserError("Slå på varsler først.");
    const ok = await sendPush(d, subs, { title: "Testvarsel", body: "Slik ser påminnelsen etter trening ut.", url: "/" });
    if (!ok) throw new UserError("Fikk ikke sendt varselet. Slå varsler av og på igjen.");
    return { data: undefined, message: "Testvarselet er sendt." };
  });
}

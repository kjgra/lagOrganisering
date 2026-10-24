"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { trainers } from "@/lib/admin";
import { findGroup, requireAdmin } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { maintenanceResultText, runMaintenanceNow } from "@/lib/maintenance";
import { assertSuperadmin, UserError } from "@/lib/store/access";
import { saveAiSettings } from "@/lib/store/ai";
import { confirmArchive } from "@/lib/store/archive";
import { setRole } from "@/lib/store/roles";

const sid = z.string().min(1).max(100);

async function admin(groupId: string) {
  const user = await requireAdmin();
  const group = findGroup(user, groupId);
  return { user, group, d: await db() };
}

export async function setRoleAction(groupId: string, profileId: string, role: "app" | "ai" | "admin" | "tags", granted: boolean): Promise<ActionResult> {
  return runAction("Endring av rettighet", async () => {
    const v = z.object({ groupId: sid, profileId: sid, role: z.enum(["app", "ai", "admin", "tags"]), granted: z.boolean() }).parse({ groupId, profileId, role, granted });
    const { user, group, d } = await admin(v.groupId);
    if (v.profileId === user.session.profileId && v.role !== "ai" && v.role !== "tags") throw new UserError("Du kan ikke endre din egen tilgang her.");
    await setRole(d, user.rights, user.session.profileId, v.profileId, v.role, v.granted, trainers(group).map((t) => t.profileId));
    refresh();
    return { data: undefined };
  });
}

export async function saveAiSettingsAction(input: Record<string, string>): Promise<ActionResult> {
  return runAction("Lagring av KI-innstillinger", async () => {
    const v = z.record(z.string().max(40), z.string().max(1000)).parse(input);
    const user = await requireAdmin();
    await saveAiSettings(await db(), user.rights, user.session.profileId, v);
    refresh();
    return { data: undefined, message: "KI-innstillingene er lagret." };
  });
}

export async function runMaintenanceAction(): Promise<ActionResult> {
  return runAction("Vedlikehold", async () => {
    const user = await requireAdmin();
    assertSuperadmin(user.rights);
    const r = await runMaintenanceNow(await db(), user.session.profileId, true);
    refresh();
    return { data: undefined, message: r ? maintenanceResultText(r) : "Vedlikeholdet kjører allerede." };
  });
}

export async function confirmArchiveAction(keys: string[]): Promise<ActionResult> {
  return runAction("Sletting av arkiverte opplegg", async () => {
    const v = z.array(z.string().max(220)).min(1).max(5000).parse(keys);
    const user = await requireAdmin();
    const r = await confirmArchive(await db(), user.access, user.rights, v, user.session.profileId);
    refresh();
    return { data: undefined, message: `${r.nEvents} treninger med ${r.nVersions} versjoner er slettet.` };
  });
}

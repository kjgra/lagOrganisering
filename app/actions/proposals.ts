"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { acquireLock, addComment, releaseLock, saveProposal, transition, type Action } from "@/lib/store/proposals";

const id = z.number().int().positive();

const DONE: Record<Action, string> = {
  submit: "er sendt til godkjenning",
  approve: "er godkjent",
  reject: "er avslått",
  rollback: "er rullet tilbake",
  delete: "er slettet",
};

export async function proposalAction(proposalId: number, action: Action, name: string): Promise<ActionResult> {
  return runAction("Statusendring", async () => {
    const v = z.object({ id, action: z.enum(["submit", "approve", "reject", "rollback", "delete"]) }).parse({ id: proposalId, action });
    const user = await requireUser();
    const rolled = await transition(await db(), user.access, v.id, v.action);
    refresh();
    return {
      data: undefined,
      message: `«${name}» ${DONE[v.action]}.${rolled.length ? ` «${rolled[0]}» er rullet tilbake.` : ""}`,
    };
  });
}

export async function commentAction(proposalId: number, body: string): Promise<ActionResult> {
  return runAction("Lagring av kommentar", async () => {
    const v = z.object({ id, body: z.string().max(4000) }).parse({ id: proposalId, body });
    const user = await requireUser();
    await addComment(await db(), user.access, v.id, v.body);
    refresh();
    return { data: undefined };
  });
}

const saveInput = z.object({
  groupId: z.string().max(100),
  eventId: z.string().max(100).nullable(),
  subgroupId: z.string().max(100).nullable(),
  id: z.number().int().positive().nullable(),
  name: z.string().max(200),
  labels: z.array(z.string().max(100)).min(1).max(20),
  assignments: z.record(z.string().max(100), z.string().max(100)),
  submit: z.boolean(),
});

/**
 * Save a proposal. Only members the trainer may place are kept: for an
 * event, its recipients and members of the group; for a gruppeutkast,
 * members of the main group.
 */
export async function saveProposalAction(input: z.input<typeof saveInput>): Promise<ActionResult<number>> {
  return runAction("Lagring av lagforslag", async () => {
    const v = saveInput.parse(input);
    const user = await requireUser();
    const group = user.data.groups.find((g) => g.id === v.groupId);
    const known = new Set(group?.members.map((m) => m.id) ?? []);
    const assignments = Object.fromEntries(Object.entries(v.assignments).filter(([m]) => known.has(m) || v.eventId));
    const saved = await saveProposal(await db(), user.access, { ...v, assignments });
    return { data: saved, message: `«${v.name.trim()}» er ${v.submit ? "lagret og sendt til godkjenning" : "lagret"}.` };
  });
}

const lockInput = z.object({
  groupId: z.string().max(100),
  key: z.string().regex(/^[A-Za-z0-9-]{8,80}$/),
  proposalId: z.number().int().positive().nullable(),
  eventId: z.string().max(100).nullable(),
  subgroupId: z.string().max(100).nullable(),
});

/** Takes or renews the advisory edit lock (every 30 s while the editor is open). */
export async function lockAction(input: z.input<typeof lockInput>): Promise<ActionResult> {
  return runAction("Redigeringslås", async () => {
    const v = lockInput.parse(input);
    const user = await requireUser();
    await acquireLock(await db(), user.access, v.groupId, v.key, v);
    return { data: undefined };
  });
}

export async function unlockAction(key: string): Promise<ActionResult> {
  return runAction("Frigjøring av lås", async () => {
    const user = await requireUser();
    await releaseLock(await db(), user.access, z.string().max(80).parse(key));
    return { data: undefined };
  });
}

"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { UserError } from "@/lib/store/access";
import { addPair, addTag, removePair, removeTag, setLevel } from "@/lib/store/tags";

const id = z.string().max(100);
const input = z.object({ groupId: id, memberId: id, tag: z.string().max(100) });

/** Only players get tags, and only members of a group the user has access to. */
async function checkMembers(groupId: string, ...memberIds: string[]) {
  const user = await requireUser();
  const group = user.data.groups.find((g) => g.id === groupId);
  for (const memberId of memberIds) {
    const m = group?.members.find((x) => x.id === memberId);
    if (!group || !m) throw new UserError("Fant ikke spilleren.");
    if (m.kind !== "player") throw new UserError("Bare spillere kan få tagger.");
  }
  return user;
}

export async function addTagAction(groupId: string, memberId: string, tag: string): Promise<ActionResult<string>> {
  return runAction("Lagring av tagg", async () => {
    const v = input.parse({ groupId, memberId, tag });
    const user = await checkMembers(v.groupId, v.memberId);
    const t = await addTag(await db(), user.access, user.rights, v.groupId, v.memberId, v.tag);
    refresh();
    return { data: t };
  });
}

export async function removeTagAction(groupId: string, memberId: string, tag: string): Promise<ActionResult> {
  return runAction("Sletting av tagg", async () => {
    const v = input.parse({ groupId, memberId, tag });
    const user = await checkMembers(v.groupId, v.memberId);
    await removeTag(await db(), user.access, user.rights, v.groupId, v.memberId, v.tag);
    refresh();
    return { data: undefined };
  });
}

export async function setLevelAction(groupId: string, memberId: string, level: number | null): Promise<ActionResult> {
  return runAction("Lagring av nivå", async () => {
    const v = z.object({ groupId: id, memberId: id, level: z.number().int().min(1).max(5).nullable() }).parse({ groupId, memberId, level });
    const user = await checkMembers(v.groupId, v.memberId);
    await setLevel(await db(), user.access, user.rights, v.groupId, v.memberId, v.level);
    refresh();
    return { data: undefined };
  });
}

export async function setPairAction(groupId: string, memberId: string, otherId: string, paired: boolean): Promise<ActionResult> {
  return runAction("Lagring av par", async () => {
    const v = z.object({ groupId: id, memberId: id, otherId: id, paired: z.boolean() }).parse({ groupId, memberId, otherId, paired });
    const user = await checkMembers(v.groupId, v.memberId, v.otherId);
    const d = await db();
    if (v.paired) await addPair(d, user.access, user.rights, v.groupId, v.memberId, v.otherId);
    else await removePair(d, user.access, user.rights, v.groupId, v.memberId, v.otherId);
    refresh();
    return { data: undefined };
  });
}

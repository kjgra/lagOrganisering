"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { UserError } from "@/lib/store/access";
import { addTag, removeTag } from "@/lib/store/tags";

const input = z.object({ groupId: z.string().max(100), memberId: z.string().max(100), tag: z.string().max(100) });

/** Only players get tags, and only members of a group the user has access to. */
async function checkMember(groupId: string, memberId: string) {
  const user = await requireUser();
  const group = user.data.groups.find((g) => g.id === groupId);
  const m = group?.members.find((x) => x.id === memberId);
  if (!group || !m) throw new UserError("Fant ikke spilleren.");
  if (m.kind !== "player") throw new UserError("Bare spillere kan få tagger.");
  return user;
}

export async function addTagAction(groupId: string, memberId: string, tag: string): Promise<ActionResult<string>> {
  return runAction("Lagring av tagg", async () => {
    const v = input.parse({ groupId, memberId, tag });
    const user = await checkMember(v.groupId, v.memberId);
    const t = await addTag(await db(), user.access, v.groupId, v.memberId, v.tag);
    refresh();
    return { data: t };
  });
}

export async function removeTagAction(groupId: string, memberId: string, tag: string): Promise<ActionResult> {
  return runAction("Sletting av tagg", async () => {
    const v = input.parse({ groupId, memberId, tag });
    const user = await checkMember(v.groupId, v.memberId);
    await removeTag(await db(), user.access, v.groupId, v.memberId, v.tag);
    refresh();
    return { data: undefined };
  });
}

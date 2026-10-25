"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions";
import { requireUser } from "@/lib/auth/current";
import type { BoardSettings } from "@/lib/board";
import { db } from "@/lib/db";
import { UserError } from "@/lib/store/access";
import { saveBoardSettings } from "@/lib/store/board-settings";

const input = z.object({
  groupId: z.string().max(100),
  /** '' is the main group. */
  sub: z.string().max(100),
  settings: z.object({
    mode: z.enum(["even", "levels"]),
    roles: z.array(z.string().max(100)).max(20),
    pairs: z.boolean(),
    history: z.enum(["off", "same", "rotate"]),
  }),
});

/** Saves «Fordeling» for the (sub)group, shared by its trainers. */
export async function saveBoardSettingsAction(groupId: string, sub: string, settings: BoardSettings): Promise<ActionResult<BoardSettings>> {
  return runAction("Lagring av fordeling", async () => {
    const v = input.parse({ groupId, sub, settings });
    const user = await requireUser();
    const group = user.data.groups.find((g) => g.id === v.groupId);
    if (v.sub && !group?.subgroups.some((s) => s.id === v.sub)) throw new UserError("Fant ikke undergruppen.");
    return { data: await saveBoardSettings(await db(), user.access, user.rights, v.groupId, v.sub, v.settings) };
  });
}

"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { validRef } from "@/lib/groups";
import { setFavorite } from "@/lib/store/preferences";

const input = z.object({ ref: z.string().max(200), on: z.boolean() });

/** Star or unstar a group. Returns the new list of favourites. */
export async function toggleFavorite(ref: string, on: boolean): Promise<string[]> {
  const v = input.parse({ ref, on });
  const user = await requireUser();
  const r = validRef(user.data.groups, v.ref);
  if (!r) throw new Error("Ukjent gruppe.");
  const favorites = await setFavorite(await db(), user.session.profileId, r, v.on);
  // Re-render the page with the saved list, so the optimistic star stays.
  refresh();
  return favorites;
}

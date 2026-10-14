import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { validRef } from "@/lib/groups";
import { ctxPath } from "@/lib/routes";
import { getPreferences } from "@/lib/store/preferences";

/** Opens the last used group, or the picker. One main group with one subgroup is chosen at once. */
export default async function Home() {
  const user = await requireUser();
  const prefs = await getPreferences(await db(), user.session.profileId);
  const last = validRef(user.data.groups, prefs.lastGroup);
  if (last) redirect(ctxPath(last.groupId, last.subgroupId, "/arrangementer"));
  const gs = user.data.groups;
  if (gs.length === 1 && gs[0].subgroups.length <= 1) {
    redirect(ctxPath(gs[0].id, gs[0].subgroups[0]?.id ?? null, "/arrangementer"));
  }
  redirect("/velg-gruppe");
}

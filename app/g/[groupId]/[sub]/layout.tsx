import { contextFromParams } from "@/lib/context";
import { db } from "@/lib/db";
import { rememberGroup } from "@/lib/store/preferences";

/** Every page in a group context remembers the group as the last one used. */
export default async function GroupLayout(props: LayoutProps<"/g/[groupId]/[sub]">) {
  const ctx = await contextFromParams(props.params);
  await rememberGroup(await db(), ctx.user.session.profileId, {
    groupId: ctx.group.id,
    subgroupId: ctx.subgroup?.id ?? null,
  }).catch((err: Error) => console.error("Lagring av sist brukte gruppe feilet:", err.message));
  return props.children;
}

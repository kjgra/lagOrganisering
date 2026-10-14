import { redirect } from "next/navigation";
import { contextFromParams } from "@/lib/context";

export default async function GroupHome(props: PageProps<"/g/[groupId]/[sub]">) {
  const ctx = await contextFromParams(props.params);
  redirect(ctx.path("/arrangementer"));
}

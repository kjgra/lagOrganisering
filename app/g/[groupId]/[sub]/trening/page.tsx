import { redirect } from "next/navigation";
import { contextFromParams } from "@/lib/context";

export default async function TrainingHome(props: PageProps<"/g/[groupId]/[sub]/trening">) {
  const ctx = await contextFromParams(props.params);
  redirect(ctx.path("/trening/ovelser"));
}

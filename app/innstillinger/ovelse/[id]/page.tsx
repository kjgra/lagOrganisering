import { redirect } from "next/navigation";
import { movedPath } from "@/lib/settings-nav";

/** Moved to «Trening» › Øvelser. */
export default async function MovedExercisePage(props: PageProps<"/innstillinger/ovelse/[id]">) {
  const { id } = await props.params;
  redirect(movedPath(await props.searchParams, `/trening/ovelser/${encodeURIComponent(id)}`));
}

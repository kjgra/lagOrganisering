import { redirect } from "next/navigation";
import { movedPath } from "@/lib/settings-nav";

/** Moved to «Trening» › Øvelser. */
export default async function MovedExerciseFeedbackPage(props: PageProps<"/innstillinger/ovelse/[id]/evaluering">) {
  const { id } = await props.params;
  redirect(movedPath(await props.searchParams, `/trening/ovelser/${encodeURIComponent(id)}/evaluering`));
}

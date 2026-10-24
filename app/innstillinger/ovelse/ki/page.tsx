import { redirect } from "next/navigation";
import { movedPath } from "@/lib/settings-nav";

/** Moved to «Trening» › Øvelser. */
export default async function MovedExerciseKiPage(props: PageProps<"/innstillinger/ovelse/ki">) {
  redirect(movedPath(await props.searchParams, "/trening/ovelser/ki"));
}
